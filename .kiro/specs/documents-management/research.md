# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design。

**Usage**:
- Log research activities and outcomes during the discovery phase。
- Document design decision trade-offs that are too detailed for `design.md`。
- Provide references and evidence for future audits or reuse。
---

## Summary
- **Feature**: `documents-management`（追加要望 2026-07-16: Googleドキュメント/スプレッドシートの共有リンクによる登録）
- **Discovery Scope**: Extension（既存のPDFアップロード方式に、登録方式の選択肢を追加する軽量な拡張）
- **Key Findings**:
  - Googleドキュメント/スプレッドシート/スライドは、いずれも`https://docs.google.com/{document|spreadsheets|presentation}/d/{FILE_ID}/preview`という共通のURLパターンでiframe埋め込みプレビューが可能であり、対象ファイルの共有設定を「リンクを知っている全員（閲覧者）」にするだけで動作する（「ウェブに公開」までは不要）。3種別で共通パターンを使えるため、種別ごとに異なる埋め込みクエリパラメータを持つ設計は不要。
  - 埋め込みプレビューはGoogle側のファイル共有設定に完全に依存し、ポータル側の公開範囲（`targeting`）による制御はGoogle側のアクセス制御には一切影響しない。この非対称性はSecurity Considerationsに明記する。
  - 新規の外部ライブラリ・SDK・OAuth連携は不要（純粋なURL文字列変換のみ）。Google Drive APIとの連携は本要望のスコープ外（要件13.11）。

## Research Log

### GoogleドキュメントのURLパターンと埋め込み方式
- **Context**: ヘルプデスク担当者が入力する共有リンクURLから、iframe埋め込み用のURLへどう変換するかを確定する必要があった。
- **Sources Consulted**:
  - [Google Drive File Link Formats: Docs, Sheets, and Slides URL Patterns](https://automationace.com/blog/google-drive-file-link-formats-docs-sheets-slides)
  - [Make Google Docs, Sheets, Slides & Forms public - Google Docs Editors Help](https://support.google.com/docs/answer/183965?hl=en)
  - [Configure a Google Doc/Sheet/Form/Slides to Allow IFraming – Thinkific](https://support.thinkific.com/hc/en-us/articles/360030376674-Configure-a-Google-Doc-a-Google-Sheet-a-Google-Form-and-Google-Slides-to-Allow-IFraming)
- **Findings**:
  - 通常の共有リンクは `https://docs.google.com/document/d/{FILE_ID}/edit?usp=sharing` のような形式。ここから`{FILE_ID}`を抽出し、`/preview`（または`/preview?embedded=true`）に置き換えることでiframe埋め込み可能なプレビューURLが得られる。
  - Docs・Sheets・Slidesのいずれも`/preview`パスで動作することを確認（Slidesは`/embed?start=false&loop=false&delayms=3000`という埋め込み専用パスも存在するが、自動再生等の追加機能であり必須ではない）。
  - iframe埋め込みを機能させるための必須条件は、ファイルの共有設定を「リンクを知っている全員（閲覧者）」にすること。この設定はポータル側からは検証・強制できない。
- **Implications**: 種別（document/spreadsheets/presentation）ごとに`/preview`で統一したURL変換ロジックを1つの純粋関数として実装できる。共有設定の不備はポータル側で検知できないため、UIヘルプテキストで運用上の注意を促す設計とする。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 判別可能ユニオン型で`Document`を`sourceType`分岐（採用） | `DocumentTargeting`と同じ判別可能ユニオン型パターンを`sourceType: "upload" \| "google"`に適用し、フィールドの存在を型レベルで保証する | 既存パターンと一貫性、`any`を使わず型安全にフィールドの有無を表現できる | 型が複雑になり、`Document`を扱う既存コード（`documents`spec側含む）に型ガードの追加が必要 | 既存`DocumentTargeting`のdiscriminatedUnionパターンをそのまま踏襲 |
| 全フィールドをoptionalにしたフラットな型 | `fileName?`, `googleUrl?`等をすべてoptionalにする | 実装は単純 | `sourceType`とフィールドの整合性を型システムが保証できず、実行時バグの温床になる（プロジェクトの型安全原則に反する） | 不採用 |

## Design Decisions

### Decision: `Document`型を`sourceType`による判別可能ユニオン型に変更する
- **Context**: PDFアップロード方式に加えて、Googleドキュメントの共有リンクを保持する方式を追加する必要がある
- **Alternatives Considered**:
  1. 全フィールドoptional化
  2. `sourceType`による判別可能ユニオン型（`DocumentTargeting`と同一パターン）
- **Selected Approach**: `DocumentBase`共通フィールド + `sourceType: "upload"`ブランチ（`fileName`/`fileType`/`fileSize`/`dataUrl`必須）と`sourceType: "google"`ブランチ（`googleUrl`/`googleEmbedUrl`必須）の判別可能ユニオン型
- **Rationale**: プロジェクトの型安全原則（`any`禁止、判別可能ユニオンの活用）および既存の`DocumentTargeting`パターンとの一貫性を優先
- **Trade-offs**: `documents`spec側での型ガード追加が必要になるが、実行時の不整合（例: `sourceType: "google"`なのに`dataUrl`が空文字）を型レベルで排除できる
- **Follow-up**: `documents`spec側の`PdfViewer`・一覧表示コンポーネントで`sourceType`に応じた分岐実装が必要（`documents`specのresearch.md/design.mdで追跡）

### Decision: 埋め込みURL変換を`/preview`パスへの統一とする
- **Context**: Docs/Sheets/Slidesそれぞれで埋め込みURLの慣例が微妙に異なる
- **Alternatives Considered**:
  1. 種別ごとに異なる埋め込みパス（Slidesは`/embed`等）を使い分ける
  2. 3種別とも`/preview`に統一する
- **Selected Approach**: 3種別とも`/preview`パスに統一する変換関数`toGoogleEmbedUrl`を実装する
- **Rationale**: 実装・テストがシンプルになり、自動再生等Slides固有の追加機能は本要望のスコープ外
- **Trade-offs**: Slides特有の埋め込み表示オプション（自動再生等）は使えないが、要件上不要
- **Follow-up**: なし

## Risks & Mitigations
- Google側のファイル共有設定が「リンクを知っている全員」になっていない場合、埋め込み枠にGoogle側の権限エラーが表示される — UIのヘルプテキストで共有設定の必要性を明記し、検証はブラウザのiframe標準動作に委ねる（要件13.11、要件13[documents].6）
- ポータルの公開範囲（`targeting`）とGoogle側のリンク共有範囲は非対称であり、リンクを知っていればポータルの公開範囲外の第三者もGoogle側で直接閲覧できてしまう — 運用上の注意点としてSecurity Considerationsおよびフォームのヘルプテキストに明記する
- 入力されたURLがGoogleドキュメント以外（例: 他社のURL、フィッシングサイト）であった場合、URLパターン検証（要件13.3）で保存をブロックすることでほぼ防げるが、正規のGoogleドキュメントURLであってもiframe内に悪意あるコンテンツが表示される可能性はヘルプデスク担当者の運用責任とする

---

## 追加ラウンド（2026-07-28）: ドキュメントのカテゴリ管理（要件18〜22）

### Summary（追加分）
- **Discovery Scope**: Extension（既存コードベース内のパターン調査中心。外部依存・外部APIの新規追加はなし）
- **Key Findings**:
  - 本リポジトリのPrismaスキーマには**自己参照リレーションを持つモデルが存在せず**、`displayOrder`等の手動並び替え用カラムを持つモデルも存在しない（`Faq`・`Link`・`Document`はいずれも`createdAt`/`uploadedAt`順の固定ソート）。カテゴリ階層と表示順は本リポジトリ初の導入パターンとなる。
  - 「配下に子レコードが存在するため削除できない」という安全な削除制御も既存specに前例がない（`links-management`・`faq-management`のカテゴリは`enum`固定値であり、削除対象になるエンティティではない）。文言のトーンは既存の削除確認（`helpdeskDocuments.list.deleteConfirm`＝`{title}`埋め込み・`ConfirmDialog`）に合わせつつ、件数を含む新規メッセージを定義する必要がある。
  - 言語タブUI（固定ja/enタブ＋`useFieldArray`による追加言語＋エラータブ自動切替）は`AnnouncementForm`・`DocumentForm`・`FaqForm`に**既に3つ複製**されている。共通コンポーネント化されていないため、本ラウンドも既存方針（写経）に従うのが整合的。
  - 管理一覧のUI部品は`helpdesk-shared/ManagementList.tsx`（`ManagementListHeading`/`MessageCard`/`Card`/`Rows`/`Row`/`Skeleton`）のみが共有され、`FilterBar`・`Pagination`はドメインごとに複製されている。`ManagementListHeading`は`addHref`（`Link`遷移）が必須のため、ダイアログ起動型の「追加」には合致しない。同ファイルを所有するspecがどのspecなのか明示されていない（`.kiro/specs/*/design.md`に所有記述がない）。

### Architecture Pattern Evaluation（追加分）

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 単一`DocumentCategory`＋自己参照（採用） | `parentId === null`を大分類、非nullを中分類として1モデルで表現 | 翻訳テーブル・サービス・Server Actions・フォームを1組で済ませられる。3階層目への将来拡張も容易 | 「中分類の下に子を作れない」保証がDB制約ではなくサービス層（`DocumentCategoryDepthError`）になる | Prismaの名前付き自己参照リレーション（`@relation("DocumentCategoryHierarchy")`）が必要 |
| 大分類/中分類を別モデル | `DocumentCategory` + `DocumentSubCategory`の2モデル | 階層の深さがスキーマで保証される | 翻訳テーブル2つ・サービス2組・フォーム2組と重複が大きい。公開範囲・並び替え・削除制御も二重実装になる | 不採用 |
| 可視カテゴリ判定を`groupBy`＋`findMany`（採用） | 可視ドキュメントを`categoryId`でgroupByして件数Mapを作り、可視カテゴリと突き合わせる | 要件21.6のAND条件と要件20.4の件数を2クエリで同時に満たす。Prismaのフィルタ付きリレーション件数機能に依存しない | カテゴリ件数が非常に多い場合はアプリ側での突き合わせコストが増える（現状の規模では無視できる） | — |
| 可視カテゴリ判定を`some`＋フィルタ付き`_count` | `where: { documents: { some: ... } }` と `_count: { select: { documents: { where: ... } } }` | クエリ1本で完結 | フィルタ付きリレーション件数のサポート状況に依存する。同一の`where`を2箇所に書くことになる | 代替案として保持 |
| 可視性判定をコンポーネント層で実施 | 全カテゴリ・全ドキュメントを取得してから絞り込む | 実装が単純 | 非可視カテゴリと非公開ドキュメントをサーバー→クライアント境界まで運ぶことになり、件数増加で無駄が増える | 不採用 |

### Design Decisions（追加分）

#### Decision: カテゴリを単一モデル＋自己参照で表現し、階層の深さをサービス層で保証する
- **Context**: 大分類（必須）・中分類（任意）の2階層に限定したカテゴリが必要（要件18.1・18.2）
- **Selected Approach**: `DocumentCategory`1モデル＋`parentId`自己参照。`parentId`非nullのカテゴリを親に指定した作成を`DocumentCategoryDepthError`で拒否する
- **Rationale**: 翻訳テーブル・公開範囲・並び替え・削除制御・フォームの重複実装を避けられる。既存の`DocumentTranslation`パターンをそのまま1回だけ横展開できる
- **Trade-offs**: 深さの不変条件がDBではなくアプリ層の責務になる。テストで明示的に担保する
- **Follow-up**: 3階層目が必要になった場合、モデル変更なしでサービス層の制約を緩めるだけで対応可能

#### Decision: 同一階層内の名称一意性をDB制約ではなくサービス層で判定する
- **Context**: 要件19.6は同一階層（大分類同士／同一大分類配下の中分類同士）での既定言語名称の重複を禁止する
- **Alternatives Considered**: (1) `@@unique([parentId, name])` (2) `parentId IS NULL`用と`IS NOT NULL`用の2つの部分一意インデックス（生SQL） (3) サービス層での判定
- **Selected Approach**: (3) サービス層（`DocumentCategoryNameConflictError`）
- **Rationale**: PostgreSQLの一意インデックスはNULLを互いに異なる値として扱うため、(1)は大分類同士に効かず「片方だけ効く」誤解を生む。(2)はPrismaスキーマで表現できず生SQLマイグレーションの手書きが必要で、フェーズ1の規模に対して過剰
- **Trade-offs**: 並行リクエストによる競合で重複が入り込む理論上の余地が残る（フェーズ1の単一運用者前提では許容）

#### Decision: 削除の安全制御を「表示用の件数」と「実行時の再確認」の二層＋DB制約で構成する
- **Context**: 要件19.8・19.9は配下にドキュメント／中分類が存在する場合の削除拒否と、件数を明示したエラーメッセージを求める。要件19.12はサーバー側での判定も求める
- **Selected Approach**: ①`listDocumentCategoriesForHelpdesk`が各カテゴリの`documentCount`と`children`を返し、UIは件数入りメッセージを即時表示して削除操作をブロックする ②サービス層`deleteDocumentCategoryRecord`が削除直前に件数を再確認し`DocumentCategoryInUseError`（件数付き）を送出する ③DBの`onDelete: Restrict`を最終防衛線とする
- **Rationale**: 件数表示のための追加ラウンドトリップを避けつつ、クライアント表示だけに依存しない（TOCTOU対策）。既存の`ConfirmDialog`パターンとも自然に組み合わせられる
- **Trade-offs**: 件数の取得が一覧クエリの負荷に含まれる（カテゴリ数は小規模のため許容）

#### Decision: カテゴリ管理を1画面内のダイアログCRUDとする（`/new`・`/[id]/edit`ルートを作らない）
- **Context**: 既存の管理系spec（`documents-management`本体・`links-management`・`faq-management`）はいずれも「一覧＋別ルートのフォーム」構成
- **Selected Approach**: `/helpdesk/documents/categories`単一ルート＋`Dialog`ベースの追加・編集
- **Rationale**: 階層関係と表示順を俯瞰しながら追加・編集・並び替えを繰り返す操作特性に合う。中分類の追加は「どの大分類の行から開いたか」で`parentId`が決まるため、親選択UIを別途持たずに済む
- **Trade-offs**: 既存パターンからの意図的な逸脱であり、URLで特定のカテゴリ編集状態を共有できない。**設計レビューでの確認事項とする**
- **Follow-up**: `ManagementListHeading`に任意の`action?: ReactNode`スロットを追加して共通化する案は、`helpdesk-shared`の所有specが不明確なため本ラウンドでは行わない（別途調整）

#### Decision: `Document`にカテゴリ名を持たせず、カテゴリ一覧を辞書としてUIへ渡す
- **Context**: 管理一覧の行表示（要件18.11）・フォームの選択肢（要件18.5・18.7）・絞り込み選択肢（要件22.1・22.2）はいずれもカテゴリ一覧を必要とする
- **Selected Approach**: `Document`は`categoryId`/`subCategoryId`のみを持ち、サーバーコンポーネントが`getAllDocumentCategories()`の結果をクライアントへ渡して名称解決する（既存の`countryLabels`/`companyLabels`辞書と同一方式）
- **Rationale**: `mapDocument`の入力型・`DOCUMENT_INCLUDE`を変更せずに済み、`documents`spec側の型影響も最小（フィールド追加のみ）。どの画面でもカテゴリ一覧自体が必要なため、ドキュメントごとにネストして持つ意味が薄い
- **Trade-offs**: クライアント側でID→名称のMap構築が必要（軽量）

#### Decision: 可視性述語（`visibleToWhere`）をexportしてカテゴリサービスから再利用する
- **Context**: 要件21.6の「配下に自社可視の公開済みドキュメントが1件以上」はドキュメント側の可視性条件（`status: "published"` ＋ `targeting`のOR）と完全に同一でなければならない
- **Selected Approach**: `document-service.ts`のプライベート関数`visibleToWhere`を`documentVisibleToWhere`としてexportし、`document-category-service.ts`が再利用する
- **Rationale**: 可視性述語を2箇所に書くと、将来の条件追加（例: 公開期間）で片方に反映漏れが起きる。単一情報源にする
- **Trade-offs**: `document-service.ts`の公開APIが1つ増える（内部モジュール間の共有に限る）

### Risks & Mitigations（追加分）
- **既存ドキュメントが申請者側から見えなくなる**: 要件18.4により既存レコードは`categoryId = NULL`のまま。申請者側は大分類カード経由でしか到達できないため、カテゴリ整備と再割当が完了するまでドキュメント一覧が実質空になる — リリース手順として「カテゴリ作成 → 管理一覧の『未設定』絞り込みで抽出して割当 → 公開」の順序を明示し、design.mdのSecurity Considerationsにも記載する
- **本番マイグレーションの反映漏れ**: 新規2テーブル＋`Document`への2列追加は`prisma migrate deploy`の手動実行が必要。漏れると「カラム不在で0件表示」の既知の失敗モードに陥る — デプロイ手順に明記する
- **`displayOrder`の初期値衝突**: `@default(0)`のため、複数カテゴリが同一の`displayOrder`を持つ状態が理論上あり得る（サービス層が`max + 1`を採番するため通常は発生しない）。同値の場合の順序はDBの返却順に依存する — `orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]`のように第2ソートキーを併用して決定的にすることを実装時に検討する
- **`categoryId`必須化による既存ドキュメント編集時の摩擦**: カテゴリ未設定の既存ドキュメントを編集・保存する際、大分類の選択が必須になる（要件18.6）。これは移行を促す意図的な設計だが、「タイトルだけ直したい」場合にもカテゴリ選択を強制する — 移行期間の運用として許容し、レビューで確認する

## References
- [Google Drive File Link Formats: Docs, Sheets, and Slides URL Patterns](https://automationace.com/blog/google-drive-file-link-formats-docs-sheets-slides) — FILE_ID抽出・URLパターンの参考
- [Make Google Docs, Sheets, Slides & Forms public - Google Docs Editors Help](https://support.google.com/docs/answer/183965?hl=en) — 共有設定と埋め込みの公式説明
- [Configure a Google Doc/Sheet/Form/Slides to Allow IFraming – Thinkific](https://support.thinkific.com/hc/en-us/articles/360030376674-Configure-a-Google-Doc-a-Google-Sheet-a-Google-Form-and-Google-Slides-to-Allow-IFraming) — iframe許可のための共有設定手順
