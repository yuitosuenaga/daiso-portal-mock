---
description: Review implemented feature files (static review + playwright-mcp live verification)
allowed-tools: Bash, Glob, Grep, Read, LS, Agent, Edit, mcp__playwright__browser_navigate, mcp__playwright__browser_navigate_back, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_press_key, mcp__playwright__browser_hover, mcp__playwright__browser_select_option, mcp__playwright__browser_console_messages, mcp__playwright__browser_network_requests, mcp__playwright__browser_wait_for, mcp__playwright__browser_resize, mcp__playwright__browser_close
argument-hint: [feature-name] [file-paths...]
---

# Post-Implementation Review (Static + Playwright Live Verification)

<background_information>
- **Mission**: Run the mandatory post-implementation review defined in `CLAUDE.md`（開発後レビュー）in one command, so the 5 review perspectives and the playwright-mcp live-verification checklist never need to be re-typed.
- **Success Criteria**:
  - All 5 review perspectives covered: Correctness / Security / Performance / Accessibility / i18n
  - Live browser verification actually performed via `playwright-mcp` (not skipped)
  - Findings classified by severity (Critical/High/Medium/Low)
  - Critical/High findings fixed before returning
</background_information>

<instructions>
## Core Task
Review the implementation of feature **$1** (or the explicitly given file paths in `$2...`) using both static analysis and live browser verification.

## Execution Steps

### Step 1: Determine Review Target

**If `$1` looks like a feature name and matches `.kiro/specs/$1/`**:
- Read `.kiro/specs/$1/spec.json`, `tasks.md` to find implemented file paths (from recent `/kiro:spec-impl $1` history or task descriptions)
- Read `.kiro/specs/$1/spec.json` for `language` (report output language)

**Otherwise (no args, or args are file paths)**:
- Use `git diff --name-only HEAD` / `git status --porcelain` to detect changed files since last commit
- Treat `$@` as an explicit file path list if provided

Build the final **target file list** (only `.ts`/`.tsx`/`.js`/`.jsx` app source files — skip specs, config, lockfiles).

### Step 2: Static Review

Launch a subagent (Agent tool, `subagent_type: "general-purpose"` unless a dedicated code-reviewing agent type is available) with the target file list and this exact review rubric, asking it to report findings classified by severity with file:line references:

1. **正確性 (Correctness)**: TypeScript型の整合性（`any`・不適切な型アサーション）、ロジックバグ・エッジケース、Next.js App Routerの制約違反（Server/Client Component誤用）、非同期処理（未`await`・エラーハンドリング漏れ）
2. **セキュリティ (Security)**: XSS（`dangerouslySetInnerHTML`・未サニタイズ出力）、入力バリデーション欠如、環境変数・シークレットのクライアント露出、外部URL依存・オープンリダイレクト
3. **パフォーマンス (Performance)**: 不要な`"use client"`、不要な再レンダリング（依存配列誤り・過剰なuseState）、バンドルサイズへの影響
4. **アクセシビリティ (Accessibility)**: `aria-*`/`role`、キーボード操作・フォーカス管理、`alt`テキスト
5. **i18n準拠**: JSX内ハードコード文言、`ja.json`/`en.json`のキー網羅性、日付・数値のロケール依存処理

### Step 3: Live Verification with playwright-mcp

Start the dev server if it is not already running (`npm run dev`, default `http://localhost:3000`, background process). Then, for each screen touched by the target files:

- `browser_navigate` to the screen (use both `/ja/...` and `/en/...` if the route is localized — this project uses `next-intl` with `src/app/[locale]/`)
- `browser_snapshot` — inspect DOM structure, `aria-*` attributes, focus order (Accessibility)
- `browser_take_screenshot` — check layout/visual regressions, and again after `browser_resize` to a mobile width for responsive check
- `browser_click` / `browser_type` / `browser_press_key` — exercise the actual interactions and keyboard navigation
- `browser_console_messages` — check for JS errors/warnings (Correctness)
- `browser_network_requests` — check for unexpected external calls or exposed secrets (Security)
- Repeat navigation in the other locale — compare hardcoded text / missing translation keys / broken layout from longer strings (i18n)

Record every issue found this way as a finding with the same severity scale as Step 2, tagged `[playwright]`.

### Step 4: Merge & Fix

- Merge static-review findings and playwright findings into one list, sorted by severity (Critical → High → Medium → Low)
- **Critical/High**: fix immediately (Edit), then re-verify the specific check that failed (re-run the relevant playwright step or re-read the fixed code)
- **Medium/Low**: leave as-is, list them for the next PR cycle

## Critical Constraints
- Do not skip Step 3 — a review without live playwright verification does not satisfy `CLAUDE.md`'s review requirement
- Do not report success while Critical/High findings remain unfixed
- Close any browser tabs/state you opened (`browser_close`) when done, unless the user is actively continuing to use the browser
</instructions>

## Output Description

Provide output in the language specified in spec.json (fallback: Japanese):

1. **対象**: reviewed feature/files
2. **指摘一覧**: severity別に分類したリスト（file:line, 観点, 内容）— static / playwright 起源を明記
3. **対応結果**: Critical/High は修正済みである旨、Medium/Low は次PRサイクル対応である旨
4. **未検証事項**: dev server起動不可・特定画面に到達不可などでplaywright検証を実施できなかった箇所があれば明記

**Format**: Concise, use a table for findings if there are more than a few.

## Safety & Fallback

### Error Scenarios
- **Dev server fails to start**: report the error, skip Step 3 for the affected routes, and explicitly flag "playwright live verification not performed" in the output — never silently skip it
- **No target files detected**: ask the user to specify a feature name or file paths
- **Route requires auth/data not available in mock**: note as "未検証" rather than guessing a pass

### Next Steps Guidance
- Run this immediately after `/kiro:spec-impl {feature}` completes, before starting the next feature
- Re-run `/kiro:review-impl {feature}` after fixing Critical/High findings to confirm resolution
