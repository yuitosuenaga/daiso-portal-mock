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

## References
- [Google Drive File Link Formats: Docs, Sheets, and Slides URL Patterns](https://automationace.com/blog/google-drive-file-link-formats-docs-sheets-slides) — FILE_ID抽出・URLパターンの参考
- [Make Google Docs, Sheets, Slides & Forms public - Google Docs Editors Help](https://support.google.com/docs/answer/183965?hl=en) — 共有設定と埋め込みの公式説明
- [Configure a Google Doc/Sheet/Form/Slides to Allow IFraming – Thinkific](https://support.thinkific.com/hc/en-us/articles/360030376674-Configure-a-Google-Doc-a-Google-Sheet-a-Google-Form-and-Google-Slides-to-Allow-IFraming) — iframe許可のための共有設定手順
