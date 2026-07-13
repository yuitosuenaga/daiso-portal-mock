---
description: Cloud SQLインスタンス（portal-mock-backend-db）を終業時に停止し、課金を止める
allowed-tools: Bash
---

# Cloud SQL 終業時停止

<background_information>
- 対象: Cloud SQL for PostgreSQLインスタンス `portal-mock-backend-db`（プロジェクト `rvp-ai-proto-camp`、リージョン `asia-northeast1`）
- 目的: 平日の作業時間外は課金を止めるため、このコマンドの実行時点でインスタンスを停止する
- **重要（2026-07-13変更）**: 検証用サービス`portal-mock-backend`は廃止され、公開サービス`portal-mock`がこのインスタンスに直結する本番DBとして利用している。**このコマンドを実行すると、公開中の`portal-mock`自体がDB接続エラーで使えなくなる**。運用方針（常時起動に切り替えるか、引き続き手動起動・停止で運用するか）は2026-07-13時点で未確定・要相談のため、実行前に必ずユーザーへその旨を伝える
- 起動・停止は完全手動運用（自動スケジュールは設けていない）。ユーザーがこのコマンドを実行した時点を「終業」とみなす
</background_information>

<instructions>
## Core Task
1. `gcloud sql instances describe portal-mock-backend-db --format="value(settings.activationPolicy,state)"` で現在の状態を確認する
2. 既に停止済み（`activationPolicy: NEVER`）であれば、その旨を伝えて終了する
3. 稼働中であれば、停止すると公開サービス`portal-mock`が使えなくなる旨をユーザーに伝えて確認を取ってから、`gcloud sql instances patch portal-mock-backend-db --activation-policy=NEVER --quiet` を実行してインスタンスを停止する
4. 停止処理の完了後、再度 `describe` で状態を確認し、ユーザーに結果を報告する

## Critical Constraints
- インスタンスの削除・データ削除は行わない（あくまで停止のみ）
- 公開サービスへの影響があるため、実行前に一言確認を挟む（他のコマンドと異なり無条件実行不可）
</instructions>
