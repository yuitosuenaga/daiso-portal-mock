---
description: mainブランチの内容を現在稼働中のCloud Runサービス（portal-mock）に直接デプロイする（releaseブランチには一切触れない）
allowed-tools: Bash
---

# mainブランチをCloud Runへデプロイ

<background_information>
- 対象サービス: Cloud Run `portal-mock`（プロジェクト `rvp-ai-proto-camp`、リージョン `asia-northeast1`）
- このコマンドは「`main`ブランチの最新内容を、現在動いている`portal-mock`サービスにそのままデプロイする」ことだけを行う
- `release`ブランチは一切関与しない。`release`への`main`のマージ・`release`ブランチのチェックアウト・push等は絶対に行わない（別運用の「デプロイ専用ブランチ」だが、このコマンドの対象外）
- 環境変数（`DATABASE_URL`・`AUTH_SECRET`・`AUTH_TRUST_HOST`・`AUTH_URL`等）やCloud SQL接続設定（`--add-cloudsql-instances`）は前リビジョンから引き継がれるため、変更が不要な限り`--set-env-vars`等のフラグは付けない
</background_information>

<instructions>
## Core Task
1. `git fetch origin main` で最新の`main`を取得する
2. 現在の作業ディレクトリ・カレントブランチには一切手を加えない（未コミットの変更や作業中のブランチを保持したまま進める）。デプロイ用に独立した一時ディレクトリを用意し、そこに`origin/main`をdetached HEADでチェックアウトする
   - 例: `git worktree add <一時ディレクトリ> origin/main --detach`
   - 一時ディレクトリはスクラッチ領域配下（例: `mktemp -d`で払い出したパス、またはセッションのscratchpad配下）に作成する
3. 対象ブランチ・コミットハッシュ（`git log -1 --oneline`）をユーザーに提示し、本番Cloud Runサービスへのデプロイであることを踏まえて実行前に確認を取ってから進める
4. 承認後、そのディレクトリで `gcloud run deploy portal-mock --source . --region asia-northeast1 --quiet` を実行する
5. デプロイ完了後、`gcloud run services describe portal-mock --region asia-northeast1 --format="value(status.latestReadyRevisionName,status.url)"` 等で反映されたリビジョン・URLを確認し、ユーザーに結果を報告する
6. 一時ディレクトリは `git worktree remove <一時ディレクトリ> --force` で必ず後片付けする（元のリポジトリ・作業中のブランチ状態には影響しない）

## Critical Constraints
- **`release`ブランチには一切触れない**（チェックアウト・マージ・push、いずれも不可）。`main`→`release`の反映は別運用であり、このコマンドの対象外
- 現在の作業ディレクトリのカレントブランチ・未コミットの変更を切り替えたり破棄したりしない。必ず独立した一時ディレクトリ（`git worktree add`等）で作業する
- 本番サービスへの反映となるため、実行前に対象コミットを提示してユーザーの確認を得てから`gcloud run deploy`を実行する（確認を省略しない）
- ビルドは`gcloud run deploy --source .`のCloud Build任せでよく、事前にローカルで`npm run build`等を必須で通す必要はないが、明らかなビルドエラーが疑われる場合は事前確認してもよい
- デプロイが失敗した場合はエラー内容をそのまま報告し、勝手にリトライ内容を変えたり`--set-env-vars`等を追加したりしない
</instructions>
