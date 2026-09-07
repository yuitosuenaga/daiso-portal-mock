# Research & Design Decisions

## Summary
- **Feature**: `monthly-document-gallery`
- **Discovery Scope**: Extension（既存の`documents`/`documents-management`spec資産を強く踏襲する新規画面）
- **Key Findings**:
  - バックエンドは`backend-db-foundation`完了によりPrisma/PostgreSQL化済み。`documents-management`の要件文言はモック時代のものだが、実装は Types → Constants → Mapper(`document-mapper.ts`) → Service(`document-service.ts`) → API(`lib/api/documents.ts`、認可の関所) → Server Actions(`lib/actions/documents.ts`) → UI の層構造で確立済み。本specも同型の層構造をそのまま採用する。
  - `Document`型に`title`/`description`は必須だが、本specの要件（8.2）は年・月・ファイル・登録方式・公開範囲のみを入力項目としており、タイトル・説明・多言語翻訳データを持たない。見出しは年月から`Intl.DateTimeFormat`で動的生成できるため、`DocumentTranslation`相当のテーブルは不要。データモデルを大幅に単純化できる。
  - 既存`DocumentDetailPanel`は「編集ボタンがCard下、右上は削除ボタン」という配置で、要件6.3（プレビュー領域と同じ箇所の右上に編集ボタン）とは異なる。加えて既存はページ全体で1つの`mode` state（`useState<"view"|"edit">`）だが、本specは年月セクション単位でトグルする必要があるため、`mode` stateをセクションコンポーネント自身に持たせる設計に変える。
  - 既存Server Actionsは「zod `.parse()`の例外送出 + 呼び出し側`try/catch`で単一の汎用エラーメッセージ」という設計で、エラー種別を判別していない。本specは年月重複（要件9.1）を専用メッセージで案内する必要があるため、判別可能な独自エラークラス（`DuplicateYearMonthError`）を導入する（既存パターンからの意図的な逸脱）。
  - デモ用PDFは`prisma/seed.ts`の`SAMPLE_PDF_DATA_URL`（1ページ最小PDF、`src/lib/api/documents.ts`にも同一定数あり）をそのまま再利用できる。新規にファイルアセットを用意する必要がない。

## Research Log

### 既存レイヤ構造の踏襲可否
- **Context**: `documents-management`が確立したCRUDパターンをそのまま使えるか、独自層が必要か調査。
- **Sources Consulted**: `src/lib/actions/documents.ts`, `src/lib/api/documents.ts`, `src/lib/server/document-service.ts`, `src/lib/server/document-mapper.ts`, `src/lib/validation/document.ts`, `src/types/document.ts`
- **Findings**:
  - 認可は`lib/api/`層に集約（`requireApplicantSession`/`requireHelpdeskStaffSession`）。Service層はPrismaのみを扱い認可を持たない。
  - 公開範囲（targeting）は`targetingScope`/`targetingCountries`/`targetingCompanyCodes`の3カラムを持つ構造的部分型（`DocumentTargetingColumns`）として`mapTargeting`/`targetingToColumns`が共用されている。
  - Google共有リンクの埋め込みURL変換はサーバー側で必ず再計算（クライアント入力を信用しない）。
- **Implications**: 本specも同じ層構造・関数命名規約（`list*VisibleTo`, `*Record`, `*Action`）を踏襲し、レビュー・保守コストを下げる。

### データモデルの独立性
- **Context**: 要件のAdjacent expectationsは「データモデル・保存処理・販社マスタは本specが独立して新規に持つ」と定める。既存`Document`/`DocumentTargetingScope`等のPrisma型をそのまま参照してよいか。
- **Findings**: `documents`/`documents-management`のPrisma enum（`DocumentSourceType`, `DocumentTargetingScope`）を直接参照すると、スキーマレベルで両specが結合し、将来一方の値集合変更が他方に影響する。
- **Implications**: 本specは`MonthlyMaterialSourceType`/`MonthlyMaterialTargetingScope`を独自定義する（値集合はupload/google、all/countries/companies で同一だが、型としては独立）。一方、`DOCUMENT_COMPANY_OPTIONS`（`src/lib/constants/document-company-options.ts`）や`INQUIRY_COUNTRY_CODES`は単なる定数配列でありPrismaスキーマの結合を生まないため、要件12.3の通りそのままimportして再利用する。

### 表示/編集モード切り替えの単位
- **Context**: 要件7は年月セクション単位でのモード切り替えを求める。既存`DocumentDetailPanel`はページ単位。
- **Findings**: セクション単位でトグルするには、一覧を描画する親コンポーネント（Server Component）と、モードを保持する子コンポーネント（Client Component、年月セクション1件につき1インスタンス）に分離する必要がある。
- **Implications**: `MonthlyMaterialGallery`（Server Component、データ取得）→ `MonthlyMaterialSection`（Client Component、`useState<"view"|"edit">`を1件ごとに保持）という構成にする。

### 年月重複エラーの扱い
- **Context**: 要件9.1・13.2は、重複する年月への保存をブロックし専用メッセージを表示することを求める。既存パターンは汎用エラーメッセージのみ。
- **Findings**: Prismaの`@@unique([category, year, month])`制約により、重複時は`P2002`（一意制約違反）が送出される。
- **Implications**: Service層で`P2002`を捕捉し`DuplicateYearMonthError`（`category`/`year`/`month`を保持）に変換して再送出する。UI側の送信ハンドラは`instanceof DuplicateYearMonthError`で判別し専用メッセージを表示、それ以外は既存同様の汎用エラーメッセージにフォールバックする。

### デモ用ファイルの調達
- **Context**: ユーザー要求「デモ用のファイルを表示する」を、実ファイルアセットの追加なしに満たせるか。
- **Findings**: `prisma/seed.ts:352`の`SAMPLE_PDF_DATA_URL`（1ページの最小PDF）が既存`Document`のseedで使われており、そのまま流用可能。
- **Implications**: seedスクリプトに、売場検討会・POPそれぞれ1〜2件（例: 2026年9月分）のデモ`MonthlyMaterial`レコードを、この定数を使って追加する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 汎用カテゴリ方式（採用） | `MonthlyMaterial`1モデルに`category`列（enum: salesFloorMeeting/pop）を持たせ、ルーティングのみカテゴリ別に分離 | データモデル・Service・UIコンポーネントを完全共有でき、重複実装がない | カテゴリ追加時にenumへの値追加が必要（今回は2値固定のため許容） | 要件1.3が「互いに独立したデータとして扱う」ため、一意制約・クエリのWHERE句には必ず`category`を含める |
| カテゴリ別に別モデル | `SalesFloorMeetingMaterial`/`PopMaterial`を別々に定義 | カテゴリごとの将来的な仕様分岐に強い | 構造が完全同一なのに型・Service・UIを2重実装する必要がありDRY原則に反する | 不採用 |

## Design Decisions

### Decision: データモデルからタイトル・説明・多言語翻訳を除外する
- **Context**: `Document`型はtitle/description/翻訳データを持つが、本specの要件はそれらを入力項目として求めていない
- **Alternatives Considered**:
  1. `Document`同様にtitle/descriptionを持たせる（未入力時は既定値を自動設定）
  2. 年月のみを識別子とし、見出しはロケールに応じて動的生成する
- **Selected Approach**: 2を採用。`MonthlyMaterial`はtitle/description/翻訳テーブルを持たない
- **Rationale**: 要件8.2に忠実。年月から見出し（例:「2026年9月」）を`Intl.DateTimeFormat`で動的生成すれば、多言語対応（要件16）もUI文言のみで完結し、翻訳データの二重入力を避けられる
- **Trade-offs**: 将来「資料ごとに補足コメントを付けたい」という要望が出た場合はフィールド追加が必要になるが、現要件には存在しないため対象外とする
- **Follow-up**: なし（要件に無い機能を先回りして作らない）

### Decision: 独自エラークラスによる年月重複の判別
- **Context**: 要件9.1・13.2の専用エラーメッセージ表示
- **Alternatives Considered**:
  1. 既存同様、汎用エラーメッセージのみ表示（要件を満たさない）
  2. `DuplicateYearMonthError`を新設し、Service層でPrismaの`P2002`から変換、UI側で`instanceof`判別
- **Selected Approach**: 2
- **Rationale**: 要件を満たす最小限の逸脱で済み、他のエラーハンドリングパターン（`DocumentNotFoundError`踏襲）と一貫する
- **Trade-offs**: 既存`documents-management`のResult型を使わない例外ベース設計との整合は保てるが、UI側の`catch`ブロックに分岐が1つ増える
- **Follow-up**: なし

## Risks & Mitigations
- **Risk**: `category`列を持つ単一テーブルにすることで、片方のカテゴリの一覧取得クエリが誤って`category`条件を外し、両カテゴリのデータが混在して表示される — **Mitigation**: Service層の全関数シグネチャで`category`を必須引数にし、単体テストで「他カテゴリのレコードが混入しないこと」を明示的に検証する
- **Risk**: 年月セクションごとに`useState`を持つ設計により、多数の年月が登録された場合にクライアント側のコンポーネント数が増える — **Mitigation**: 要件2.1により降順表示のみで無限スクロール等は不要な想定のため、現実的な運用件数（月次×数年分）では性能上の問題にならない
- **Risk**: `MonthlyMaterialSourceType`/`MonthlyMaterialTargetingScope`を独自enumにしたことで、`documents`系と全く同じ値集合のコードが重複する — **Mitigation**: 値集合の重複は許容し、型の独立性（要件のAdjacent expectations）を優先する

## References
- `.kiro/specs/documents/requirements.md` — 申請者側閲覧要件（公開範囲・PDFプレビュー・Google埋め込みフォールバックの原典）
- `.kiro/specs/documents-management/requirements.md` — ヘルプデスク側管理要件（表示/編集モード切り替え・ファイル検証・Google共有リンク登録の原典）
- `.kiro/specs/helpdesk-portal-layout/requirements.md` — `HelpdeskSidebar`・`nav-items.ts`・共通`ConfirmDialog`の所有spec
- `.kiro/specs/dashboard-card-redesign/requirements.md` — トップページカード（Requirement 15 AC3を本spec完了後に上書き追記する対象）
