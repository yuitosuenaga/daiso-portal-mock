---
name: validate-design
description: Interactive technical design quality review for a cc-sdd/Kiro spec feature before implementation. Use when the user asks for validate-design, /kiro:validate-design, or design review GO/NO-GO.
---

# validate-design（設計レビュー）

Claude Code の `/kiro:validate-design` と同等。`.claude/commands/kiro/validate-design.md` を参照。

## 引数

- `{feature}` — 対象機能名（例: `announcements`）

## 手順

### 1. コンテキスト読込

- `.kiro/specs/{feature}/spec.json`
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/design.md`
- `.kiro/settings/rules/design-review.md`（レビュー基準）
- `.kiro/steering/` 全体

`design.md` が無い場合は停止し「先に spec-design を実行してください」と伝える。

### 2. 設計レビュー

`design-review.md` のプロセスに従う:

- 分析 → **Critical Issues（最大3件）** → 強み → GO/NO-GO
- 完璧主義ではなく許容可能なリスクは GO 可
- 対話的に不明点があればユーザーに確認

### 3. 判定

- **GO**: 実装（spec-tasks / spec-impl）に進める
- **NO-GO**: Critical Issues を修正後、design を更新して再レビュー

## 出力形式（spec.json.language、未設定時は日本語）

1. **Review Summary**: 2–3文
2. **Critical Issues**: 最大3件
3. **Design Strengths**: 1–2点
4. **Final Assessment**: GO/NO-GO と次ステップ

## 参照

- `.claude/commands/kiro/validate-design.md`
- `.kiro/settings/rules/design-review.md`
