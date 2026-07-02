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
