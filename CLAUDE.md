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

### Spec の粒度・重複防止（重要）

**1つの画面（1ルート/1トップページ）につき、spec は1つに保つ。同じ画面への追加要望・改修は、新規specを作らず既存specへの要件追記として扱う。**

- 新しいspecを作る前に、`.kiro/specs/` に対象と同じ画面（同じルート・同じ画面）を扱う既存specがないか確認する
- 既存specが見つかった場合は、そのspecの `requirements.md` に要件を追記し、`spec.json` の `design`/`tasks` の `approved` を追記内容に応じて `false` に戻してから設計・タスクを更新する（新規specは作らない）
- 既存specが `implementation-complete` であっても、同じ画面への追加要望であれば新規specを作らず、そのspecを再利用・拡張する
- 例外: 明確に別ルート・別ユーザー種別（申請者側 vs ヘルプデスク側など）を対象とする画面は、同じデータドメインを扱っていても別specとして問題ない（例: `announcements`＝申請者側の閲覧画面と `announcements-management`＝ヘルプデスク側の管理画面は、別画面のため別spec）

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

**作業を開始する前に、毎回必ずワークツリー（`EnterWorktree`）を新規作成し、`main` から新しいブランチを切ってから進める。`main` に直接コミットしない。**

- どんなに小さな作業（ドキュメント修正・設定変更等）であっても、作業開始時に必ずワークツリー＋ブランチを切ることを省略しない
- タスクごとに毎回新しいワークツリーを作成する。既存のワークツリーを使い回して無関係な複数タスクを混在させない
- ブランチ名は、実行するタスク内容を簡潔に表した kebab-case の英語表現にする（例: `add-inquiry-form`, `fix-header-layout`, `update-gitignore`）
- 種別プレフィックスを付ける: `feature/`（新規機能）, `fix/`（修正）, `chore/`（設定・運用系）, `spec/`（`.kiro/specs` 関連作業）
  - 例: `feature/inquiry-form`, `spec/dashboard-tasks`, `chore/setup-gitignore`
- 1タスク = 1ブランチを基本とする。関連の薄い複数タスクを1ブランチに混在させない
- 作業完了後は `main` へマージ（またはPR作成）してからブランチを削除する
- **例外（レビュー待ちのマージ）**: 機能実装（`/kiro:spec-impl`等によるコード変更）の場合、PR作成後は「開発後レビュー」節に定めるレビュー（Critical/High指摘への対応を含む）が完了するまでマージしない。詳細は「開発後レビュー」節を参照

### release ブランチ（デプロイ専用）

**`release` ブランチはデプロイ用であり、`main` を各機能ブランチの統合先として使う運用に変わりはない。`release` は「`main` の内容をデプロイのタイミングで取り込む」時にしか触らない。**

- 通常の開発作業（機能追加・修正・spec作業）は今までと同様、`main` から新しいブランチを切り、`main` へマージする。`release` から直接ブランチを切らない
- `release` に直接コミットしない。更新は「デプロイする」タイミングで `main` を `release` にマージする操作のみ
- `main` → `release` へのマージ（デプロイ操作）は、ユーザーから明示的に指示された場合にのみ実行する
- 誤って `release` 上で作業を始めてしまった場合は、変更を正しいブランチ（`main` から切った新規ブランチ）に移してから `release` を `main` と同じ状態に戻す

## 開発後レビュー（別エージェントによるレビュー）

**`/kiro:spec-impl` による実装が完了したら、Claude Code は必ず別エージェント（Agent toolによるsubagent、通常は `/kiro:review-impl` 経由）を立てて実装後レビューを実施する。実装した本人と同じ文脈でレビューを済ませたことにしない。**

- 実装完了後、Claude Codeは `/kiro:review-impl {feature名または対象ファイル}` を実行し、以下を行う:
  - 静的レビュー用の別subagentを立てて、正確性・セキュリティ・パフォーマンス・アクセシビリティ・i18n準拠の5観点をfile:line付きで指摘させる
  - playwright-mcpによるブラウザでの実機検証（対象画面のライブ確認、日本語・英語両方、レスポンシブ確認）を行う
  - Critical/High の指摘は即時修正し、修正箇所を再検証する。Medium/Low は次PRサイクルへの申し送りとして記録する
- レビュー結果（指摘一覧・対応結果）を `spec.json` の該当タスク/フェーズの状態更新とあわせてユーザーに報告する
- 詳細な実行手順は `.claude/commands/kiro/review-impl.md` を参照する

**マージのタイミング（重要）**: 機能実装のPRは、上記レビュー（Critical/High指摘への対応を含む）が完了するまでマージしない。ユーザーから「マージまで進めて」等の指示があっても、レビューが未完了の場合はPR作成までで一旦止め、レビューを実施してから進める。
- 例外: CLAUDE.md更新やspecドキュメントのみの変更など、レビュー観点（正確性・セキュリティ・パフォーマンス・アクセシビリティ・i18n準拠の実装コードレビュー）が本来対象としない、コード実装を伴わない変更はこの制約の対象外とする

## Spec管理ルール（1画面 = 1spec）

**画面（screen）ごとにspecは1つだけ存在させる。同じ画面に対する変更を、新しいspec名を作って追加してはいけない。**

- 新しい機能・改善に着手する前に、対象となる画面が既存のspecで管理されていないか、必ず `.kiro/specs/` 配下の各spec（特に `requirements.md` の「スコープ境界」「対象」記述）を確認する。`.kiro/steering/product.md` の機能一覧も手がかりにする。
- 対象画面を所有する既存specが見つかった場合:
  - `/kiro:spec-init` で新規specディレクトリを作らない
  - 既存specの `requirements.md` に要件を追記し（変更内容が分かるよう追加日を明記する）、`design.md`・`tasks.md` も同様に更新する
  - `spec.json` の該当フェーズ以降の `approved` を `false` に戻し、再度承認フローに乗せる（例: 要件追加時は `phase: "requirements-generated"`、`approvals.design`/`approvals.tasks` を `generated: false, approved: false` に戻す）
  - 既存の実装済み部分は保持したまま、追加要件分だけ設計・タスクを積み増す
- 新規specを作成してよいのは、既存specが存在しない「まったく新しい画面」を追加する場合のみ
- 誤って新しいspecディレクトリを作成してしまったことに気づいた場合は、その場で削除し、正しい既存specへ内容を統合する
