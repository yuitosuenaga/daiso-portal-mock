# 研究・設計判断ログ

## Summary
- **Feature**: `backend-db-foundation`
- **Discovery Scope**: Complex Integration（既存フロントエンド・モック実装への統合を伴う新規バックエンド・DB・認証基盤の導入）
- **Key Findings**:
  - Auth.js（NextAuth）v5はNext.js 14 App Routerで安定動作し、`auth()`という単一関数でServer Component・Route Handler・Middlewareから同一のセッション検証を行える。Credentials Providerを使う場合はJWTセッション戦略が必須（DBセッションテーブル不要）で、Middleware（Edge runtime）との相性が良い。
  - Cloud Run + Cloud SQL for PostgreSQLの接続は、Unix socket（`/cloudsql/INSTANCE_CONNECTION_NAME`）経由が標準パターン。開発環境（TCP接続のDocker PostgreSQL）と本番環境（Unix socket経由のCloud SQL）を`DATABASE_URL`の値の違いのみで切り替えられ、Prismaクライアント自体のコード変更は不要。
  - 既存コードには`InquiryForm.tsx`という1箇所のみ、モックAPI関数（`createInquiry`）をクライアントコンポーネントから直接呼び出している箇所がある。Prisma Clientはサーバー専用（Node.js API依存）のため、この関数をDBアクセス実装に置き換えるとクライアントバンドルに混入し、ビルドが破綻する。既存UIコンポーネントを変更しない方針（要件9.1）とは、呼び出し経路（1行のimport元）の変更までは除外しない前提で対応する。

## Research Log

### Auth.js (NextAuth) v5 と Credentials Provider
- **Context**: 申請者側・ヘルプデスク側という2種類のログイン主体を1つのNext.jsアプリでどう扱うか。
- **Sources Consulted**: https://authjs.dev/reference/nextjs 、 https://authjs.dev/getting-started/migrating-to-v5 、 https://next-auth.js.org/providers/credentials
- **Findings**:
  - Credentials Providerは`id`を指定して複数インスタンスを併存させられる（例: `applicant-credentials`・`helpdesk-credentials`）。
  - Credentials Providerを使う場合、セッション戦略は`jwt`固定（`database`戦略は不可）。JWTはCookieに暗号化保存され、DBのセッションテーブルは不要。
  - `auth()`はServer Component・Route Handler・Middleware・Server Actionのいずれからも同一の呼び出しでセッションを取得できる。
- **Implications**: 2つのCredentials Providerを1つの`authOptions`（`auth.ts`）に登録し、`authorize()`内でそれぞれ`ApplicantUser`・`HelpdeskStaff`テーブルを個別に照会する。JWTのカスタムクレームに`role`（`"applicant" | "helpdesk"`）と、申請者側は`companyId`を格納し、Middleware・Route Handler・Server Actionでの認可判定に使う。

### Cloud SQL for PostgreSQLへの接続とPrisma
- **Context**: 開発環境（Docker Compose上のPostgreSQL）から本番環境（Cloud SQL for PostgreSQL、Cloud Run稼働）へコード変更なしで拡張できる構成にする必要がある（要件8）。
- **Sources Consulted**: https://cloud.google.com/sql/docs/postgres/connect-run
- **Findings**:
  - Cloud RunからCloud SQLへの接続はパブリックインターネットを経由せず、Cloud Run側に組み込まれたCloud SQL Auth Proxyが`/cloudsql/INSTANCE_CONNECTION_NAME`にUnixソケットをマウントする。
  - アプリケーション側はTCPホスト・ポートではなく、このUnixソケットパスを接続文字列に指定するだけでよく、アプリケーションコードの変更は不要。
  - パスワード等の秘匿情報はSecret Manager経由での注入が推奨される。
- **Implications**: Prismaの`datasource db`は`env("DATABASE_URL")`のみを参照する構成とし、開発環境では`postgresql://user:pass@localhost:5432/db`、本番環境（将来）では`postgresql://user:pass@localhost/db?host=/cloudsql/INSTANCE_CONNECTION_NAME`形式に差し替えるだけで動作する。本specでは実際のCloud SQLプロビジョニングは行わず、この切り替えが可能な構成であることの確認までを対象とする。

### 既存フロントエンドとのバンドル安全性
- **Context**: 要件9.1（既存UIコンポーネントを変更せず動作させる）と、Prisma Clientがサーバー専用である制約の整合性を確認する。
- **Sources Consulted**: 既存コードベース（`Grep`によるコールサイト調査: `src/components/features/inquiry-form/InquiryForm.tsx`、`src/lib/api/inquiries.ts`、`src/lib/actions/*.ts`）
- **Findings**:
  - `src/lib/api/inquiries.ts`の関数群は、`src/lib/actions/*.ts`（Server Action、`"use server"`）と`InquiryForm.tsx`（Client Component、`"use client"`）の両方から呼び出されている。
  - `createInquiry`のみがClient Componentから直接呼ばれている。他の関数（`getInquiries`・`getAllInquiries`・`getInquiryById`・`setInquiryClaim`・`updateInquiryStatus`等）はServer Action・Server Component経由のみで、サーバー実行コンテキストに限定される。
  - Next.jsは、Client Componentが（直接・間接に）サーバー専用モジュール（Prisma Client等）をimportするモジュールをimportすると、クライアントバンドル生成時にビルドエラーとなる。
- **Implications**: `src/lib/api/inquiries.ts`をサーバー専用モジュール（`import "server-only"`相当）として確定させ、Prisma直呼び出しに一本化する。`InquiryForm.tsx`の呼び出し先のみを、新設のServer Action（`src/lib/actions/inquiry.ts`に追加する`createInquiryAction`）に差し替える。フォームの見た目・入力項目・操作性は一切変更しない。差分は1つのimport文と呼び出し先関数名のみ。

### 既存の「自社」スコープ判定ロジック
- **Context**: 現在`getInquiries()`は`inquiry.submittedBy.companyName`という自由入力文字列を、固定モック定数`MOCK_CURRENT_COMPANY.companyName`と文字列比較して自社分を絞り込んでいる。認証導入後にどう置き換えるかを確認する。
- **Sources Consulted**: `src/lib/api/inquiries.ts`、`src/lib/constants/current-company.ts`、`src/components/features/inquiry-form/InquiryForm.tsx`
- **Findings**:
  - `submittedBy.companyName`・`submittedBy.country`はフォーム入力値であり、正規化されたリレーションではない。
  - `MOCK_CURRENT_COMPANY`は`announcements`・`documents`ドメインからも参照されており、本specのスコープ外である以上、この定数自体の実装は変更できない。
- **Implications**: `Inquiry`テーブルに、フォーム入力値（表示用、既存の`submittedBy.companyName`・`submittedBy.country`として維持）とは独立した`companyId`（ログイン中`ApplicantUser`が所属する`Company`への外部キー）を持たせ、自社スコープ判定は`companyId`の一致で行う。これにより文字列比較よりも堅牢になり、`MOCK_CURRENT_COMPANY`定数にも一切依存しない。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Next.js Route Handlers + サーバー専用サービス層（採用） | `src/app/api/`にHTTP APIを持ちつつ、Server Component/Server Action向けの内部呼び出しはサービス層を直接呼ぶ | 既存のimport経路を維持できる、HTTP自己呼び出しの往復コストがない、将来の外部クライアント向けにHTTP契約も提供できる | サービス層とRoute Handlerで認可チェックのロジックを重複させないよう明示的に共通化する必要がある | ユーザー決定（Next.js Route Handlers統合）と既存コードの制約（クライアントバンドル安全性）の両方を満たす |
| 全アクセスをRoute Handler経由のfetchに統一 | Server ComponentからもHTTP fetchで自社のRoute Handlerを呼ぶ | 経路が一本化されシンプル | Server ComponentからのRoute Handler呼び出しは絶対URL解決が必要で複雑、往復コストが増える、既存のServer Actionパターンと不整合 | 不採用 |
| 別建てバックエンドサービス（Node.js/FastAPI） | フロントエンドと分離したAPIサーバー | 将来のスケール・分離に有利 | ユーザー決定で明示的に不採用（Next.js Route Handlers統合を選択） | 不採用 |

## Design Decisions

### Decision: 認証ライブラリにAuth.js (NextAuth) v5を採用
- **Context**: 申請者側・ヘルプデスク側の2種類のログイン、セッション管理、Middlewareでのルート保護が必要。
- **Alternatives Considered**:
  1. Auth.js (NextAuth) v5 — Next.js公式に近い位置づけのライブラリ、Credentials Provider対応
  2. 自前実装（`iron-session`等でCookie＋JWT手動実装）
- **Selected Approach**: Auth.js v5のCredentials Providerを2つ（`applicant-credentials`・`helpdesk-credentials`）併用し、JWTセッション戦略を使う。
- **Rationale**: Middleware・Server Action・Route Handlerすべてで同一の`auth()`関数を使えるため実装の一貫性が高く、セッションの暗号化・Cookie管理・CSRF対策等を自前実装するリスクを避けられる。
- **Trade-offs**: ライブラリの内部仕様（v5のAPI）に依存する。JWT戦略のため、発行済みトークンの即時失効（強制ログアウト）はセッション有効期限短縮等の運用でカバーする。
- **Follow-up**: 実装時にJWTの有効期限（例: 8時間）を確定する。

### Decision: `companyId`を`Inquiry`の正規化された外部キーとして追加
- **Context**: 既存の自社スコープ判定は自由入力文字列の比較に依存しており、認証導入後の堅牢な絞り込みには不十分。
- **Alternatives Considered**:
  1. `submittedBy.companyName`文字列比較を維持
  2. `Inquiry.companyId`（`Company`への外部キー）を追加し、これで絞り込む
- **Selected Approach**: 2を採用。`submittedBy.companyName`・`submittedBy.country`は表示用フィールドとしてそのまま保持する。
- **Rationale**: ログイン中ユーザーの所属会社を唯一の真実源とすることで、フォームの自由入力値に依存しないアクセス制御を実現できる。
- **Trade-offs**: `Inquiry`型自体は変更しない（フロントエンド互換性維持）が、DBスキーマ・作成時のサーバー側ロジックには`companyId`の付与が必要になる。
- **Follow-up**: なし。

### Decision: `InquiryForm.tsx`の呼び出し先をServer Actionに変更
- **Context**: Prisma Clientはサーバー専用であり、Client Componentから直接importされるモジュールに含めるとビルドが破綻する。
- **Alternatives Considered**:
  1. `lib/api/inquiries.ts`を分割せず、`createInquiry`をRoute Handlerへのfetch呼び出しにする
  2. `InquiryForm.tsx`の呼び出し先を新設のServer Actionに変更する
- **Selected Approach**: 2を採用。`src/lib/actions/inquiry.ts`に`createInquiryAction`を追加し、`InquiryForm.tsx`のimport・呼び出し箇所のみ変更する。
- **Rationale**: Server Actionは既存の`sendApplicantMessageAction`と同じパターンであり、フォームの見た目・操作性に影響を与えず、追加の絶対URL解決の複雑さを避けられる。
- **Trade-offs**: 要件9.1の「既存UIコンポーネントを変更しない」を、ファイル単位のゼロ差分ではなく「見た目・操作性を変更しない」という意図で解釈する。design.mdのBoundary Commitmentsに明記する。
- **Follow-up**: なし。

## Risks & Mitigations
- JWTセッションの即時失効が難しい — 有効期限を短めに設定し、ログアウト時にはCookie削除も行う。
- パスワードハッシュ方式の選定ミスによるDocker/Cloud Run上のネイティブビルド失敗 — `bcryptjs`（純JS実装）を採用し、ネイティブ依存を避ける。
- 既存vitestテストが認証・DBアクセス前提の変更で壊れる — Prisma ClientとAuth.jsの`auth()`をテストでモックし、実DBに依存しない単体テストを維持する。
- Middlewareでのロケール処理（next-intl）と認証チェックの統合ミスでリダイレクトループが発生する — ログイン画面のパスをMiddlewareのマッチャー対象から除外し、ロケール検出後にパス判定する設計にする。

## References
- [Auth.js Nextjs Integration](https://authjs.dev/reference/nextjs) — `auth()`の統一利用パターン
- [Auth.js Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5) — v5の設定一元化
- [NextAuth.js Credentials Provider](https://next-auth.js.org/providers/credentials) — 複数Credentials Provider・JWT戦略の制約
- [Connect from Cloud Run | Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres/connect-run) — Unixソケット経由の接続パターン
