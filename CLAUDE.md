# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

## ブランチ運用

**作業を開始する前に、必ず `main` から新しいブランチを作成する。`main` に直接コミットしない。**

- ブランチ名は、実行するタスク内容を簡潔に表した kebab-case の英語表現にする（例: `add-inquiry-form`, `fix-header-layout`, `update-gitignore`）
- 種別プレフィックスを付ける: `feature/`（新規機能）, `fix/`（修正）, `chore/`（設定・運用系）, `spec/`（`.kiro/specs` 関連作業）
  - 例: `feature/inquiry-form`, `spec/dashboard-tasks`, `chore/setup-gitignore`
- 1タスク = 1ブランチを基本とする。関連の薄い複数タスクを1ブランチに混在させない
- 作業完了後は `main` へマージ（またはPR作成）してからブランチを削除する

## 開発後レビュー（必須）

**`/kiro:spec-impl` による実装が完了したら、必ず `/kiro:review-impl {feature名}` を実行する。**

`/kiro:review-impl` は以下を1コマンドで実施する（詳細は `.claude/commands/kiro/review-impl.md` 参照）:

- 対象ファイルの自動検出（spec.json/tasks.md または `git diff` から）
- レビューエージェントによる静的レビュー（5観点: 正確性・セキュリティ・パフォーマンス・アクセシビリティ・i18n準拠）
- **`playwright-mcp` による実機検証（必須・スキップ不可）**: dev サーバー起動 → `browser_navigate`/`browser_snapshot`/`browser_take_screenshot`/操作系ツールでの動作確認 → `browser_console_messages`/`browser_network_requests` → 日英切り替え確認
- 指摘事項の重要度分類（Critical / High / Medium / Low）と、Critical・High の即時修正

Medium 以下は次のPRサイクルで対応可とする。実装完了後、次の機能開発に進む前に必ず実行すること。
