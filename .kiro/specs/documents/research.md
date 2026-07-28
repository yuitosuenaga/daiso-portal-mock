# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design。

**Usage**:
- Log research activities and outcomes during the discovery phase。
- Document design decision trade-offs that are too detailed for `design.md`。
- Provide references and evidence for future audits or reuse。
---

## Summary
- **Feature**: `documents`（追加要望 2026-07-16: Googleドキュメント埋め込みのライブ表示）
- **Discovery Scope**: Extension（`documents-management`spec側の`sourceType`追加に追随する軽量な拡張。外部連携・新規ライブラリは本spec側では発生しない）
- **Key Findings**:
  - Google側のURLパターン判定・埋め込みURL変換ロジックは`documents-management`spec所有（`GoogleDocumentUrlUtils`）であり、本specは変換済みの`googleEmbedUrl`をそのまま`<iframe src>`に設定するだけでよい。本spec側で新規の外部知識・ライブラリ調査は不要。
  - `PdfViewer`の既存propsインターフェース（`dataUrl`/`title`/`downloadFileName`/`downloadLinkLabel`）は、Google型のドキュメントに対してそのまま使えないフィールド（`dataUrl`→存在しない、ダウンロードリンク→提供不可）があるため、`variant`による判別可能ユニオン型へ変更するのが最も型安全（`documents-management`のresearch.mdで採用した`sourceType`判別可能ユニオンパターンと一貫性がある）。

## Research Log

### PdfViewerのprops設計（既存の単一形状 vs 判別可能ユニオン）
- **Context**: `PdfViewer`は現状`dataUrl`必須の単一形状のpropsを持つ。Google型のドキュメントでは`dataUrl`が存在せず、ダウンロードリンクの代わりに「元のドキュメントを開く」リンクが必要になる。
- **Sources Consulted**: 既存実装（`src/components/features/documents/PdfViewer.tsx`）、`documents-management`spec側の`research.md`（`Document`型のsourceType判別可能ユニオン化の決定）
- **Findings**: 全propsをoptionalにする設計は、`variant: "upload"`なのに`downloadFileName`が未設定、といった実行時の不整合を型システムが検出できない。`documents-management`側の`Document`型と同じ判別可能ユニオンパターンをpropsレベルでも踏襲すれば、呼び出し側（`DocumentListItem`）で分岐時にTypeScriptの型絞り込みが効く。
- **Implications**: `PdfViewerProps`を`{variant: "upload"; ...} | {variant: "google"; ...}`の判別可能ユニオン型に変更する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| `variant`による判別可能ユニオン型props（採用） | `PdfViewerProps`を`variant: "upload" \| "google"`で分岐 | 型安全、`documents-management`側の`sourceType`判別と一貫した設計言語 | `DocumentListItem`側で分岐ロジックが必要 | `Document.sourceType`とは別の値だが対応関係にある |
| 全propsをoptional化 | `dataUrl?`, `embedUrl?`等をすべてoptionalに | 実装は単純 | 実行時の不整合を型で防げない | 不採用（プロジェクトの型安全原則に反する） |

## Design Decisions

### Decision: `PdfViewerProps`を`variant`による判別可能ユニオン型に変更する
- **Context**: Google型ドキュメントのプレビュー・リンク要件が、既存のアップロード型と異なるフィールド構成を必要とする
- **Alternatives Considered**:
  1. 全propsをoptional化
  2. `variant`による判別可能ユニオン型
- **Selected Approach**: `{ variant: "upload"; dataUrl; title; downloadFileName; downloadLinkLabel } | { variant: "google"; embedUrl; title; originalUrl; openOriginalLabel }`
- **Rationale**: `documents-management`specが確立した`sourceType`判別可能ユニオンパターンとの一貫性、型安全性の確保
- **Trade-offs**: `DocumentListItem`側の呼び出しコードがわずかに複雑になるが、実行時不整合を型で防げる利点が上回る
- **Follow-up**: なし（本spec内で完結する変更）

## Risks & Mitigations
- `documents-management`spec側の`Document.sourceType`追加が先行実装されない場合、本spec側の`PdfViewer`拡張は型エラーになる — 実装順序は`documents-management`を先行させる（既存の実装順序推奨と同様）
- Google埋め込みが権限不足で表示できない場合の挙動はブラウザ標準に委ねるため、本specとしてのエラーメッセージ設計は不要（要件13.6）

---

## 追加ラウンド（2026-07-28）: 大分類トップページと大分類配下一覧（要件20〜22）

### Summary（追加分）
- **Discovery Scope**: Extension（既存コードベース内のパターン調査中心。外部依存の追加なし）
- **Key Findings**:
  - 「クリック可能なカードのグリッド」は既にダッシュボード（`src/app/[locale]/(applicant)/page.tsx`・`NavigationCard`）で確立しており、グリッドは`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`、カード全体を`Link`で包み`aria-label`に`title + description`を与える方式。ただし`NavigationCard`は`icon: LucideIcon`と`description`が必須で、カテゴリには対応する値がない。
  - 申請者側リンク集（`LinkListClient`）のカテゴリ別グループ表示は「正準なコードリスト（`LINK_CATEGORY_CODES`）を回して0件をスキップ」する方式で、DBエンティティとしてのカテゴリではないため本ラウンドの参考にはならない（大分類は動的なDBレコード）。
  - `resolveActiveHref`（`src/components/layout/nav-items.ts`）は「`item.href` + `/` で始まるか」の前方一致判定を行うため、`/documents/categories/[categoryId]`でもサイドバーの「ドキュメント」項目はアクティブのままになる。`Sidebar`・`nav-items.ts`の変更は不要。
  - 既存`DocumentList`（Server）は「取得 → 見出し → `DocumentListClient`へ委譲」の3分岐（成功/エラー/0件）構造で、見出しJSXを各分岐で再利用している。この構造は大分類配下一覧にそのまま流用でき、新規のトップページ用コンポーネントにも同じ形を写経できる。

### Design Decisions（追加分）

#### Decision: 大分類カードは`NavigationCard`を再利用せず`DocumentCategoryCard`を新設する
- **Context**: 要件20.4は大分類カードに「カテゴリ名＋配下の可視ドキュメント件数」を表示することを求める
- **Alternatives Considered**: (1) `dashboard-card-redesign`spec所有の`NavigationCard`を`icon`/`description`にダミー値を渡して再利用 (2) 専用カードを新設し、グリッドのクラス構成のみ揃える
- **Selected Approach**: (2)
- **Rationale**: `NavigationCard`は`icon`（`LucideIcon`）と`description`が必須で、カテゴリに対応する値がない。ダミー値を渡すのはアクセシビリティ（`aria-label`合成）にも悪影響。また他spec所有コンポーネントへの依存を増やさない
- **Trade-offs**: カード実装が1つ増えるが、視覚的な一貫性はグリッドとカードのスタイルを合わせることで担保できる

#### Decision: 既存`DocumentList`を「大分類配下一覧」へ役割変更し、トップページ用は新規コンポーネントとする
- **Context**: トップページ（`/documents`）はカテゴリカード一覧に変わり、従来の一覧描画は`/documents/categories/[categoryId]`へ移る
- **Alternatives Considered**: (1) `DocumentList`をトップページ用（カテゴリ一覧）に作り替え、配下一覧を新規作成 (2) `DocumentList`に`categoryId` propsを追加して配下一覧に役割変更し、トップページ用を新規作成
- **Selected Approach**: (2)
- **Rationale**: `DocumentList` → `DocumentListClient` → `DocumentListItem` → `PdfViewer`という既存の受け渡し経路（ラベルpropsの連鎖）をそのまま保てる。(1)だとこの経路を新規コンポーネントへ丸ごと移送することになり差分が大きい
- **Trade-offs**: `DocumentList`という名前が「全ドキュメント一覧」を連想させる点は残る。`DocumentList.test.tsx`の更新が必要
- **Follow-up**: 実装時に命名変更（例: `CategoryDocumentList`）を行うかは任意。ファイル名変更はテスト・importの追随コストのみ

#### Decision: 中分類の絞り込みはクライアント側の即時フィルタとする
- **Context**: 要件21.7・21.8はキーワード検索とのAND条件・ページ再読込なしの即時反映を求める
- **Selected Approach**: `getDocumentsByCategory`で大分類配下の全件を取得し、`DocumentListClient`が`subCategoryId`状態で絞り込む（既存のキーワード検索と同一方式）
- **Rationale**: 申請者側（要件12）・ヘルプデスク側（`documents-management`要件14）の双方で確立済みのパターン。サーバー再取得を挟むと`loading="lazy"`のiframeが再マウントされ体験が劣化する
- **Trade-offs**: 大分類配下の件数が非常に多い場合は初期ペイロードが増える（既存の要件14スコープ外の課題と同一の制約であり、本ラウンドで悪化させるものではない）

### Risks & Mitigations（追加分）
- `documents-management`spec側のカテゴリモデル・可視カテゴリ取得関数が先行実装されない場合、本spec側の新規コンポーネントは型エラーになる — 実装順序は`documents-management`を先行させる（既存の推奨と同様）
- カテゴリが1件も整備されていない状態では、申請者側のトップページが0件メッセージのみになる（既存ドキュメントは`categoryId = NULL`のため到達不可） — `documents-management`spec側のリリース手順（カテゴリ作成 → 既存ドキュメントへの割当 → 公開）に依存する。本specとしては0件メッセージ（要件20.9）を確実に表示することで「壊れている」ように見えない状態を担保する
- 大分類配下一覧の`h1`がカテゴリ名になるため、`documents.list.title`（「ドキュメント」等）はトップページのみで使われる — 翻訳キーの用途が画面ごとに分かれる点をi18n追記時に明記する

## References
- `documents-management`specの`research.md` — GoogleドキュメントURLパターン・埋め込み方式の詳細調査、および2026-07-28ラウンドのカテゴリデータモデル・可視性判定に関する設計判断
