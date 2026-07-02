# ブランドガイドライン（DAISOブランド準拠）

## 目的

本ポータルの利用者は大創産業（DAISO）の海外販社担当者であるため、見た目の第一印象は
「DAISOの社内システムである」と伝わることを最優先とする。以下は下記2点の参照イメージから
抽出したデザイン方針である。

- 現行ポータル（旧イントラ「だんぜん！ダイソー」トップ画面）
- DAISO公式コーポレートサイト（https://www.daiso-sangyo.co.jp/ 相当のトップページ）

新しいUIは公式サイト側の「白背景＋ピンクを効かせたモダンで軽い見せ方」を基調とし、
旧ポータルからは「DAISOピンクを全面に出す」「山型シェブロンロゴ」を継承する。

## カラーパレット

DAISOコーポレートカラーは彩度の高いマゼンタピンク（以下「DAISOピンク」）。
`globals.css` の CSS変数（HSL）としてこの値を `--primary` に採用する。

| トークン | 用途 | 目安値（HSL） | 備考 |
|---|---|---|---|
| `--primary` | ブランドカラー本体。ヘッダー、ロゴ、CTA、アクティブ状態 | `327 90% 45%` (≒ `#e4007f`) | 彩度を落とさない。薄める場合は `--accent` を使う |
| `--primary-foreground` | primary上のテキスト | `0 0% 100%`（白） | |
| `--accent` | 淡ピンクの背景（hover・選択中・タグの薄色版） | `327 85% 96%` | サイドバー選択項目やhover背景に使用 |
| `--accent-foreground` | accent上のテキスト | `327 90% 35%` | primaryより少し暗くしてコントラスト確保 |
| `--foreground` | 本文テキスト | `0 0% 20%` | 純黒は使わず、DAISO公式サイトに合わせた濃グレー |
| `--background` | ページ背景 | `0 0% 100%`（白） | 公式サイトの「白背景中心」を継承。旧ポータルのような全面ダークは避ける |
| `--border` | 枠線 | 中立グレー基調（既存値を維持可） | ピンクの枠線が必要な箇所はコンポーネント側で `border-primary` を明示指定する |
| `--destructive` | エラー・削除等 | 既存の赤系を維持（hue 0） | primaryのピンク（hue 327）と混同しないよう明確に分離する |
| `--success` | 成功・完了 | 既存の緑系を維持 | |
| `--sidebar` | サイドバー背景 | `0 0% 30%`（濃グレー） | 旧ポータルのダークグレーサイドバーを継承。ページ本体（`--background`）は白のまま |
| `--sidebar-foreground` | sidebar上のテキスト・アイコン | `0 0% 92%`（淡グレー・白系） | 濃グレー背景に対して十分なコントラストを確保する |

**やってはいけないこと**: 汎用shadcn/uiのデフォルト配色（青系・スレート系）をprimaryとして残さない。
警告色・エラー色以外の強調表現は原則DAISOピンクに統一する。

## ロゴ・シンボル

- DAISOのシンボルは「上向きに積み重なった山型（シェブロン）マーク」。ワードマーク「DAISO」
  または日本語「ダイソー」と組み合わせて使用する。
- ヘッダー（`Header.tsx`）にはこのロゴ（または簡易テキストロゴ「DAISO」）を配置し、
  現状の汎用タイトルテキストのみの状態から置き換える。
- ロゴの配色は白背景上ではピンク、ピンク背景上では白（反転）を基本とする。

## タイポグラフィ

- 既存の `Noto_Sans_JP` / `Noto_Sans`（`next/font/google`）をそのまま使用する。追加のWebフォント導入は不要。
- 見出し・強調文言は太字（`font-bold` / `font-semibold`）を基本とし、公式サイトのように
  タイトル語だけをDAISOピンクで着色する表現（`text-primary`）を許容する。
- 本文は濃グレー（`--foreground`）、純黒指定は避ける。

## UIパターン（公式サイトから抽出）

DAISO公式サイトのUIモチーフを、既存の shadcn/ui ベースコンポーネント（`src/components/ui/`）に
落とし込む際の対応方針:

| 公式サイトのモチーフ | 対応コンポーネント | 実装方針 |
|---|---|---|
| 重要なお知らせバー（ピンク地・白文字の帯） | `Alert`（announcements等） | `bg-primary text-primary-foreground` のバリアントを追加 |
| タブ（アクティブ=ピンク塗り白文字／非アクティブ=白地ピンク枠ピンク文字） | タブ・カテゴリ切替UI（links-page, faq） | アクティブ状態は塗り、非アクティブは `border-primary text-primary` のアウトライン |
| NEWSタグのような塗りバッジ | `Badge` | ピンク塗り・白文字の小型バッジをdefault variantとして使う |
| 白地・ピンク枠のCTAボタン（hoverで塗りに反転想定） | `Button`（outline variant） | `border-primary text-primary` → hoverで `bg-primary text-primary-foreground` |
| 細いボーダーで区切られたカード、強い影は使わない | `Card` | 影は最小限、`border` を基調にした軽い見せ方を維持 |

旧ポータル（現行イントラ）由来で残すもの:

- サイドバーのアクティブ項目のピンク強調（`Sidebar.tsx` の `isActive` 状態に `bg-primary text-primary-foreground` 相当を適用）
- サイドバー全体の背景色は濃グレー（`bg-sidebar` / `--sidebar`）。ページ本体・カードは白背景のままとし、サイドバーだけ旧ポータルのダークトーンを継承する
- ヘッダー右上にログイン中ユーザー情報や言語切替を置くレイアウト構造（`LanguageSwitcher` の配置はこのまま活かす）

## 適用範囲

この配色・トークン変更は `tailwind.config.ts` の色定義および `globals.css` のCSS変数を
起点とし、`src/components/ui/`（共通UI）→ `src/components/layout/`（Header/Sidebar）→
各 `src/components/features/*` の順で反映する。個別ページで色をハードコードせず、
必ずCSS変数経由のTailwindユーティリティ（`bg-primary` 等）を使うこと。
