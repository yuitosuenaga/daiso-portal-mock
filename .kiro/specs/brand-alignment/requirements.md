# Requirements Document

## Project Description (Input)
DAISOブランドガイドライン（.kiro/steering/brand.md）に基づき、全体のデザイントークン・共通UIコンポーネント・ヘッダー/サイドバーのレイアウトをDAISOブランドカラー・ロゴに刷新する。新機能追加ではなく既存実装への横断的なデザイン反映タスク。

## Introduction
本specは、大創産業（DAISO）社内ポータルのモックアップに対して、DAISOブランドガイドライン
（`.kiro/steering/brand.md`）で定義したカラー・ロゴ・UIパターンを適用し、利用者（海外販社担当者）が
一目で「DAISOの社内システムである」と認識できる見た目に刷新することを目的とする。
機能追加は行わず、既存の全ページ・全共通コンポーネントに対する横断的なビジュアル刷新のみを扱う。

## Boundary Context (Optional)
- **In scope**: `tailwind.config.ts` / `globals.css` のデザイントークン変更、`src/components/ui/` の共通UIコンポーネント、`src/components/layout/`（Header・Sidebar・AppShell）、既存6機能（dashboard, inquiry-form, inquiry-list, announcements, links-page, faq）の画面がブランドトークン変更を正しく反映していることの確認
- **Out of scope**: 新規機能・新規ページの追加、データモデル（`types/`）や `lib/api/` のモックAPIロジックの変更、多言語文言（`messages/`）の追加・変更、フェーズ3以降のバックエンド実装
- **Adjacent expectations**: 各機能specの `design.md` に記載された機能要件・データ構造は変更しない。あくまで見た目（配色・ロゴ・タイポグラフィ・コンポーネントの見せ方）のみを変更する

## Requirements

### Requirement 1: デザイントークンのDAISOブランド化
**Objective:** As a ポータル利用者, I want 画面全体の配色がDAISOのブランドカラーで統一されている, so that このシステムがDAISOの公式な業務システムであると一目で認識できる

#### Acceptance Criteria
1. The デザイントークン定義（`globals.css` の CSS変数、`tailwind.config.ts`）shall `.kiro/steering/brand.md` に定義された `--primary` / `--primary-foreground` / `--accent` / `--accent-foreground` / `--foreground` の値をDAISOピンク基調の値に更新する
2. The デザイントークン定義 shall `--destructive` と `--success` の色相を `--primary`（DAISOピンク）の色相と明確に区別された値のまま保持する
3. Where 画面上に強調表示・アクティブ状態・CTAが存在する, the 該当コンポーネント shall 個別に色をハードコードせず、Tailwindのセマンティックカラークラス（例: `bg-primary`, `text-primary`）経由で配色する
4. When デザイントークン変更後にビルド（`npm run build`）を実行する, the ビルドプロセス shall エラーなく完了する

### Requirement 2: 共通UIコンポーネントのブランド適用
**Objective:** As a 開発者, I want 共通UIコンポーネント（Button, Badge, Alert, Card等）がDAISOブランドのUIパターンに沿っている, so that 各機能ページで一貫したブランド表現を再利用できる

#### Acceptance Criteria
1. The `Button` コンポーネント（`src/components/ui/button.tsx`）shall primaryバリアントにおいてDAISOピンクを塗り色として使用する
2. Where アウトラインボタンが使用される, the `Button` コンポーネント shall ピンクの枠線・ピンク文字で表示し、hover時に塗り（DAISOピンク背景・白文字）へ反転する
3. The `Badge` コンポーネント（`src/components/ui/badge.tsx`）shall defaultバリアントにおいてDAISOピンク塗り・白文字のタグ表現を提供する
4. The `Alert` コンポーネント（`src/components/ui/alert.tsx`）shall 重要通知用のバリアントとしてDAISOピンク地・白文字の帯表現を提供する
5. The `Card` コンポーネント（`src/components/ui/card.tsx`）shall 強い影を持たず、薄いボーダーを基調とした見た目を維持する

### Requirement 3: ヘッダー・サイドバーのブランド表現
**Objective:** As a ポータル利用者, I want ヘッダーとサイドバーにDAISOのロゴとブランドカラーが表示されている, so that どの画面からもDAISOのポータルであることが分かる

#### Acceptance Criteria
1. The `Header` コンポーネント（`src/components/layout/Header.tsx`）shall DAISOのロゴ（ワードマークまたはシェブロンマークを含む表現）を表示する
2. The `Sidebar` コンポーネント（`src/components/layout/Sidebar.tsx`）shall 現在アクティブなナビゲーション項目をDAISOピンクの背景・白文字（またはそれに準ずる強調表現）で表示する
3. While ナビゲーション項目がアクティブではない, the `Sidebar` コンポーネント shall hover時にDAISOピンクの薄色背景（`--accent`）で反応する
4. The `LanguageSwitcher` コンポーネント shall 既存の配置・機能を変更せず、新しい配色トークンの上でも視認性を保つ

### Requirement 4: 既存機能ページ全体への一貫した反映
**Objective:** As a ポータル利用者, I want どの機能ページを開いてもデザインの一貫性が保たれている, so that ページ間で見た目のトーンが分断されずに使い続けられる

#### Acceptance Criteria
1. The dashboard, inquiry-form, inquiry-list, announcements, links-page, faq の各画面 shall Requirement 1・2で更新した共通トークン・共通コンポーネントを経由して配色を反映する
2. If 機能固有のコンポーネントが独自に色をハードコードしている, then 当該コンポーネント shall 共通デザイントークン（`bg-primary` 等のセマンティッククラス）を参照する実装に修正する
3. Where FAQのカテゴリ別アコーディオンやリンク集のカテゴリ表示のように強調要素が存在する, the 該当UI shall DAISOピンクを用いた一貫したアクセント表現を用いる

### Requirement 5: アクセシビリティと表示品質の維持
**Objective:** As a ポータル利用者（多言語環境下の海外販社担当者を含む）, I want 配色変更後も文字が読みやすく操作性が損なわれない, so that 業務利用に支障が出ない

#### Acceptance Criteria
1. The 更新後の配色 shall 本文テキストと背景の間でWCAG AA相当のコントラスト比を確保する
2. The 更新後の配色 shall primaryカラー（DAISOピンク）上の白文字についてもWCAG AA相当のコントラスト比を確保する
3. While 画面の表示言語が日本語または英語のいずれかである, the ブランド刷新後のレイアウト shall 既存のレスポンシブ挙動（PC中心、タブレット幅で崩れない）を保持する
4. The ブランド刷新作業 shall `messages/` 配下の翻訳キー・翻訳文言を変更しない

---

### 追記（2026-07-22）: 残存するスレート系デザイントークンの中立グレー化

2026-07-21 実施のプロダクト全体レビューにより、`globals.css` の `:root` に、shadcn/ui のデフォルト由来である青みがかったスレート色（色相 hue 210〜215）を持つトークンが複数残存していることが判明した。初回のブランド化（Requirement 1）は `--primary` / `--accent` / `--foreground` / `--ring` の更新に限定され、design.md の「Design Token Values」節で `--secondary` / `--muted` / `--border` / `--input` 等は「既存値を維持する」と明記していたため、これらのスレート色が意図せず残った。`.kiro/steering/brand.md`「やってはいけないこと」節（汎用shadcn/uiのデフォルト配色〈青系・スレート系〉を残さない）に反する状態であるため、本specへの追記として是正する。

本追記は既存の Requirement 1〜5 の実装成果を変更せず、`globals.css` の該当トークンの色相・彩度のみを中立化する（明度は据え置き、コントラスト比を変えない）横断的なトークン修正である。

スコープ:
- **対象トークン（`globals.css` の `:root`）**: `--secondary`（現 `210 40% 96.1%`）、`--muted`（現 `210 40% 96.1%`）、`--muted-foreground`（現 `215.4 16.3% 46.9%`）、`--border`（現 `214.3 31.8% 91.4%`）、`--input`（現 `214.3 31.8% 91.4%`）、`--destructive-foreground`（現 `210 40% 98%`）、`--success-foreground`（現 `210 40% 98%`）
- **対象外**: 既にブランド化・中立化済みのトークン（`--primary` / `--accent` / `--foreground` / `--background` / `--card` / `--sidebar` / `--ring`）、赤系を保つ `--destructive`（hue 0）、緑系を保つ `--success`（hue 142）、`--radius`。`tailwind.config.ts`・各コンポーネント・`messages/` は変更しない

### Requirement 6: 残存するスレート系デザイントークンの中立グレー化
**Objective:** As a ポータル利用者, I want 枠線・淡色背景・補助テキスト等の無彩色であるべき箇所に青みが残らず中立的なグレーで表示される, so that 画面全体が一貫してDAISOブランド（ピンク＋無彩色）の印象になり、汎用テンプレート然とした青みが混ざらない

#### Acceptance Criteria
1. The デザイントークン定義（`globals.css` の `:root`）shall `--secondary` / `--muted` / `--muted-foreground` / `--border` / `--input` / `--destructive-foreground` / `--success-foreground` の各値について、色相（hue）を `0`・彩度（saturation）を `0%` の無彩色（中立グレー）へ変更する。
2. The 中立グレー化した各トークン shall 変更前の明度（lightness）を維持し、本文・補助テキストと背景のコントラスト比を変更前と同等（`--muted-foreground` は明度約47%を据え置き、WCAG AA相当を維持）に保つ。
3. The 是正後の `globals.css` shall 色相 210〜215（スレート系）を持つトークンを `:root` に残さない（`--destructive` の hue 0〈赤〉・`--success` の hue 142〈緑〉・`--primary`/`--accent` の hue 327〈ピンク〉は本要件の対象外として保持する）。
4. When トークン変更後にビルド（`npm run build`）・型チェック・Lintを実行する, the ビルドプロセス shall エラーなく完了する。
5. The 本追記の作業 shall `--secondary` 等を参照する既存コンポーネント（`Button` の secondary/outline、`Badge`、`Card`、フォーム入力の枠線等）の見た目を、青みの除去以外の点で変化させない（明度・レイアウト・使用箇所は不変とする）。
