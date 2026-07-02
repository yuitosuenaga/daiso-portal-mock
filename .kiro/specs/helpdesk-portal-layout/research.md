# Research & Design Decisions

## Summary
- **Feature**: `helpdesk-portal-layout`
- **Discovery Scope**: Extension（既存Next.js App Routerアプリの拡張）
- **Key Findings**:
  - 現状の`src/app/[locale]/layout.tsx`は、配下の全ページを無条件に単一の`AppShell`（申請者側ヘッダー・サイドバー）でラップしている。このままヘルプデスク側のページを`[locale]`配下に追加すると、ヘルプデスク側ページにも申請者側シェルが二重に適用されてしまう。
  - `getInquiries()`は関数コメント上「自社の問い合わせ全件」を返す想定だが、実際のモックデータ（`MOCK_INQUIRIES`）は8社・8か国分が無差別に含まれており、「自社」スコープの絞り込みが一切行われていない。また`getInquiryStatusSummary()`はモックデータと連動しない固定値（`{new:3, in_progress:7, resolved:42}`）を返しており、これも実際のデータと矛盾する。
  - `next-intl`のルーティング（`src/i18n/routing.ts`・`src/i18n/navigation.ts`）はロケールプレフィックスのみを扱う設計であり、`[locale]`配下に新しいパスセグメント（`/helpdesk`）やルートグループ（`(applicant)`）を追加すること自体には変更が不要。
  - 現行コードベースには認証・セッション・ログインユーザーという概念が一切存在しない（問い合わせフォームの会社名はユーザーが都度自由入力する項目であり、固定の「自社」は保持されていない）。

## Research Log

### 既存レイアウト構造の拡張方法
- **Context**: ヘルプデスク側専用のヘッダー・サイドバーを、既存の申請者側画面に影響を与えずに追加する方法を検討する必要があった。
- **Sources Consulted**: `src/app/[locale]/layout.tsx`、`src/components/layout/AppShell.tsx`、Next.js App Routerのルートグループ（Route Groups）機能。
- **Findings**: Next.js App Routerでは、`(groupName)`という括弧付きディレクトリ（ルートグループ）を使うとURLパスに影響を与えずにレイアウトを分岐できる。既存の申請者側ページ（`page.tsx`, `inquiry/`, `announcements/`, `links/`, `faq/`）を`[locale]/(applicant)/`配下に移動しても、ルートグループはURLセグメントとして現れないため既存URL（`/`, `/inquiry`など）は変化しない。
- **Implications**: `[locale]/layout.tsx`からは`AppShell`を取り除きi18nプロバイダのみを残し、`(applicant)/layout.tsx`（新規）で`AppShell`を、`helpdesk/layout.tsx`（新規）で新設の`HelpdeskAppShell`をそれぞれ適用する構成にする。

### モックAPIの自社スコープ検証
- **Context**: 申請者側の問い合わせ一覧・詳細・ダッシュボードが参照するデータを「自社のみ」に絞り込む実現方法を検討した。
- **Sources Consulted**: `src/lib/api/inquiries.ts`、`src/types/inquiry.ts`、`src/components/features/inquiry-form/ApplicantInfoSection.tsx`。
- **Findings**: 問い合わせ送信フォームは会社名（`companyName`）をユーザーの自由入力として受け取っており、システム側に固定の「ログイン中の自社」という状態は存在しない。フェーズ1は認証未実装のため、実運用のログイン概念を模倣する何らかの固定値が必要。
- **Implications**: `lib/api/inquiries.ts`内に固定のモック会社定数（`MOCK_CURRENT_COMPANY`）を1つ定義し、`getInquiries()`・`getInquiryStatusSummary()`はこの定数に一致する`submittedBy.companyName`のデータのみを対象にする。新規`getAllInquiries()`は絞り込みを行わず全件を返す。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. ルートグループによる分離（採用） | `[locale]/(applicant)/`と`[locale]/helpdesk/`をファイルシステムレベルで分離し、それぞれ専用の`layout.tsx`でシェルを適用する | URL不変、実行時分岐ロジックが不要、Next.js標準パターンで既存コードへの影響が局所化される | 既存ページファイルの物理的な移動が必要 | design-principlesの「No Hidden Shared Ownership」に合致 |
| B. 単一レイアウト内でのパス分岐 | `[locale]/layout.tsx`内で`usePathname()`等により`/helpdesk`か否かを判定しシェルを出し分ける | ファイル移動が不要 | 共有レイアウトファイルに分岐ロジックが集中し、申請者側の意図しない挙動変化を招くリスクが高い。責務境界が曖昧になる | 却下 |

## Design Decisions

### Decision: ルートグループによる申請者側・ヘルプデスク側の分離
- **Context**: 既存の申請者側ページを壊さずにヘルプデスク側の独立したレイアウトを追加する必要がある
- **Alternatives Considered**:
  1. 単一レイアウト内でのパス分岐（Option B）
  2. ルートグループによるファイルシステムレベルの分離（Option A）
- **Selected Approach**: Option A。`[locale]/(applicant)/`ルートグループに既存ページを移動し、`[locale]/helpdesk/`に新規セグメントを追加。それぞれ専用の`layout.tsx`でシェルを適用する
- **Rationale**: URLを変えずに実装でき、Next.js標準機能のみで完結し、申請者側の既存レンダリングパスに分岐ロジックを持ち込まない
- **Trade-offs**: 既存ページファイルの移動という機械的な変更が発生するが、内容の変更は伴わないためリスクは低い
- **Follow-up**: 移動後に`npm run build`・既存テストで申請者側URLと表示が変化していないことを確認する

### Decision: 自社データのスコープ方法
- **Context**: フェーズ1に認証がない状態で「自社のみ」のデータ絞り込みをどう表現するか
- **Alternatives Considered**:
  1. `getInquiries()`にパラメータを追加してスコープを指定できるようにする
  2. 固定のモック会社定数を1つ定義し、既存関数はその会社に絞り込み、別関数で全件を提供する
- **Selected Approach**: 2。`MOCK_CURRENT_COMPANY`定数を`lib/api/inquiries.ts`に定義し、`getInquiries()`・`getInquiryStatusSummary()`をこの定数でフィルタし、新規`getAllInquiries()`が全件を返す
- **Rationale**: 要件9.3が既存`getInquiries`の型シグネチャ変更を禁止しているため、パラメータ追加は不可。関数分離であれば既存の型契約を維持できる
- **Trade-offs**: 将来の実APIでは認証情報から自社を特定する形に置き換わるため、`MOCK_CURRENT_COMPANY`はフェーズ1限定の暫定実装であることを明示する必要がある
- **Follow-up**: フェーズ3のバックエンド実装時に`MOCK_CURRENT_COMPANY`参照箇所を認証済みユーザーの会社情報に置き換える

## Risks & Mitigations
- 既存ページファイルの移動時にimportパスやテストのモジュール解決が壊れる — 移動は内容変更を伴わない機械的なファイル移動に限定し、移動直後に`npm run lint`/`npm run typecheck`/`npm run build`および既存テストを実行して検証する
- 「自社」に選定した1社のみだと問い合わせ件数が少なく、一覧・ダッシュボードのデモ表示が寂しくなる — 実装時に選定会社向けのモックデータを1〜2件追加し、最低限の一覧感を確保する
- ヘルプデスク側ヘッダー・サイドバーが申請者側と重複コードになる — フェーズ1の規模では許容し、後続spec（ヘルプデスク問い合わせ管理）でヘルプデスク側ナビゲーション項目が増えた時点で共通化を再検討する

## References
- 既存実装: `src/app/[locale]/layout.tsx`, `src/components/layout/AppShell.tsx`, `src/lib/api/inquiries.ts`
