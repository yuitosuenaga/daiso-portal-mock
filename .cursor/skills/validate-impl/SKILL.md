---
name: validate-impl
description: Validate implementation against approved requirements, design, and tasks for a cc-sdd/Kiro spec feature. Use when the user asks for validate-impl, /kiro:validate-impl, 実装検証, or GO/NO-GO after spec-impl.
---

# validate-impl（実装検証）

Claude Code の `/kiro:validate-impl` と同等。`.claude/commands/kiro/validate-impl.md` を参照。

## 引数

- `{feature}` — 検証対象機能名（例: `announcements`）
- `{task-numbers}` — 任意（例: `9.1,9.2`）。未指定時は `[x]` 完了タスクを検証

## 手順

### 1. コンテキスト読込

- `.kiro/specs/{feature}/spec.json`
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/design.md`
- `.kiro/specs/{feature}/tasks.md`
- `.kiro/steering/` 全体

### 2. タスクごとに検証

| チェック | 内容 |
|---|---|
| タスク完了 | `tasks.md` で `[x]` になっているか |
| テスト | 関連テスト存在・パス（`npx vitest related` → 完了時 `npm run test`） |
| 要件トレーサビリティ | EARS 要件が実装でカバーされているか（Grep で根拠確認） |
| 設計整合 | `design.md` のコンポーネント・ファイル構成が存在するか |
| リグレッション | 全テストスイートが通るか |

### 3. 判定

- **GO**: タスク完了・テスト通過・要件トレース可能・重大な設計乖離なし
- **NO-GO**: 上記いずれか未達。Critical として列挙し修正手順を提示

## 出力形式（spec.json.language、未設定時は日本語）

1. **検証対象**: feature / tasks
2. **サマリー**: pass/fail 件数
3. **Issues**: 重要度付き一覧
4. **カバレッジ**: 要件・設計・タスクのカバー状況
5. **判定**: GO / NO-GO と次のアクション

## 参照

- `.claude/commands/kiro/validate-impl.md`
