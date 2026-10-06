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
- **重要**: このコマンドはCloud Runへのアプリデプロイのみを行う。`prisma/migrations/`にマイグレーションが追加されている場合、本番Cloud SQL（`portal-mock-backend-db`）への反映は自動化されておらず、**デプロイ前に**手動で`prisma migrate deploy`を流す必要がある（順序: マイグレーション → デプロイ → 必要ならバックフィル）。反映漏れがあると、追加したカラム等が存在せず該当機能が本番でエラー・0件表示になる障害につながる（過去に複数回発生）
</background_information>

<instructions>
## Core Task
1. `git fetch origin main` で最新の`main`を取得する
2. 現在の作業ディレクトリ・カレントブランチには一切手を加えない（未コミットの変更や作業中のブランチを保持したまま進める）。デプロイ用に独立した一時ディレクトリを用意し、そこに`origin/main`をdetached HEADでチェックアウトする
   - 例: `git worktree add <一時ディレクトリ> origin/main --detach`
   - 一時ディレクトリはスクラッチ領域配下（例: `mktemp -d`で払い出したパス、またはセッションのscratchpad配下）に作成する
3. デプロイ**前**に、デプロイ範囲に含まれるコミットで`prisma/migrations/`配下に新規マイグレーションが追加されていないか確認する（例: `git log --oneline -- prisma/migrations`や前回デプロイ済みコミットとの差分）。新規マイグレーションがなければ手順4へ進む。ある場合は、新コードが新しいテーブル・カラムを参照するため、**デプロイより先に**以下を実施する（追加のみのマイグレーションは旧コードとも後方互換のため、先に適用しても稼働中のサービスを壊さない）:
   a. 本番DBへの直接アクセス（`DATABASE_URL`等の秘密情報を扱う）を伴うため、着手前にユーザーへ「マニュアルモードに切り替えてください」と依頼し、切替を確認してから進める。自動モードのままだと分類器にブロックされ続ける
   b. Cloud SQLインスタンス`portal-mock-backend-db`が起動中か確認する（停止中なら`/db-start`を先に実行する）
   c. 本番`DATABASE_URL`を取得する: `gcloud run services describe portal-mock --region asia-northeast1 --format=json > <一時ファイル>` → `jq -r '.spec.template.spec.containers[0].env[] | select(.name=="DATABASE_URL") | .value' <一時ファイル>`。値は`postgresql://user:pass@localhost/db?host=/cloudsql/<connection-name>`というUnixソケット形式になっている
   d. `~/bin/cloud-sql-proxy --unix-socket <一時ディレクトリ> <connection-name>`でローカルにProxyを起動する（バイナリが無ければ`https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/<version>/cloud-sql-proxy.linux.amd64`から取得）
   e. 取得した`DATABASE_URL`の`?host=/cloudsql/...`部分をProxyのソケットディレクトリ（`<一時ディレクトリ>/<connection-name>`）に書き換えたURLを使い、`DATABASE_URL="<書き換え後の値>" npx prisma migrate status`で未適用マイグレーションを確認する
   f. 未適用がある場合のみ`DATABASE_URL="<書き換え後の値>" npx prisma migrate deploy`を実行し、再度`migrate status`で`Database schema is up to date!`になることを確認する
   g. Proxyプロセスを終了し、`DATABASE_URL`（パスワード含む）を書き込んだ一時ファイル・ソケットディレクトリを削除する
4. 対象ブランチ・コミットハッシュ（`git log -1 --oneline`）をユーザーに提示し、本番Cloud Runサービスへのデプロイであることを踏まえて実行前に確認を取ってから進める
5. 承認後、そのディレクトリで `gcloud run deploy portal-mock --source . --region asia-northeast1 --quiet` を実行する
6. デプロイ完了後、`gcloud run services describe portal-mock --region asia-northeast1 --format="value(status.latestReadyRevisionName,status.url)"` 等で反映されたリビジョン・URLを確認し、ユーザーに結果を報告する。ログインして動作確認する場合は、`gcloud run services describe`が表示するURL（`*-an.a.run.app`）ではなく、`AUTH_URL`に固定されているホスト（`https://portal-mock-700069905019.asia-northeast1.run.app`）を使う（別のホストからログインするとリダイレクトでセッションが引き継がれず、ログイン画面に戻される）
7. 翻訳対象のテーブルを追加したデプロイでは、既存データの翻訳が空のため、手順3の接続方法（Proxy＋書き換えた`DATABASE_URL`）で`ANTHROPIC_API_KEY`を環境変数に渡して`npx tsx prisma/backfill-all-translations.ts --table=<対象> --dry-run`で件数を確認してから、`--dry-run`を外して本実行する（冪等。実行前にCloud SQLのオンデマンドバックアップを作成する）。APIキーはSecret Manager（`anthropic-api-key-suenaga-daiso-portal`）から取得し、ファイルには残さない。この手順も本番DBへの書き込みを伴うため、マニュアルモードで行う
8. 一時ディレクトリは `git worktree remove <一時ディレクトリ> --force` で必ず後片付けする（元のリポジトリ・作業中のブランチ状態には影響しない）

## Critical Constraints
- **`release`ブランチには一切触れない**（チェックアウト・マージ・push、いずれも不可）。`main`→`release`の反映は別運用であり、このコマンドの対象外
- 現在の作業ディレクトリのカレントブランチ・未コミットの変更を切り替えたり破棄したりしない。必ず独立した一時ディレクトリ（`git worktree add`等）で作業する
- 本番サービスへの反映となるため、実行前に対象コミットを提示してユーザーの確認を得てから`gcloud run deploy`を実行する（確認を省略しない）
- ビルドは`gcloud run deploy --source .`のCloud Build任せでよく、事前にローカルで`npm run build`等を必須で通す必要はないが、明らかなビルドエラーが疑われる場合は事前確認してもよい
- デプロイが失敗した場合はエラー内容をそのまま報告し、勝手にリトライ内容を変えたり`--set-env-vars`等を追加したりしない
- 新規マイグレーションを含むデプロイでは、本番DBへの`migrate deploy`が完了し`migrate status`で差分なしを確認してから`gcloud run deploy`を実行する（先にデプロイすると、新テーブルを参照する画面が本番でエラーになる）
- 本番DBへの直接アクセスが必要な場面（手順3・7）では、実行前に必ずユーザーへマニュアルモードへの切替を依頼する。自動モードのまま強行しない
</instructions>
