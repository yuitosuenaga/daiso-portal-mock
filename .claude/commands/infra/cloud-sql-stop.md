---
description: 検証用Cloud SQLインスタンス（portal-mock-backend-db）を終業時に停止し、課金を止める
allowed-tools: Bash
---

# Cloud SQL 終業時停止

<background_information>
- 対象: Cloud SQL for PostgreSQLインスタンス `portal-mock-backend-db`（プロジェクト `rvp-ai-proto-camp`、リージョン `asia-northeast1`）
- 目的: 平日の作業時間外は課金を止めるため、このコマンドの実行時点でインスタンスを停止する
- 起動・停止は完全手動運用（自動スケジュールは設けていない）。ユーザーがこのコマンドを実行した時点を「終業」とみなす
</background_information>

<instructions>
## Core Task
1. `gcloud sql instances describe portal-mock-backend-db --format="value(settings.activationPolicy,state)"` で現在の状態を確認する
2. 既に停止済み（`activationPolicy: NEVER`）であれば、その旨を伝えて終了する
3. 稼働中であれば `gcloud sql instances patch portal-mock-backend-db --activation-policy=NEVER --quiet` を実行してインスタンスを停止する
4. 停止処理の完了後、再度 `describe` で状態を確認し、ユーザーに結果を報告する

## Critical Constraints
- インスタンスの削除・データ削除は行わない（あくまで停止のみ）
- このコマンドの実行自体がユーザーの明示的な指示であるため、実行前の追加確認は不要
</instructions>
