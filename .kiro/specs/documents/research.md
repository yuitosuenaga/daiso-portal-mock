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

## References
- `documents-management`specの`research.md` — GoogleドキュメントURLパターン・埋め込み方式の詳細調査
