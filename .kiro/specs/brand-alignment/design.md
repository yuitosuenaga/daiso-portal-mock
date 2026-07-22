# Technical Design Document

## Overview
**Purpose**: 本機能は、既存のポータルモックアップの見た目を `.kiro/steering/brand.md` で定義したDAISOブランドガイドラインに準拠させ、利用者（海外販社担当者）に対して「DAISOの公式業務システムである」という視覚的な信頼感を提供する。
**Users**: 全機能（dashboard, inquiry-form, inquiry-list, announcements, links-page, faq）の利用者が対象。特定の役割・画面に限定しない横断的な変更である。
**Impact**: 現在shadcn/uiの汎用配色（スレート系プライマリ）で構築されているUIを、DAISOピンクを基調としたデザイントークンとコンポーネントバリアントに置き換える。既存の機能・データ構造・多言語文言は変更しない。

### Goals
- `globals.css` のCSS変数（デザイントークン）をDAISOブランドカラーに更新し、全画面へ機械的に反映する
- 共通UIコンポーネント（Button, Badge, Alert）にDAISOブランドのUIパターン（塗りタグ、通知帯、アウトラインCTA）を表現するバリアントを追加する
- ヘッダーにDAISOロゴ（自作の簡易シェブロンマーク＋ワードマーク）を追加し、サイドバーのアクティブ状態をDAISOピンクの塗りで強調する

### Non-Goals
- 新規機能・新規ページの追加
- `types/`、`lib/api/` のモックAPIロジック、データモデルの変更
- `messages/` の翻訳文言・翻訳キーの追加・変更
- 実際のDAISO商標ロゴ画像ファイルの複製・使用（自作の簡易モチーフで代替する。research.md参照）

## Boundary Commitments

### This Spec Owns
- `globals.css` のデザイントークン（`--primary` 系, `--accent` 系, `--foreground` 系, `--ring`）の値
- `src/components/ui/` のうち `button.tsx` / `badge.tsx` / `alert.tsx` のバリアント定義
- `src/components/layout/` のうち `Header.tsx`（ロゴ追加） / `Sidebar.tsx`（アクティブ状態の見た目） / `LanguageSwitcher.tsx`（アクティブ言語の強調色）
- 新規コンポーネント `src/components/layout/Logo.tsx`

### Out of Boundary
- 各機能（`src/components/features/*`）のビジネスロジック・データ取得処理 — 配色はトークン変更により自動的に反映されるため、本spec側での個別編集は原則不要（research.mdのgrep調査で確認済み）
- `Card` コンポーネントの構造変更（既存の薄枠・shadow-smスタイルはブランド方針と合致するため変更しない）
- 各機能specの `design.md` に記載された機能要件・画面遷移

### Allowed Dependencies
- `.kiro/steering/brand.md`（本specの配色・UIパターンの唯一の正）
- 既存の `tailwind.config.ts`（CSS変数を参照する構成を変更せずそのまま利用）
- `class-variance-authority`（既存の `button.tsx` / `badge.tsx` / `alert.tsx` のバリアント管理手法を継続利用）

### Revalidation Triggers
- `.kiro/steering/brand.md` の配色値・UIパターンが更新された場合、本specのデザイントークン値を再確認する
- 新規UIコンポーネントを `src/components/ui/` に追加する際、そのデフォルトバリアントがブランドトークン（`bg-primary` 等）を参照しているか確認する
- 各機能specで新しいバッジ用途・通知用途が追加される場合、`badge.tsx` / `alert.tsx` の既存バリアントで表現できるか、新規バリアントが必要かを確認する

## Architecture

### Existing Architecture Analysis
- 配色は `tailwind.config.ts` が `hsl(var(--xxx))` 形式でCSS変数を参照し、`globals.css` の `:root` で変数の実値を定義する2層構成（既存パターン、変更なし）
- `src/components/ui/*` は `class-variance-authority`（cva）でバリアントを管理しており、全コンポーネントが色をセマンティックトークン（`bg-primary` 等）経由で指定している（パレット直指定は検出されなかった。research.md参照）
- この構成により、デザイントークンの値変更だけで大部分の画面に配色が伝播する。既存パターンを維持したまま、値の更新とバリアントの追加のみで要件を満たせる

### Design Token Values
`globals.css` の `:root` ブロックに適用する変更値（HSL）。記載のないトークン（`--card`, `--secondary`, `--muted`, `--border`, `--input`, `--destructive`, `--success`, `--radius` 等）は既存値を維持する。

| トークン | 現状値（HSL） | 変更後（HSL） | 意図 |
|---|---|---|---|
| `--primary` | `222.2 47.4% 11.2%`（スレート） | `327 90% 45%`（DAISOピンク, ≒`#e4007f`） | ブランドカラー本体 |
| `--primary-foreground` | `210 40% 98%` | `0 0% 100%`（白） | primary上のテキストコントラスト確保 |
| `--accent` | `210 40% 96.1%` | `327 85% 96%`（淡ピンク） | hover・選択背景 |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `327 90% 35%` | accent上のテキストコントラスト確保 |
| `--foreground` | `222.2 84% 4.9%`（青みがかった黒） | `0 0% 20%`（ニュートラルな濃グレー） | 公式サイトの「純黒を避けた濃グレー」に合わせる |
| `--ring` | `222.2 84% 4.9%` | `327 90% 45%`（`--primary`と同値） | フォーカスリングもブランドカラーで統一 |

**Key Decisions**: `--destructive`（hue 0）と `--success`（hue 142）は変更しない。`--primary` の色相（327）と十分に分離されているため、エラー・成功表示とブランド強調が混同されない（research.md「Risks & Mitigations」参照）。

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Styling | Tailwind CSS + CSS変数（既存構成） | デザイントークンの実値管理 | 新規ライブラリ追加なし |
| UI Components | shadcn/ui + class-variance-authority（既存構成） | Button/Badge/Alertへのバリアント追加 | 既存バリアント名・意味は変更せず追加のみ |
| Icons/Logo | 自作SVG（Reactコンポーネント） | DAISOロゴの簡易モチーフ表現 | 外部アイコンライブラリ（lucide-react）は既存メニューアイコン用途のまま変更なし |

## File Structure Plan

### Modified Files
- `src/app/globals.css` — `:root` のデザイントークン値を上表の通り更新
- `src/components/ui/button.tsx` — `outline` バリアントをピンク基調（枠線・文字色ピンク、hoverで塗りに反転）に調整
- `src/components/ui/badge.tsx` — 汎用ブランド表現用の `default` バリアント（ピンク塗り・白文字）を追加。既存バリアント（`maintenance` 等）は変更しない
- `src/components/ui/alert.tsx` — 重要通知向けの `notice` バリアント（ピンク塗り・白文字）を追加。既存の `success` / `destructive` は変更しない
- `src/components/layout/Header.tsx` — 新規 `Logo` コンポーネントを配置し、既存タイトル文言はロゴに付随するサブテキストとして表示
- `src/components/layout/Sidebar.tsx` — アクティブ項目のクラスを `bg-accent text-accent-foreground` から `bg-primary text-primary-foreground` に変更（hover時の非アクティブ項目は既存の `bg-accent` を維持）
- `src/components/layout/LanguageSwitcher.tsx` — アクティブ言語ラベルの強調色を `text-foreground` から `text-primary` に変更（配置・機能は変更しない）

### New Files
```
src/components/layout/
└── Logo.tsx    # DAISOブランドの簡易シェブロンマーク＋ワードマークを描画するSVGベースの表示専用コンポーネント
```

### Unchanged (confirmed, no modification required)
- `tailwind.config.ts` — 既にCSS変数を汎用的に参照する構成のため変更不要
- `src/components/ui/card.tsx` — 薄枠・最小限のshadowという既存スタイルがブランド方針と合致するため変更不要
- `src/components/features/*` 配下の各機能コンポーネント — 色指定がすべてセマンティックトークン経由のため、トークン変更のみで配色が伝播する（research.md参照）

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|---------------|---------------------------|-----------|
| globals.css tokens | Styling / Config | デザイントークンの実値定義 | 1.1, 1.2, 1.4, 4.1 | tailwind.config.ts (P0) | State |
| Logo | UI / Presentational | DAISOブランドマークの表示 | 3.1 | Header (P0) | — |
| Header | Layout | ロゴ・タイトル・言語切替の配置 | 3.1, 3.4 | Logo (P0), LanguageSwitcher (P0) | — |
| Sidebar | Layout | ナビゲーションのアクティブ/hover強調 | 3.2, 3.3 | globals.css tokens (P0) | State |
| Button | UI / Presentational | 塗り・アウトラインCTAのブランド表現 | 2.1, 2.2 | globals.css tokens (P0) | — |
| Badge | UI / Presentational | 汎用ブランドタグ表現の追加 | 2.3 | globals.css tokens (P0) | — |
| Alert | UI / Presentational | 重要通知帯のブランド表現の追加 | 2.4 | globals.css tokens (P0) | — |

新しい責任境界（データ保持・外部連携）を持つコンポーネントは存在しないため、上記summary tableのみで十分であり、個別の詳細ブロック（Service/API/Event Contract等）は不要と判断する。すべて表示専用（Presentational）またはCSS変数の値定義であり、状態管理・非同期処理・外部依存を持たない。

### Logo コンポーネント仕様
```typescript
interface LogoProps {
  className?: string;
}
```
- **Implementation Notes**:
  - Integration: `Header.tsx` から `<Logo />` として呼び出す。SVGはインラインで定義し、色は `currentColor` または `text-primary` を用いてTailwindのテーマ変更に自動追従させる
  - Validation: 商標画像ファイルは使用せず、幾何学的な山型（シェブロン）3段のモチーフとテキストワードマーク「DAISO」のみで構成する（research.md「ロゴ・ブランドマークの扱い」参照）
  - Risks: 実店舗ロゴとの視覚的差異は許容範囲（本モックアップは内部プロトタイプであるため）

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | プライマリ等トークンをDAISOピンクへ更新 | globals.css tokens | CSS変数 | — |
| 1.2 | destructive/successの色相分離を維持 | globals.css tokens | CSS変数 | — |
| 1.3 | 色はセマンティッククラス経由で指定 | 全UIコンポーネント | Tailwindユーティリティ | — |
| 1.4 | 変更後もビルドが成功する | globals.css tokens, 全コンポーネント | npm run build | — |
| 2.1 | Buttonのprimaryバリアントがピンク塗り | Button | `buttonVariants` | — |
| 2.2 | Buttonのoutlineバリアントがピンク枠→hoverで反転 | Button | `buttonVariants` | — |
| 2.3 | Badgeにピンク塗りのdefaultバリアント追加 | Badge | `badgeVariants` | — |
| 2.4 | Alertにピンク塗りのnoticeバリアント追加 | Alert | `alertVariants` | — |
| 2.5 | Cardは薄枠・最小限shadowを維持 | Card（変更なし） | — | — |
| 3.1 | HeaderにDAISOロゴを表示 | Logo, Header | `LogoProps` | — |
| 3.2 | Sidebarアクティブ項目がピンク塗り・白文字 | Sidebar | クラス切り替え | — |
| 3.3 | Sidebar非アクティブ項目のhoverが淡ピンク | Sidebar | クラス切り替え | — |
| 3.4 | LanguageSwitcherの配置・機能を維持しつつ視認性確保 | LanguageSwitcher | クラス切り替え | — |
| 4.1 | 全6機能ページがトークン・共通コンポーネント経由で反映 | globals.css tokens 経由の全機能コンポーネント | — | — |
| 4.2 | ハードコード色は共通トークン参照に修正 | （対象箇所なし。research.mdのgrep調査で確認済み） | — | — |
| 4.3 | FAQ/リンク集の強調要素がピンクで一貫 | announcements/faq/links-page配下の既存コンポーネント（トークン継承のみ） | — | — |
| 5.1, 5.2 | 本文・primary上白文字のコントラストAA相当を確保 | globals.css tokens | — | — |
| 5.3 | 既存レスポンシブ挙動を保持 | Header, Sidebar, AppShell（レイアウト寸法は変更しない） | — | — |
| 5.4 | `messages/` の翻訳文言・キーを変更しない | （対象外。本specのBoundary Commitments参照） | — | — |

## Testing Strategy

- **Visual/Manual Verification**: 実装完了後、CLAUDE.mdの運用ルールに基づき `/kiro:review-impl brand-alignment` を実行し、playwright-mcpで6機能（dashboard, inquiry-form, inquiry-list, announcements, links-page, faq）を日本語・英語の両言語で目視確認する
- **Contrast Check**: `--primary` と `--primary-foreground`、`--foreground` と `--background` の組み合わせについて、コントラスト比がWCAG AA（通常テキストで4.5:1以上）を満たすことを手動計算またはツールで確認する（Requirement 5.1, 5.2）
- **Build Verification**: `npm run lint` / `npm run typecheck` / `npm run build` がエラーなく完了することを確認する（Requirement 1.4, tech.md運用ルール）
- **Regression Check**: バッジ・アラートの既存バリアント（`maintenance`, `status-*`, `urgency-*`, `success`, `destructive`）が新トークン適用後も意味の異なる色として区別できることを目視確認する

## 追加設計: 残存するスレート系デザイントークンの中立グレー化（2026-07-22 追記）

Requirement 6 に対応する。初回のブランド化（本design.md「Design Token Values」節）は `--primary` 系・`--accent` 系・`--foreground` / `--ring` の更新に限定し、その他のトークン（`--secondary`・`--muted`・`--border`・`--input` 等）は明示的に「既存値を維持する」と記載していた。この維持対象のうち、shadcn/ui デフォルト由来のスレート色（hue 210〜215）を持つトークンが `.kiro/steering/brand.md`「やってはいけないこと」に抵触するため、色相・彩度のみを無彩色化する。

### 対象ファイル
- `src/app/globals.css` の `:root` ブロックのみ（1ファイル）。`tailwind.config.ts`・`src/components/**`・`messages/**` は変更しない。

### Design Token Values（中立グレー化）
明度（lightness）は変更前の値をそのまま据え置き、色相を `0`・彩度を `0%` に置き換える。明度据え置きにより、テキスト／背景のコントラスト比は変更前と不変となり、アクセシビリティ回帰は生じない。

| トークン | 現状値（HSL） | 変更後（HSL） | 用途・意図 |
|---|---|---|---|
| `--secondary` | `210 40% 96.1%` | `0 0% 96%` | secondaryボタン・淡色背景。青みを除去 |
| `--muted` | `210 40% 96.1%` | `0 0% 96%` | muted背景（補助エリア）。青みを除去 |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `0 0% 47%` | 補助テキスト。明度47%を据え置きコントラスト維持 |
| `--border` | `214.3 31.8% 91.4%` | `0 0% 91%` | 枠線。brand.md「中立グレー基調」に合わせ青みを除去 |
| `--input` | `214.3 31.8% 91.4%` | `0 0% 91%` | 入力欄の枠線。同上 |
| `--destructive-foreground` | `210 40% 98%` | `0 0% 98%` | destructive上のテキスト（ほぼ白）。青み除去 |
| `--success-foreground` | `210 40% 98%` | `0 0% 98%` | success上のテキスト（ほぼ白）。青み除去 |

**Key Decisions**:
- 明度は据え置く（例: `--muted-foreground` は 46.9% → 47%、`--border`/`--input` は 91.4% → 91%）。丸め誤差の範囲でコントラスト比は変わらない。彩度を 0% にすることで hue 値は視覚的に無効化されるが、可読性・一貫性のため hue も `0` に統一表記する。
- `--destructive`（`0 84.2% 60.2%`, 赤）と `--success`（`142 71% 45%`, 緑）は本追記の対象外。これらは元々ブランドピンク（hue 327）と分離された意味色であり、hue 0（赤）・hue 142（緑）を保持する。`--destructive` の hue は 0 だが彩度が高い赤であり、無彩色化対象の「スレート系」ではない。
- 初回設計の「記載のないトークンは既存値を維持する」という方針は本追記により上書きされる（該当7トークンに限る）。

### 影響範囲（確認観点）
- `--secondary` を参照する箇所: `Button` の `secondary` バリアント、`Badge` の一部バリアント等。塗り色の明度は不変のため見た目は「青みが取れる」以外変化しない。
- `--border` / `--input` を参照する箇所: 全カード枠・フォーム入力枠・区切り線（`* { @apply border-border }` によりほぼ全要素）。中立グレーになるが明度不変。
- `--muted-foreground` を参照する箇所: ヘッダーのサブテキスト・ヒント文（`text-muted-foreground`）等。明度据え置きで可読性維持。

### テスト追加方針
- `npm run lint` / `tsc --noEmit` / `npm run build` がエラーなく完了することを確認する（Requirement 6.4）。
- `globals.css` に対し、hue 210〜215 を持つトークン行が残っていないことを目視／grep（`210 |214|215`）で確認する（Requirement 6.3）。
- playwright-mcp で代表画面（dashboard・inquiry-form・helpdesk-companies）を日本語・英語で開き、枠線・補助テキストの明度が変更前と同等でレイアウト崩れがないことを目視確認する（Requirement 6.2・6.5）。

### Requirements Traceability（2026-07-22 追記分）

| Requirement | Summary | Components | Interfaces |
|-------------|---------|------------|------------|
| 6.1 | スレート系7トークンを hue 0・彩度0% へ | globals.css tokens | CSS変数 |
| 6.2 | 明度据え置きでコントラスト維持 | globals.css tokens | CSS変数 |
| 6.3 | hue 210〜215 のトークンを残さない | globals.css tokens | CSS変数 |
| 6.4 | 変更後もビルド・型・Lintが成功 | globals.css tokens | npm run build |
| 6.5 | 参照コンポーネントの見た目を青み除去以外変えない | 全UI（トークン継承のみ） | — |
