---
description: Cloud SQLインスタンス（portal-mock-backend-db）を始業時に起動する
allowed-tools: Bash
---

# Cloud SQL 始業時起動

<background_information>
- 対象: Cloud SQL for PostgreSQLインスタンス `portal-mock-backend-db`（プロジェクト `rvp-ai-proto-camp`、リージョン `asia-northeast1`）
- 目的: 作業を開始する際にインスタンスを起動し、DB接続できる状態にする
- **重要（2026-07-13変更）**: 検証用サービス`portal-mock-backend`は廃止され、公開サービス`portal-mock`がこのインスタンスに直結する本番DBとして利用している。このインスタンスが停止していると`portal-mock`（公開中のサービス）自体が利用できなくなる
- 起動・停止は完全手動運用（自動スケジュールは設けていない）。ユーザーがこのコマンドを実行した時点を「始業」とみなす
</background_information>

<instructions>
## Core Task
1. `gcloud sql instances describe portal-mock-backend-db --format="value(settings.activationPolicy,state)"` で現在の状態を確認する
2. 既に稼働中（`activationPolicy: ALWAYS`かつ`state: RUNNABLE`）であれば、その旨を伝えて終了する
3. 停止中であれば `gcloud sql instances patch portal-mock-backend-db --activation-policy=ALWAYS --quiet` を実行してインスタンスを起動する
4. 起動完了まで待ち（`state`が`RUNNABLE`になるまで`describe`をポーリング）、ユーザーに結果を報告する

## Critical Constraints
- このコマンドの実行自体がユーザーの明示的な指示であるため、実行前の追加確認は不要
- 起動直後はDB接続の確立に数十秒かかる場合がある旨を必要に応じて伝える
</instructions>
