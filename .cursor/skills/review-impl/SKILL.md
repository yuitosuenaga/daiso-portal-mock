---
name: review-impl
description: Post-implementation review for cc-sdd/Kiro spec features — static analysis (correctness, security, performance, a11y, i18n) plus live browser verification. Use when the user asks for review-impl, /kiro:review-impl, 実装後レビュー, or to review a completed feature/screen after spec-impl.
---

# review-impl（実装後レビュー）

Claude Code の `/kiro:review-impl` と同等。`.cursor/rules/review-impl.mdc` を必ず読んでから実行する。

## 引数

- `{feature}` — `.kiro/specs/{feature}/` がある場合（例: `announcements`）
- ファイルパス — 直接指定された場合
- 未指定 — `git diff --name-only HEAD` / `git status --porcelain` で変更ファイルを検出

## 手順

### 1. コンテキスト読込

- `.kiro/specs/{feature}/spec.json`（`language` フィールド → 報告言語）
- `.kiro/specs/{feature}/tasks.md`（実装対象ファイルの手がかり）
- `.kiro/steering/` 全体
- 対象: `.ts`/`.tsx`/`.js`/`.jsx` のアプリソースのみ（spec・config・lockfile は除外）

### 2. 静的レビュー（5観点）

`.cursor/rules/review-impl.mdc` の観点に従い file:line 付きで指摘を記録:

1. 正確性 2. セキュリティ 3. パフォーマンス 4. アクセシビリティ 5. i18n

必要なら `bugbot` サブエージェント（readonly）で差分レビューを補助する。

### 3. ブラウザ実機検証（必須・スキップ禁止）

dev server が未起動なら `npm run dev` をバックグラウンド起動（`http://localhost:3000`）。

**cursor-ide-browser MCP** を使用:

1. `browser_tabs` action `list` で既存タブ確認
2. `browser_navigate` → 対象画面（`next-intl` のため `/ja/...` と `/en/...` 両方）
3. `browser_lock` → 操作 → `browser_lock` action `unlock`
4. `browser_snapshot` — DOM / aria / フォーカス順
5. `browser_take_screenshot` — デスクトップ幅、その後モバイル幅（`browser_resize` または CDP）
6. `browser_click` / `browser_type` / `browser_press_key` — 主要操作とキーボード操作
7. `browser_cdp` — コンソールエラー（`Runtime.evaluate` 等）
8. 両ロケールでハードコード文言・翻訳欠落・レイアウト崩れを確認

各指摘に `[browser]` タグを付ける。dev server 起動不可の場合は「未検証」と明記（黙ってスキップしない）。

### 4. 統合・修正

- Critical → High → Medium → Low で統合（static / browser 起源を明記）
- **Critical/High は即修正**し、該当チェックを再実行
- Medium/Low は次 PR サイクルとして一覧化

## 出力形式（spec.json.language、未設定時は日本語）

1. **対象**: feature / files
2. **指摘一覧**: 重要度 | file:line | 観点 | 内容 | 起源(static/browser)
3. **対応結果**: Critical/High 修正済み / Medium/Low 次回対応
4. **未検証事項**

## 参照

- ルール: `.cursor/rules/review-impl.mdc`
- 原本: `.claude/commands/kiro/review-impl.md`
- 委譲元: `CLAUDE.md` → 「開発後レビュー（Cursorに委譲）」
