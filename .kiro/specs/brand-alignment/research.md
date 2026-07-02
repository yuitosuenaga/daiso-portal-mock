# Research & Design Decisions Template

## Summary
- **Feature**: `brand-alignment`
- **Discovery Scope**: Extension（既存フロントエンドモックアップに対する横断的なデザイントークン・共通コンポーネント刷新。新規ライブラリ・新規アーキテクチャの追加はなし）
- **Key Findings**:
  - `src/components/ui/` および `src/components/features/*` は既に色をTailwindのセマンティックトークン（`bg-primary` / `bg-accent` / `bg-secondary` / `bg-destructive` / `bg-muted` 等）経由で指定しており、パレット直指定（`bg-pink-500` 等）やインラインstyleでの色指定は検出されなかった。そのため配色刷新は`globals.css`のCSS変数変更が主戦場になり、Requirement 4.2（ハードコード色の修正）が発生する箇所は現時点でゼロ
  - DAISOのロゴアセット（SVG/画像）はリポジトリ内に存在しない。ロゴは新規にシンプルな幾何学的シェブロン（山型）マーク＋テキストワードマークとして自作する必要がある
  - `Sidebar.tsx` のアクティブ項目は現状 `bg-accent text-accent-foreground`（淡色強調）。参照イメージ（旧ポータル）ではアクティブ項目が濃いピンクの塗り＋白文字だったため、アクティブ状態は `bg-primary text-primary-foreground` に変更するのがより忠実
  - `Badge` は用途別バリアント（`maintenance` / `policy` / `incident` / `other` / `status-*` / `urgency-*`）のみで、汎用の `default`（ブランドピンク塗り）バリアントが存在しない。既存呼び出し箇所（`AnnouncementListItem` 等）はすべて用途別バリアント名を指定しており、`default` 追加は既存呼び出しに影響しない

## Research Log

### 既存コンポーネントの色指定パターン
- **Context**: 配色トークン変更がどこまで機械的に反映されるかを確認するため
- **Sources Consulted**: `grep -rnE "bg-(red|blue|...)-[0-9]|text-...|border-..."` を `src/components` と `src/app` に実行
- **Findings**: 該当ヒットなし。全コンポーネントがセマンティックトークン経由
- **Implications**: `globals.css` の変数変更と、少数の共通コンポーネントのバリアント追加のみで、機能ページ側の個別修正はほぼ不要になる（Requirement 4.1/4.2に対応）

### ロゴ・ブランドマークの扱い
- **Context**: 参照イメージ（旧ポータル・公式サイト）はいずれもDAISO社の商標ロゴ（山型シェブロン＋ワードマーク）を使用している。リポジトリ内にロゴアセットは存在しない
- **Sources Consulted**: リポジトリ内 `find -iname "*logo*"` （ヒットなし）
- **Findings**: 本モックアップはDAISO社内向けの内部プロトタイプであり、公式の商標画像ファイルは配布・保有していない
- **Implications**: 本specでは実際の商標画像を復元するのではなく、ブランドガイドライン（`.kiro/steering/brand.md`）に基づく簡易的な幾何学モチーフ（三段の山型シェブロン）とテキストワードマーク「DAISO」を新規SVGコンポーネントとして自作し、ブランドカラーで表現する

## Architecture Pattern Evaluation
| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| CSS変数のみ変更（トークン差し替え） | `globals.css` の `--primary` 等の値を変更し、既存のTailwindセマンティッククラスに委ねる | 変更箇所が最小、既存コンポーネントを機械的に更新できる、Tailwind設定自体は無変更 | バリアントが存在しないUIパターン（塗りバッジ・通知帯・アウトラインボタンのhover反転）はトークン変更だけでは実現できない | 採用。既存アーキテクチャ（`tailwind.config.ts` がCSS変数を参照する構成）に合致 |
| Tailwind設定に新規カラーキーを追加 | `daiso-pink` 等の専用カラーキーを追加 | 既存トークンに影響を与えず追加できる | セマンティックトークン（primary等）と別カラーキーが並立し、どちらを使うべきか曖昧になる。ガバナンス上望ましくない | 不採用。brand.mdの方針（セマンティックトークン経由で統一）に反する |

## Design Decisions

### Decision: プライマリカラーをDAISOピンクのCSS変数値に置き換える
- **Context**: 現行の `--primary` は汎用shadcn/uiのスレート色。ブランド認知のためDAISOピンクへ統一する必要がある
- **Alternatives Considered**:
  1. Tailwind設定に新規カラーキーを追加し、コンポーネント側で個別に参照 — トークンの二重管理になるため不採用
  2. `--primary` 等の既存CSS変数値をピンクの値に置き換える — 既存の `bg-primary` 等の参照をそのまま活かせる
- **Selected Approach**: `globals.css` の `--primary` / `--primary-foreground` / `--accent` / `--accent-foreground` / `--foreground` / `--ring` をDAISOピンク基調のHSL値に置き換える
- **Rationale**: 既存コンポーネントがすべてセマンティッククラス経由のため、変数変更のみで大部分の画面に反映される。トークンの一元管理を維持できる
- **Trade-offs**: `--destructive`（赤）や `--success`（緑）との色相差を保つ調整が必要（誤認防止）。デメリットは軽微
- **Follow-up**: 変更後、全画面でコントラスト比（WCAG AA）を目視確認する

### Decision: Sidebarアクティブ状態を `bg-accent` から `bg-primary` に変更
- **Context**: 参照イメージ（旧ポータル）のアクティブメニューは濃いピンク塗り＋白文字
- **Alternatives Considered**:
  1. `bg-accent text-accent-foreground`（淡色）を維持 — トークン変更のみで自動的にピンク系にはなるが、参照イメージより弱い強調になる
  2. `bg-primary text-primary-foreground`（濃色）に変更 — 参照イメージに忠実
- **Selected Approach**: アクティブ状態は `bg-primary text-primary-foreground`、非アクティブのhoverは `hover:bg-accent hover:text-accent-foreground`（淡色）のまま維持
- **Rationale**: アクティブと非アクティブ(hover)を色の濃淡で明確に区別でき、参照イメージのトーンに最も近い
- **Trade-offs**: なし（既存のCSSクラス切り替えロジックを変更するだけ）
- **Follow-up**: なし

### Decision: Badge/Alert/Buttonにブランド用バリアントを追加する
- **Context**: 公式サイトの「NEWS」タグ・重要なお知らせバー・アウトライン気味のCTAボタンといったUIパターンは、既存バリアントだけでは表現できない
- **Alternatives Considered**:
  1. 既存バリアントの値だけを差し替える — `Badge`の用途別バリアント（`maintenance`等）はそのままの意味を持つため上書きは不可
  2. 新規バリアント（`Badge`の`default`、`Alert`の`notice`、`Button`の`outline`の見た目調整）を追加する
- **Selected Approach**: 既存バリアント名・意味は変更せず、汎用ブランド表現用のバリアントを追加する。`Button`の`outline`はピンク基調に見た目のみ変更（バリアント名は維持）
- **Rationale**: 既存の呼び出し箇所（`grep`で確認済み）に影響を与えず、後方互換を保ったまま新しい見せ方を提供できる
- **Trade-offs**: バリアントの選択肢が増えるため、将来的にどちらを使うべきかのガイドが必要（brand.mdに記載済み）
- **Follow-up**: なし

## Risks & Mitigations
- リスク1: DAISOピンクの彩度が高いため、テキストコントラストが不足する可能性 — 緩和策: 白文字はprimaryの明度45%以下の濃色背景でのみ使用し、目視でコントラストを確認する
- リスク2: 既存の`--destructive`（エラー赤）と新しい`--primary`（ピンク）が視覚的に混同される可能性 — 緩和策: 色相を明確に分離（destructive: hue 0 / primary: hue 327）し、レビュー時に並べて比較する
- リスク3: 自作ロゴが本物のDAISO商標と誤認される可能性 — 緩和策: 内部モックアップである前提を保ち、実際のロゴ画像ファイルを複製しない。幾何学的な簡易表現に留める

## References
- `.kiro/steering/brand.md` — 本specの配色・UIパターンの根拠となるブランドガイドライン
