# 要件定義書

## Project Description (Input)
backend-db-foundation バックエンド・DB基盤の導入。決定事項: API実装はNext.js Route Handlers統合（src/app/api/）、DBアクセス・マイグレーションはPrisma、開発環境DBはDocker Compose上のPostgreSQL（DBeaverでlocalhost接続して確認可能にする）。本番環境（Cloud SQL for PostgreSQL、asia-northeast1）へそのまま拡張できる構成にする。初期スコープは問い合わせ・申請領域（inquiry-form / inquiry-list / helpdesk-inquiry-management）のモックAPIを実DB接続に置き換えること。他ドメイン（announcements, documents, faq, links）は本specの対象外で、将来別途対応する。

追加決定事項（2026-07-08）: 現状モックには認証・ログイン機能が存在しないため、本specの対象に認証機能を含める。対象は申請者側企業ユーザー（自社の問い合わせのみ閲覧可能にするための認証）とヘルプデスク担当者（全問い合わせを操作するための認証）の双方。ログイン画面・セッション管理・User/Company/HelpdeskStaffに relevantなDBスキーマ・アクセス制御（自社データのみ閲覧等）を本spec内で設計・実装する。認証方式（NextAuth.js等ライブラリ利用か自前実装か）は設計フェーズで検討する。

追加決定事項（2026-07-09）: 問い合わせ・申請領域の実DB化完了後、横断的なバックエンド化を段階的に他ドメインへ拡張する方針とし、次の対象を`announcements`（お知らせ、申請者側閲覧画面）・`announcements-management`（お知らせ管理、ヘルプデスク側画面）とする。これらは`announcements`・`announcements-management`の各specが所有する画面・UIコンポーネントを変更せず、両specが現在`MOCK_CURRENT_COMPANY`・`getGlobalMockStore`に依存しているモックAPI（`lib/api/announcements.ts`・`lib/api/announcement-tracking.ts`）の内部実装のみをPrisma経由の実DBアクセスへ置き換える。他ドメイン（documents, faq, links-page, reply-templates）は引き続き本spec範囲外とし、将来別ラウンドで対応する。

追加決定事項（2026-07-09 続き）: announcements/announcements-management完了後、次の対象を`documents`（ドキュメント、申請者側閲覧画面）・`documents-management`（ドキュメント管理、ヘルプデスク側画面）とする。両specが所有する画面・UIコンポーネントは変更せず、両specが現在`MOCK_CURRENT_COMPANY`・`getGlobalMockStore`に依存しているモックAPI（`lib/api/documents.ts`）の内部実装のみをPrisma経由の実DBアクセスへ置き換える。`Document`の公開範囲（全体公開／国単位／販社単位）判定は、announcements領域で拡張済みの申請者側セッションクレーム（`companyCode`・`country`）を再利用する（クレーム形状の追加変更は不要）。faq, links-page, reply-templatesは引き続き本spec範囲外とし、将来別ラウンドで対応する。

追加決定事項（2026-07-09 続き2）: documents/documents-management完了後、次の対象を`faq`（FAQ、申請者側・ヘルプデスク側の双方が同一内容を閲覧する画面）とする。`faq`specはヘルプデスク側の作成・編集・削除機能を対象外としており、`lib/api/faqs.ts`の`getFaqs()`は会社・ロールによるスコープ制御を一切行わない（全ロール・全社共通の参照専用データ）。既存の`FAQ_CATEGORY_CODES`・`Faq`型は変更せず、`getFaqs()`のシグネチャを維持したまま内部実装のみをPrisma経由のDBアクセスに置き換える。セッションクレームの追加変更は不要（`getFaqs()`は特定ロールのセッションを要求しない。ページレベルの認証保護は既存のMiddlewareが担う）。links-page, reply-templatesは引き続き本spec範囲外とし、将来別ラウンドで対応する。

追加決定事項（2026-07-09 続き3）: faq完了後、次の対象を`links-page`（リンク集、申請者側・ヘルプデスク側の双方が同一内容を閲覧する画面）とする。`links-page`specもFAQと同様にヘルプデスク側の作成・編集・削除機能を対象外としており、`lib/api/links.ts`の`getLinks()`は会社・ロールによるスコープ制御を一切行わない（全ロール・全社共通の参照専用データ）。既存の`LINK_CATEGORY_CODES`・`Link`型は変更せず、`getLinks()`のシグネチャを維持したまま内部実装のみをPrisma経由のDBアクセスに置き換える。セッションクレームの追加変更は不要。reply-templatesは引き続き本spec範囲外とし、将来別ラウンドで対応する。

追加決定事項（2026-07-09 続き4）: links-page完了後、次の対象を`reply-templates`（ヘルプデスク担当者の返信テンプレート、`helpdesk-inquiry-management`specが依存）とする。`reply-templates`はヘルプデスク側限定の機能（申請者側からの参照・操作は無い）であり、`ReplyTemplate.category`は既存の`Inquiry`カテゴリ（`InquiryCategory`Enum）を再利用する。`lib/api/reply-templates.ts`の既存エクスポート関数（`getReplyTemplates`・`getReplyTemplatesByCategory`・`getReplyTemplateById`・`createReplyTemplate`・`updateReplyTemplate`。既存モックに削除機能は無い）のシグネチャを維持したまま内部実装のみをPrisma経由のDBアクセスに置き換える。ヘルプデスク側限定機能のため、announcements/documents領域で確立したパターンに合わせ`requireHelpdeskStaffSession()`による検証を内部実装に追加する。本ラウンドの完了により、backend-db-foundation specが対象とする全ドメイン（inquiry, announcements, documents, faq, links-page, reply-templates）の実DB化が完了する。

追加決定事項（2026-07-13）: 申請者側ログイン画面（`/[locale]/login`）とヘルプデスク側ログイン画面（`/[locale]/helpdesk/login`）の間で、ログイン前のユーザーが誤ってアクセスした場合にもう一方のログイン画面へ遷移できるよう、相互リンクを追加する。認証・DBスキーマ・セッション仕様への変更は無く、ログイン画面のUI（`LoginForm`コンポーネント）への追加のみを対象とする。

## はじめに

本specは、フェーズ1でモックAPI・固定値（`MOCK_CURRENT_COMPANY`・`MOCK_CURRENT_STAFF_NAME`・`getGlobalMockStore`によるインメモリストア）に依存していたヘルプデスクポータルに、開発環境で実際に動作するバックエンド（Next.js Route Handlers）とDB（PostgreSQL、Prisma管理）を導入するための基盤仕様です。あわせて、これまで存在しなかった認証・ログイン機能（申請者側企業ユーザー、ヘルプデスク担当者）を導入し、問い合わせ・申請領域（`inquiry-form`・`inquiry-list`・`helpdesk-inquiry-management`）のデータを実際にDBへ永続化・スコープ制御できるようにします。開発環境ではDocker Compose上のPostgreSQLをDBeaverで直接確認できるようにし、将来の本番環境（Cloud SQL for PostgreSQL）へ接続先を切り替えるだけで移行できる拡張性を持たせます。

## スコープ境界

- **対象**:
  - 開発環境のDB基盤（Docker Compose上のPostgreSQL、DBeaverからの接続確認）
  - Prismaによるスキーマ定義・マイグレーション管理
  - Next.js Route Handlers（`src/app/api/`）によるAPI層の追加
  - 認証・ログイン機能（申請者側企業ユーザー、ヘルプデスク担当者）、セッション管理、ポータル全体のルート保護（未ログイン時のログイン画面へのリダイレクト）
  - 問い合わせ・申請領域（`Company`・`ApplicantUser`・`HelpdeskStaff`・`Inquiry`・添付ファイル・対応履歴に相当するDBスキーマ）の実DB化
  - 既存のモックAPI関数（`lib/api/inquiries.ts`等）のシグネチャ（引数・戻り値の型）を維持したまま、内部実装をDBアクセスに置き換えること
  - 本番環境（Cloud SQL for PostgreSQL）への接続切り替えを環境変数のみで行える構成
- **お知らせ領域（2026-07-09追加）**:
  - `Announcement`（お知らせ本体：タイトル・本文・種別・公開日・対応要否・配信対象）に相当するDBスキーマの追加
  - お知らせの確認済み・実施済み・リマインド送信状況を追跡する担当者マスタ（`AnnouncementRecipient`）・状況（`AnnouncementRecipientStatus`）に相当するDBスキーマの追加
  - `lib/api/announcements.ts`・`lib/api/announcement-tracking.ts`の既存エクスポート関数の内部実装をPrisma経由のDBアクセスに置き換えること（`announcements.ts`側のシグネチャは維持する。`announcement-tracking.ts`側は本spec内で必要最小限の見直しを許容する）
  - 申請者側のお知らせ閲覧における配信対象フィルタ（自社の国が対象国に含まれるか）を、ログイン中の申請者セッションが所属する`Company`の国情報を用いて行うこと（`MOCK_CURRENT_COMPANY`への依存を除去する）
- **ドキュメント領域（2026-07-09追加）**:
  - `Document`（ドキュメント本体：タイトル・補足説明・ファイル名・ファイル種別・ファイルサイズ・PDFデータ・アップロード日・公開範囲）に相当するDBスキーマの追加
  - `lib/api/documents.ts`の既存エクスポート関数（`getDocuments`・`getDocumentById`・`getAllDocuments`・`getDocumentByIdForHelpdesk`・`createDocument`・`updateDocument`・`deleteDocument`）のシグネチャを維持したまま、内部実装をPrisma経由のDBアクセスに置き換えること
  - 申請者側のドキュメント閲覧における公開範囲フィルタ（全体公開／自社の国が対象国に含まれる／自社が対象販社に含まれる）を、ログイン中の申請者セッションが所属する`Company`の国・会社コード情報を用いて行うこと（`MOCK_CURRENT_COMPANY`への依存を除去する）。セッションクレームは`announcements`領域で追加済みの`companyCode`・`country`を再利用し、追加のクレーム変更は行わない
- **FAQ領域（2026-07-09追加）**:
  - FAQ（`Faq`：種別・質問・回答）に相当するDBスキーマの追加
  - `lib/api/faqs.ts`の既存エクスポート関数（`getFaqs`）のシグネチャを維持したまま、内部実装をPrisma経由のDBアクセスに置き換えること
  - `getFaqs()`は会社・ロールによるスコープ制御を行わない（全ロール・全社共通の参照専用データという既存の振る舞いを維持する）
- **リンク集領域（2026-07-09追加）**:
  - リンク（`Link`：タイトル・URL・種別・補足説明）に相当するDBスキーマの追加
  - `lib/api/links.ts`の既存エクスポート関数（`getLinks`）のシグネチャを維持したまま、内部実装をPrisma経由のDBアクセスに置き換えること
  - `getLinks()`は会社・ロールによるスコープ制御を行わない（全ロール・全社共通の参照専用データという既存の振る舞いを維持する）
- **返信テンプレート領域（2026-07-09追加）**:
  - 返信テンプレート（`ReplyTemplate`：カテゴリ・テンプレート名・本文）に相当するDBスキーマの追加。`category`は既存の`InquiryCategory`Enumを再利用する
  - `lib/api/reply-templates.ts`の既存エクスポート関数（`getReplyTemplates`・`getReplyTemplatesByCategory`・`getReplyTemplateById`・`createReplyTemplate`・`updateReplyTemplate`）のシグネチャを維持したまま、内部実装をPrisma経由のDBアクセスに置き換えること
  - `reply-templates`はヘルプデスク側限定機能のため、全関数の呼び出し前にヘルプデスク側セッションを検証すること
- **ログイン画面間の相互リンク（2026-07-13追加）**:
  - 申請者側ログイン画面（`/[locale]/login`）・ヘルプデスク側ログイン画面（`/[locale]/helpdesk/login`）の`LoginForm`コンポーネントへ、もう一方のログイン画面へ遷移するリンクを追加すること
- **対象外**:
  - 自由記述の翻訳処理（Google Cloud Translation API連携）
  - 添付ファイルの実ファイルストレージ・CDN化（本specでは添付ファイルの実体はDBにデータとして保持する。外部ストレージ連携は将来対応）
  - 本番環境（Cloud SQL）への実際のプロビジョニング・デプロイ作業の実行（構成として拡張可能にすることのみが対象。実際の本番構築は別途）
  - パスワードリセット・ユーザー登録（サインアップ）画面（本specでは初期データとしてDBに投入したアカウントでのログインのみを対象とする）
  - お知らせの確認・実施を行う担当者（`AnnouncementRecipient`）に、実際のログイン機能を持たせること（引き続き閲覧・追跡専用のモック担当者マスタとしてDBに保持する）
- **隣接仕様との境界**: `announcements`・`announcements-management`・`documents`・`documents-management`・`faq`・`links-page`・`reply-templates`（`helpdesk-inquiry-management`spec所有）ドメインのUIコンポーネント・Server Actions自体（見た目・操作性）は変更しない。

## 要件

### 要件 1: 開発環境DB基盤（Docker Compose + PostgreSQL）

**目的:** 開発者として、コマンド一つでローカルにPostgreSQLを起動し、DBeaverで内容を確認したい。そうすることで、環境差異なく開発・デバッグを行える。

#### 受け入れ基準

1. The プロジェクト shall リポジトリに Docker Compose 定義ファイルを含み、単一コマンドでPostgreSQLコンテナを起動できるようにする。
2. The プロジェクト shall PostgreSQLコンテナの接続情報（ホスト・ポート・DB名・ユーザー・パスワード）を環境変数ファイル（`.env`等）で管理し、リポジトリには実際の秘密値を含めない。
3. When 開発者がDockerコンテナ起動後にDBeaverでコンテナの公開ポートへ接続したとき、the PostgreSQLコンテナ shall 接続を受け付け、マイグレーション済みのテーブル構造を表示する。
4. The プロジェクト shall コンテナ再起動後もデータが失われないよう、PostgreSQLのデータをDockerボリュームに永続化する。

---

### 要件 2: Prismaによるスキーマ管理・マイグレーション

**目的:** 開発者として、DBスキーマの変更をコードとして管理し、チーム間・開発環境間で一貫させたい。そうすることで、手動でのスキーマ変更によるずれを防げる。

#### 受け入れ基準

1. The プロジェクト shall Prisma Schema（`schema.prisma`）にDBスキーマを定義し、Prisma Migrateでマイグレーション履歴をリポジトリ管理する。
2. When 開発者がマイグレーションコマンドを実行したとき、the プロジェクト shall ローカルのPostgreSQLコンテナに対してスキーマを適用する。
3. The プロジェクト shall Prisma Clientを通じてのみDBへアクセスし、Route Handlers・Server Actionsから直接SQLを記述しない構成を基本とする。
4. The プロジェクト shall 開発環境で初期動作確認用のシードデータ（会社・ユーザー・問い合わせ等のサンプル）を投入するシードスクリプトを提供する。

---

### 要件 3: データモデル（会社・ユーザー・問い合わせ）

**目的:** ヘルプデスク担当者として、どの会社のどのユーザーがどの問い合わせを出したかをDB上で一貫して追跡したい。そうすることで、自社スコープの絞り込みや対応履歴の管理を正確に行える。

#### 受け入れ基準

1. The プロジェクト shall 会社（`Company`）を表すテーブルを持ち、既存モックの`companyName`・`country`・`companyCode`に相当する項目を保持する。
2. The プロジェクト shall 申請者側企業ユーザー（`ApplicantUser`）を表すテーブルを持ち、`Company`に対して多対一の関連を持つ。
3. The プロジェクト shall ヘルプデスク担当者（`HelpdeskStaff`）を表すテーブルを持つ。
4. The プロジェクト shall 問い合わせ・申請（`Inquiry`）を表すテーブルを持ち、既存の`Inquiry`型（`category`・`urgency`・`storeRegion`・`originalText`・`originalLanguage`・`translatedText`・`status`・`createdAt`・対応中フラグ）に相当する項目、および送信元の`ApplicantUser`（またはCompany）への関連を保持する。
5. The プロジェクト shall 添付ファイル（`InquiryAttachment`）を表すテーブルを持ち、`Inquiry`に対して1対多の関連を持つ。
6. The プロジェクト shall 対応履歴（`InquiryHistoryEntry`、対応中フラグ設定・解除・ステータス変更・返信・申請者メッセージ）を表すテーブルを持ち、`Inquiry`に対して1対多の関連を持つ。
7. The プロジェクト shall 既存の型定義（`src/types/inquiry.ts`・`inquiry-history.ts`・`attachment.ts`）とDBスキーマの項目が対応する構造を維持する。

---

### 要件 4: 申請者側企業ユーザーの認証

**目的:** 販社担当者として、自分の会社のアカウントでログインし、自社の問い合わせのみを確認したい。そうすることで、他社の問い合わせ内容が見えてしまう心配なく利用できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 申請者側のログイン画面を提供し、メールアドレス（またはID）とパスワードでの認証を受け付ける。
2. When 申請者側ユーザーが有効な認証情報でログインしたとき、the ヘルプデスクポータル shall ログイン済みセッションを確立し、ダッシュボード画面へ遷移する。
3. If 無効な認証情報でログインが試行されたとき、the ヘルプデスクポータル shall エラーメッセージを表示し、ログイン画面に留まる。
4. While 申請者側ユーザーがログイン済みのとき、the ヘルプデスクポータル shall そのユーザーが所属する`Company`を問い合わせのスコープ判定に使用する。
5. The ヘルプデスクポータル shall 申請者側ユーザーがログアウトできる操作を提供する。

---

### 要件 5: ヘルプデスク担当者の認証

**目的:** ヘルプデスク担当者として、自分のアカウントでログインし、担当者名で対応中フラグ・対応履歴に記録されるようにしたい。そうすることで、誰が対応したかを正確に追跡できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall ヘルプデスク担当者向けのログイン画面を提供し、メールアドレス（またはID）とパスワードでの認証を受け付ける。
2. When ヘルプデスク担当者が有効な認証情報でログインしたとき、the ヘルプデスクポータル shall ログイン済みセッションを確立し、ヘルプデスク側のダッシュボード画面へ遷移する。
3. If 無効な認証情報でログインが試行されたとき、the ヘルプデスクポータル shall エラーメッセージを表示し、ログイン画面に留まる。
4. While ヘルプデスク担当者がログイン済みのとき、the ヘルプデスクポータル shall 対応中フラグの設定・対応履歴の記録にそのユーザーの氏名を使用する。
5. The ヘルプデスクポータル shall ヘルプデスク担当者がログアウトできる操作を提供する。

---

### 要件 6: セッション管理とルート保護

**目的:** 開発者として、未ログインユーザーが問い合わせデータにアクセスできないようにしたい。そうすることで、データの機密性を保てる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall ログイン済みセッションをサーバー側で検証可能な形式（例: セッションクッキー）で保持する。
2. If 未ログインのユーザーが申請者側の保護された画面（ダッシュボード・問い合わせフォーム・問い合わせ一覧等）へアクセスしたとき、the ヘルプデスクポータル shall 申請者側ログイン画面へリダイレクトする。
3. If 未ログインのユーザーがヘルプデスク側の保護された画面へアクセスしたとき、the ヘルプデスクポータル shall ヘルプデスク側ログイン画面へリダイレクトする。
4. The ヘルプデスクポータル shall 申請者側セッションとヘルプデスク側セッションを区別し、一方の認証情報で他方の保護画面へアクセスできないようにする。
5. While セッションが有効期限切れまたは無効なとき、the ヘルプデスクポータル shall 該当ユーザーを再度ログイン画面へ遷移させる。

---

### 要件 7: 問い合わせ・申請APIのDB化

**目的:** 開発者として、フェーズ1のモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、呼び出し側のコンポーネント・Server Actionsの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/app/api/`にNext.js Route Handlersとして問い合わせの作成・一覧取得・詳細取得・対応中フラグ設定・ステータス更新・対応履歴追加のエンドポイントを実装する。
2. The プロジェクト shall `src/lib/api/inquiries.ts`の既存のエクスポート関数（`createInquiry`・`getInquiries`・`getAllInquiries`・`getInquiryById`・`setInquiryClaim`・`updateInquiryStatus`等）の引数・戻り値の型を変更せず、内部実装をRoute Handlers経由のDBアクセスに置き換える。
3. When 申請者側ユーザーが問い合わせ・申請フォームを送信したとき、the プロジェクト shall 送信内容とログイン中ユーザーの`Company`情報をDBの`Inquiry`テーブルへ永続化する。
4. When 申請者側ユーザーが自社の問い合わせ一覧を取得したとき、the プロジェクト shall ログイン中ユーザーが所属する`Company`に紐づく`Inquiry`のみをDBから取得する。
5. When ヘルプデスク担当者が全社の問い合わせ一覧を取得したとき、the プロジェクト shall 会社によるスコープ制限なく全ての`Inquiry`をDBから取得する。
6. When ヘルプデスク担当者が対応中フラグを設定・解除したとき、the プロジェクト shall ログイン中の担当者氏名でDBの`Inquiry`・対応履歴を更新する。
7. When ヘルプデスク担当者が問い合わせのステータスを変更したとき、the プロジェクト shall DBの`Inquiry`のステータスを更新し、対応履歴に記録する。
8. The プロジェクト shall 添付ファイルの内容をDBへ保存し、詳細画面表示時にDBから復元する。

---

### 要件 8: 本番環境への拡張性

**目的:** 開発者として、開発環境で構築した基盤を将来の本番環境（Cloud SQL for PostgreSQL）へそのまま拡張したい。そうすることで、フェーズ3移行時に基盤を作り直す必要がなくなる。

#### 受け入れ基準

1. The プロジェクト shall DB接続情報を環境変数（接続文字列）経由で切り替え可能にし、コード変更なしに開発環境用PostgreSQLと本番環境用Cloud SQL for PostgreSQLを切り替えられる構成にする。
2. The プロジェクト shall Prismaのマイグレーションが開発環境・本番環境の両方に同一の手順で適用できる構成にする。
3. The プロジェクト shall 本番環境相当の設定（SSL接続等、Cloud SQL接続に必要な設定）を環境変数で有効化できるようにし、開発環境ではこれらを無効化した状態で動作する。

---

### 要件 9: 既存フロントエンドとの互換性

**目的:** 開発者として、本spec導入後も既存のUIコンポーネント・テストが壊れないようにしたい。そうすることで、フロントエンド側の再修正コストを最小化できる。

#### 受け入れ基準

1. The プロジェクト shall 本spec導入後も、`inquiry-form`・`inquiry-list`・`helpdesk-inquiry-management`の既存UIコンポーネントを変更せずに動作させる。
2. The プロジェクト shall 既存の`vitest`テストスイートが、モックAPIへの依存部分をテスト用DB接続（またはテスト用モック）に置き換えた上で成功する状態を維持する。
3. Where ログイン前提の画面遷移が既存のE2E的な確認手順と異なる場合、the プロジェクト shall ログイン手順を含めた最新の確認手順を`README.md`または関連ドキュメントに反映する。

---

### 追加ラウンド（2026-07-09）: announcements / announcements-management の実DB化

問い合わせ・申請領域の実DB化完了を受け、次の対象を`announcements`（お知らせ、申請者側閲覧画面）・`announcements-management`（お知らせ管理、ヘルプデスク側画面）とする。両画面specの`requirements.md`（UI・振る舞いの契約）は変更せず、本spec側でDBスキーマ・サービス層・既存モックAPI関数の内部実装のみを差し替える。

### 要件 10: お知らせデータモデル

**目的:** 開発者として、お知らせ本体と配信対象をDB上で一貫して管理したい。そうすることで、申請者側の配信対象フィルタとヘルプデスク側の管理操作を同一のデータソースで実現できる。

#### 受け入れ基準

1. The プロジェクト shall お知らせ（`Announcement`）を表すテーブルを持ち、既存の`Announcement`型（`title`・`body`・`category`・`publishedAt`・`actionRequired`）に相当する項目を保持する。
2. The プロジェクト shall お知らせの配信対象（`targeting`）を、「全体一律」または「1件以上の国・地域」を表現できる構造でDB上に保持する。
3. The プロジェクト shall 既存の`Announcement`型・`AnnouncementTargeting`型とDBスキーマの項目が対応する構造を維持する。

---

### 要件 11: お知らせ確認・実施・リマインド追跡のデータモデル

**目的:** ヘルプデスク担当者として、お知らせごとの確認済み・実施済み・リマインド送信状況を担当者単位でDB上に保持したい。そうすることで、周知の浸透状況を正確に追跡できる。

#### 受け入れ基準

1. The プロジェクト shall お知らせの確認・対応状況を追跡する対象となる担当者マスタ（`AnnouncementRecipient`）を表すテーブルを持ち、`Company`に対して多対一の関連を持つ。
2. The プロジェクト shall `AnnouncementRecipient`に実際のログイン機能（`ApplicantUser`との統合）を持たせず、引き続き閲覧・追跡専用のマスタとしてDBに保持する。
3. The プロジェクト shall お知らせ×担当者ごとの確認済み・実施済み・リマインド送信状態（`AnnouncementRecipientStatus`）を表すテーブルを持ち、`Announcement`・`AnnouncementRecipient`の組に対して一意な関連を持つ。
4. The プロジェクト shall `confirmedAt`・`completedAt`の値を初期投入（シード）によってのみ設定し、アプリケーションからの更新経路は設けない（既読・実施管理は本spec・隣接specの対象外という既存の決定を維持する）。
5. When ヘルプデスク担当者がリマインドを送信したとき、the プロジェクト shall 対象の`AnnouncementRecipientStatus`の`reminderSentAt`をDBへ永続化する。

---

### 要件 12: お知らせ・お知らせ管理APIのDB化

**目的:** 開発者として、`announcements`・`announcements-management`両specのモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、両specが所有する画面・UIコンポーネントの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/lib/api/announcements.ts`の既存のエクスポート関数（`getRecentAnnouncements`・`getAnnouncements`・`getAnnouncementById`・`getAllAnnouncements`・`getAnnouncementByIdForHelpdesk`・`createAnnouncement`・`updateAnnouncement`・`deleteAnnouncement`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
2. The プロジェクト shall `src/lib/api/announcement-tracking.ts`の既存のエクスポート関数（`getAnnouncementRecipientStatuses`・`getAnnouncementTrackingSummary`・`isReminderPendingForCompany`・`sendAnnouncementReminders`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
3. When 申請者側ユーザーがお知らせ一覧・詳細を取得したとき、the プロジェクト shall ログイン中ユーザーが所属する`Company`の国が配信対象に含まれるお知らせ、または配信対象が全体一律のお知らせのみをDBから取得する。
4. When ヘルプデスク担当者がお知らせの一覧・詳細を取得したとき、the プロジェクト shall 配信対象によるスコープ制限なく全ての`Announcement`をDBから取得する。
5. When ヘルプデスク担当者がお知らせを作成・編集・削除・リマインド送信したとき、the プロジェクト shall 当該操作の前にヘルプデスク側セッションを検証し、未ログインの場合は操作を拒否する。

---

### 要件 13: 申請者側セッションの会社情報拡張

**目的:** 開発者として、申請者側セッションから所属会社の国コード・会社コードを取得したい。そうすることで、お知らせの配信対象フィルタ・リマインド受信判定を`MOCK_CURRENT_COMPANY`に依存せず実現できる。

#### 受け入れ基準

1. The プロジェクト shall 申請者側セッションのクレームに、所属`Company`の`country`（国コード）・`companyCode`を含める。
2. The プロジェクト shall 既存の`companyId`・`companyName`クレームの意味・形式を変更しない。
3. The プロジェクト shall お知らせ一覧・詳細・リマインド受信表示（`AnnouncementList`・`AnnouncementDetail`・`ReminderAnnouncementsPanel`）における`MOCK_CURRENT_COMPANY`への依存を除去し、申請者側セッションのクレームを使用する。

---

### 追加要望（2026-07-09）: お知らせ・お知らせ管理領域の実DB化

問い合わせ・申請領域に続き、`announcements`spec（申請者側のお知らせ一覧・詳細閲覧）・`announcements-management`spec（ヘルプデスク側のお知らせ作成・編集・削除、配信対象指定、対応要否設定、確認済み・実施済み人数の可視化、未対応者へのリマインド送信）が対象とする画面群を実DB化する。両specの既存のUIコンポーネント・Server Actions・画面の見た目・操作性は変更せず、データアクセス層（`lib/api/announcements.ts`・`lib/api/announcement-tracking.ts`）の内部実装のみをPrisma経由のDBアクセスに置き換える。

### 要件 10: お知らせデータモデル

**目的:** 開発者として、お知らせの内容・配信対象・対応要否をDB上で一貫して管理したい。そうすることで、申請者側の閲覧・ヘルプデスク側の管理の両方から同じデータを参照できる。

#### 受け入れ基準

1. The プロジェクト shall お知らせ（`Announcement`）を表すテーブルを持ち、既存の`Announcement`型（`title`・`body`・`category`・`publishedAt`・`actionRequired`・`targeting`）に相当する項目を保持する。
2. The プロジェクト shall `targeting`（配信対象。全体一律または特定の国・地域1件以上）に相当する項目を保持し、既存の`AnnouncementTargeting`型（`{ scope: "all" }` または `{ scope: "countries"; countries: string[] }`）と相互変換できる構造にする。
3. The プロジェクト shall お知らせの確認・対応状況を追跡する担当者マスタ（`AnnouncementRecipient`）を表すテーブルを持ち、既存の`Company`との関連（所属会社）を持たせる。
4. The プロジェクト shall お知らせ×担当者ごとの確認済み・実施済み・リマインド送信状態（`AnnouncementRecipientStatus`）を表すテーブルを持ち、`Announcement`・`AnnouncementRecipient`の双方に対して関連を持つ。
5. The プロジェクト shall 既存の型定義（`src/types/announcement.ts`・`announcement-recipient.ts`）とDBスキーマの項目が対応する構造を維持する。

---

### 要件 11: お知らせ閲覧・管理APIのDB化

**目的:** 開発者として、フェーズ1のモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、呼び出し側のコンポーネント・Server Actionsの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/lib/api/announcements.ts`の既存のエクスポート関数（`getRecentAnnouncements`・`getAnnouncements`・`getAnnouncementById`・`getAllAnnouncements`・`getAnnouncementByIdForHelpdesk`・`createAnnouncement`・`updateAnnouncement`・`deleteAnnouncement`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
2. When 申請者側ユーザーがお知らせ一覧・詳細を取得したとき、the プロジェクト shall ログイン中ユーザーが所属する`Company`の国が配信対象に含まれるお知らせ（または配信対象が全体一律のお知らせ）のみをDBから取得する。
3. When ヘルプデスク担当者がお知らせの一覧・詳細を取得したとき、the プロジェクト shall 配信対象による絞り込みなく全てのお知らせをDBから取得する。
4. When ヘルプデスク担当者がお知らせを新規作成・編集・削除したとき、the プロジェクト shall DBの`Announcement`テーブルへ変更内容を永続化する。
5. The プロジェクト shall `src/lib/api/announcement-tracking.ts`の既存のエクスポート関数（`getAnnouncementRecipientStatuses`・`getAnnouncementTrackingSummary`・`sendAnnouncementReminders`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
6. The プロジェクト shall 自社宛のリマインド受信有無を判定する関数（`isReminderPendingForCompany`）について、ログイン中の申請者セッションから会社情報を解決できるようにし、呼び出し元が固定値（`MOCK_CURRENT_COMPANY`）を明示的に渡す必要がない構造に見直すことを許容する。
7. When ヘルプデスク担当者が未対応の担当者へリマインドを送信したとき、the プロジェクト shall 対象担当者の`AnnouncementRecipientStatus`にリマインド送信時刻をDBへ永続化する。

---

### 要件 12: お知らせ領域における既存フロントエンドとの互換性

**目的:** 開発者として、お知らせ領域の実DB化後も既存のUIコンポーネント・テストが壊れないようにしたい。そうすることで、フロントエンド側の再修正コストを最小化できる。

#### 受け入れ基準

1. The プロジェクト shall 本要件追加後も、`announcements`・`announcements-management`の既存UIコンポーネント・画面の見た目・操作性を変更せずに動作させる。
2. The プロジェクト shall 既存の`vitest`テストスイートが、モックAPIへの依存部分をテスト用DB接続（またはテスト用モック）に置き換えた上で成功する状態を維持する。

---

### 追加ラウンド（2026-07-09）: documents / documents-management の実DB化

お知らせ・お知らせ管理領域の実DB化完了を受け、次の対象を`documents`（ドキュメント、申請者側閲覧画面）・`documents-management`（ドキュメント管理、ヘルプデスク側画面）とする。両画面specの`requirements.md`（UI・振る舞いの契約）は変更せず、本spec側でDBスキーマ・サービス層・既存モックAPI関数の内部実装のみを差し替える。

### 要件 13: ドキュメントデータモデル

**目的:** 開発者として、ドキュメント本体と公開範囲をDB上で一貫して管理したい。そうすることで、申請者側の公開範囲フィルタとヘルプデスク側の管理操作を同一のデータソースで実現できる。

#### 受け入れ基準

1. The プロジェクト shall ドキュメント（`Document`）を表すテーブルを持ち、既存の`Document`型（`title`・`description`・`fileName`・`fileType`・`fileSize`・`dataUrl`・`uploadedAt`）に相当する項目を保持する。
2. The プロジェクト shall ドキュメントの公開範囲（`targeting`）を、「全体公開」「1件以上の国・地域」「1件以上の販社」のいずれかを表現できる構造でDB上に保持する。
3. The プロジェクト shall 既存の`Document`型・`DocumentTargeting`型とDBスキーマの項目が対応する構造を維持する。

---

### 要件 14: ドキュメント閲覧・管理APIのDB化

**目的:** 開発者として、`documents`・`documents-management`両specのモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、両specが所有する画面・UIコンポーネントの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/lib/api/documents.ts`の既存のエクスポート関数（`getDocuments`・`getDocumentById`・`getAllDocuments`・`getDocumentByIdForHelpdesk`・`createDocument`・`updateDocument`・`deleteDocument`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
2. When 申請者側ユーザーがドキュメント一覧・詳細を取得したとき、the プロジェクト shall 公開範囲が「全体公開」、またはログイン中ユーザーが所属する`Company`の国・会社コードが公開範囲に含まれるドキュメントのみをDBから取得する。
3. When ヘルプデスク担当者がドキュメントの一覧・詳細を取得したとき、the プロジェクト shall 公開範囲による絞り込みなく全てのドキュメントをDBから取得する。
4. When ヘルプデスク担当者がドキュメントを新規アップロード・編集・削除したとき、the プロジェクト shall 当該操作の前にヘルプデスク側セッションを検証し、未ログインの場合は操作を拒否する。
5. The プロジェクト shall ドキュメントの公開範囲フィルタに、`announcements`領域で拡張済みの申請者側セッションクレーム（`companyCode`・`country`）を再利用し、セッションクレームの追加変更を行わない。

---

### 要件 15: ドキュメント領域における既存フロントエンドとの互換性

**目的:** 開発者として、ドキュメント領域の実DB化後も既存のUIコンポーネント・テストが壊れないようにしたい。そうすることで、フロントエンド側の再修正コストを最小化できる。

#### 受け入れ基準

1. The プロジェクト shall 本要件追加後も、`documents`・`documents-management`の既存UIコンポーネント・画面の見た目・操作性を変更せずに動作させる。
2. The プロジェクト shall 既存の`vitest`テストスイートが、モックAPIへの依存部分をテスト用DB接続（またはテスト用モック）に置き換えた上で成功する状態を維持する。

---

### 追加ラウンド（2026-07-09）: faq の実DB化

documents・documents-management領域の実DB化完了を受け、次の対象を`faq`（FAQ、申請者側・ヘルプデスク側の双方が同一内容を閲覧する画面）とする。`faq`spec自体の`requirements.md`（UI・振る舞いの契約）は変更せず、本spec側でDBスキーマ・サービス層・既存モックAPI関数の内部実装のみを差し替える。`faq`specはヘルプデスク側の作成・編集・削除機能を明示的に対象外としているため、本ラウンドでもCRUD機能の追加は行わない（既存の参照専用の振る舞いをDBバックエンドで再現するのみ）。

### 要件 16: FAQデータモデル

**目的:** 開発者として、FAQをDB上で一貫して管理したい。そうすることで、申請者側・ヘルプデスク側の両画面が同一のデータソースを参照できる。

#### 受け入れ基準

1. The プロジェクト shall FAQ（`Faq`）を表すテーブルを持ち、既存の`Faq`型（`category`・`question`・`answer`）に相当する項目を保持する。
2. The プロジェクト shall 既存の`Faq`型とDBスキーマの項目が対応する構造を維持する。

---

### 要件 17: FAQ閲覧APIのDB化

**目的:** 開発者として、`faq`specのモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、`faq`specが所有する画面・UIコンポーネントの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/lib/api/faqs.ts`の既存のエクスポート関数（`getFaqs`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
2. The プロジェクト shall `getFaqs()`について、会社・ロールによるスコープ制御を行わず、全てのFAQをDBから取得する（申請者側・ヘルプデスク側で同一の結果を返す既存の振る舞いを維持する）。
3. The プロジェクト shall `getFaqs()`の呼び出しにあたり、申請者側セッション・ヘルプデスク側セッションのいずれかのロールを要求する追加のセッション検証を行わない（ページレベルの未ログインアクセス制御は既存のMiddlewareが担う）。

---

### 要件 18: FAQ領域における既存フロントエンドとの互換性

**目的:** 開発者として、FAQ領域の実DB化後も既存のUIコンポーネント・テストが壊れないようにしたい。そうすることで、フロントエンド側の再修正コストを最小化できる。

#### 受け入れ基準

1. The プロジェクト shall 本要件追加後も、`faq`の既存UIコンポーネント・画面（申請者側・ヘルプデスク側の両方）の見た目・操作性を変更せずに動作させる。
2. The プロジェクト shall 既存の`vitest`テストスイートが、モックAPIへの依存部分をテスト用DB接続（またはテスト用モック）に置き換えた上で成功する状態を維持する。

---

### 追加ラウンド（2026-07-09）: links-page の実DB化

faq領域の実DB化完了を受け、次の対象を`links-page`（リンク集、申請者側・ヘルプデスク側の双方が同一内容を閲覧する画面）とする。`links-page`spec自体の`requirements.md`（UI・振る舞いの契約）は変更せず、本spec側でDBスキーマ・サービス層・既存モックAPI関数の内部実装のみを差し替える。`links-page`specはヘルプデスク側の作成・編集・削除機能を明示的に対象外としているため、本ラウンドでもCRUD機能の追加は行わない。

### 要件 19: リンク集データモデル

**目的:** 開発者として、リンクをDB上で一貫して管理したい。そうすることで、申請者側・ヘルプデスク側の両画面が同一のデータソースを参照できる。

#### 受け入れ基準

1. The プロジェクト shall リンク（`Link`）を表すテーブルを持ち、既存の`Link`型（`title`・`url`・`category`・`description`）に相当する項目を保持する。
2. The プロジェクト shall 既存の`Link`型とDBスキーマの項目が対応する構造を維持する。

---

### 要件 20: リンク集閲覧APIのDB化

**目的:** 開発者として、`links-page`specのモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、`links-page`specが所有する画面・UIコンポーネントの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/lib/api/links.ts`の既存のエクスポート関数（`getLinks`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
2. The プロジェクト shall `getLinks()`について、会社・ロールによるスコープ制御を行わず、全てのリンクをDBから取得する（申請者側・ヘルプデスク側で同一の結果を返す既存の振る舞いを維持する）。
3. The プロジェクト shall `getLinks()`の呼び出しにあたり、申請者側セッション・ヘルプデスク側セッションのいずれかのロールを要求する追加のセッション検証を行わない（ページレベルの未ログインアクセス制御は既存のMiddlewareが担う）。

---

### 要件 21: リンク集領域における既存フロントエンドとの互換性

**目的:** 開発者として、リンク集領域の実DB化後も既存のUIコンポーネント・テストが壊れないようにしたい。そうすることで、フロントエンド側の再修正コストを最小化できる。

#### 受け入れ基準

1. The プロジェクト shall 本要件追加後も、`links-page`の既存UIコンポーネント・画面（申請者側・ヘルプデスク側の両方）の見た目・操作性を変更せずに動作させる。
2. The プロジェクト shall 既存の`vitest`テストスイートが、モックAPIへの依存部分をテスト用DB接続（またはテスト用モック）に置き換えた上で成功する状態を維持する。

---

### 追加ラウンド（2026-07-09）: reply-templates の実DB化

links-page領域の実DB化完了を受け、次の対象を`reply-templates`（ヘルプデスク担当者の返信テンプレート、`helpdesk-inquiry-management`spec所有）とする。同specの`requirements.md`（UI・振る舞いの契約）は変更せず、本spec側でDBスキーマ・サービス層・既存モックAPI関数の内部実装のみを差し替える。この完了により、backend-db-foundation specが対象とする全ドメインの実DB化が完了する。

### 要件 22: 返信テンプレートデータモデル

**目的:** 開発者として、返信テンプレートをDB上で一貫して管理したい。そうすることで、問い合わせ対応画面・テンプレート管理画面が同一のデータソースを参照できる。

#### 受け入れ基準

1. The プロジェクト shall 返信テンプレート（`ReplyTemplate`）を表すテーブルを持ち、既存の`ReplyTemplate`型（`category`・`name`・`body`）に相当する項目を保持する。
2. The プロジェクト shall `ReplyTemplate.category`について、既存の`Inquiry`のカテゴリ（`InquiryCategory`）と同一のEnumを再利用する。
3. The プロジェクト shall 既存の`ReplyTemplate`型とDBスキーマの項目が対応する構造を維持する。

---

### 要件 23: 返信テンプレートAPIのDB化

**目的:** 開発者として、`helpdesk-inquiry-management`specのモックAPI関数をシグネチャを保ったままDBアクセスに置き換えたい。そうすることで、同specが所有する画面・UIコンポーネントの実装を変更せずに済む。

#### 受け入れ基準

1. The プロジェクト shall `src/lib/api/reply-templates.ts`の既存のエクスポート関数（`getReplyTemplates`・`getReplyTemplatesByCategory`・`getReplyTemplateById`・`createReplyTemplate`・`updateReplyTemplate`）の引数・戻り値の型を変更せず、内部実装をDBアクセスに置き換える。
2. When ヘルプデスク担当者がテンプレートを取得・作成・編集したとき、the プロジェクト shall 当該操作の前にヘルプデスク側セッションを検証し、未ログインの場合は操作を拒否する。

---

### 要件 24: 返信テンプレート領域における既存フロントエンドとの互換性

**目的:** 開発者として、返信テンプレート領域の実DB化後も既存のUIコンポーネント・テストが壊れないようにしたい。そうすることで、フロントエンド側の再修正コストを最小化できる。

#### 受け入れ基準

1. The プロジェクト shall 本要件追加後も、問い合わせ対応画面のテンプレート返信機能・テンプレート管理画面の既存UIコンポーネント・見た目・操作性を変更せずに動作させる。
2. The プロジェクト shall 既存の`vitest`テストスイートが、モックAPIへの依存部分をテスト用DB接続（またはテスト用モック）に置き換えた上で成功する状態を維持する。

---

### 追加ラウンド（2026-07-10）: mainブランチとの画面構成差分の統合（お知らせの公開期間・対応期限フィールド）

`spec/backend-db-foundation`ブランチが共通祖先から分岐して以降、`main`ブランチ側で独立してUI機能追加（お知らせの公開期間・対応期限フィールド追加、ドキュメント詳細のインライン表示統合、ダッシュボードのパネル再配置等）が進んでいた。ユーザーからの「基本的な画面構成はmainの状態を引き継ぎたい」という指示を受け、`main`を本ブランチへマージし、UI側の変更が要求する新しいデータ項目をDBスキーマ側にも反映する。

調査の結果、DBスキーマ変更が必要なのは`Announcement`（お知らせ）ドメインのみであることを確認した（ドキュメント・ダッシュボード関連の変更はデータ形状の変更を伴わない、UI・表示ロジックのみの変更のため対象外）。

### 要件 25: お知らせの公開期間・対応期限フィールド

**目的:** ヘルプデスク担当者として、お知らせの表示を特定の期間に限定したり、対応が必要なお知らせに期限を設定したりしたい。そうすることで、時限性のある告知や対応期限のある依頼を適切に管理できる。

#### 受け入れ基準

1. The プロジェクト shall `Announcement`に、公開期間の開始日（`publishStartDate`）・終了日（`publishEndDate`）・対応期限（`dueDate`）を表す、いずれも省略可能な日付のみ（時刻・タイムゾーンを持たない）の項目を追加する。
2. When 申請者側セッションが`getRecentAnnouncements`・`getAnnouncements`・`getAnnouncementById`を呼び出したとき、the プロジェクト shall 自社への配信対象条件に加えて、現在時刻が公開期間（`publishStartDate`以降・`publishEndDate`以前）に含まれるお知らせのみを結果に含める。公開開始日・終了日がいずれも未設定の場合は常時公開として扱う。
3. When ヘルプデスク側セッションが`getAllAnnouncements`・`getAnnouncementByIdForHelpdesk`を呼び出したとき、the プロジェクト shall 公開期間による絞り込みを行わず、全てのお知らせを結果に含める。
4. The プロジェクト shall お知らせの新規作成・更新（`createAnnouncement`・`updateAnnouncement`）において、`publishStartDate`・`publishEndDate`・`dueDate`の入力値をそのまま保存する。

---

### 要件 26: 公開期間・対応期限を含む既存フロントエンド・シードデータとの互換性

**目的:** 開発者として、公開期間・対応期限フィールドの追加後も既存のUIコンポーネント・シードデータ・テストが`main`ブランチの内容と整合した状態を維持したい。

#### 受け入れ基準

1. The プロジェクト shall `main`ブランチの`src/types/announcement.ts`・`src/lib/validation/announcement.ts`が定義する型・zodスキーマ（`publishStartDate`/`publishEndDate`/`dueDate`の入出力契約、終了日が開始日以降であることの検証、対応要否が真の場合の対応期限必須検証）をそのまま採用する。
2. The プロジェクト shall シードデータ（`prisma/seed.ts`・`prisma/seed.sql`）に、`main`ブランチのモックデータと同一の公開期間・対応期限の値を既存5件のお知らせへ設定し、公開期間フィルタの動作確認用データ（`seed-announcement-006`、公開開始日が未来に設定された6件目のお知らせ）を追加する。

---

## 追加ラウンド（2026-07-13）: ログイン画面間の相互リンク

### 要件 27: ログイン画面間の相互リンク

**目的:** 販社担当者・ヘルプデスク担当者として、自分がアクセスすべきでないログイン画面に迷い込んだ場合に、もう一方のログイン画面へ簡単に遷移したい。そうすることで、URLを直接編集することなく正しいログイン画面に到達できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 申請者側ログイン画面（`/[locale]/login`）に、ヘルプデスク側ログイン画面（`/[locale]/helpdesk/login`）へ遷移するリンクを表示する。
2. The ヘルプデスクポータル shall ヘルプデスク側ログイン画面（`/[locale]/helpdesk/login`）に、申請者側ログイン画面（`/[locale]/login`）へ遷移するリンクを表示する。
3. When ユーザーがログイン画面間の相互リンクを操作したとき、the ヘルプデスクポータル shall 現在選択中の言語ロケールを維持したまま遷移先のログイン画面を表示する。
4. The ヘルプデスクポータル shall 既存のポータル切り替えリンク（`Header.tsx`の`switchToHelpdesk`・`HelpdeskHeader.tsx`の`switchToApplicant`）と一貫した文言・スタイルでログイン画面間の相互リンクを表示する。
3. The プロジェクト shall 既存の`vitest`テストスイートに、公開期間フィルタ（開始日未到来・終了日超過・両方未設定の場合の表示可否、ヘルプデスク側は絞り込みを行わないこと）を検証するテストケースを追加した上で成功する状態を維持する。
