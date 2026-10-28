# 現行 GCP 環境（rvp-ai-proto-camp）portal-mock の実測値

> 2026-10-23 時点のスナップショット。memory は 2026-10-28 に Terraform の設定値を 1Gi へ変更した(`docs/infra/runbook.md` §3.1.1)。現状は `docs/infra/runbook.md` §0.1 と `docs/infra/pre-client-env-work.md` を参照する(本文は更新していない)。

取得日: 2026-10-23（gcloud 読み取りのみ）。機密値（`DATABASE_URL` / `AUTH_SECRET` の値）は記録しない。

## Cloud Run `portal-mock`（asia-northeast1）

| 項目 | 値 |
|---|---|
| 実行SA | `700069905019-compute@developer.gserviceaccount.com`（デフォルト compute SA） |
| cpu / memory | 1 / 512Mi（request-based billing、cpu_idle） |
| concurrency / timeout | 80 / 300s |
| startup-cpu-boost | true |
| scaling | revision の maxScale=1（minScale 未指定=0）。サービス単位の maxScale 注釈は 100 |
| ingress | all |
| コンテナポート | 8080（startupProbe は TCP 8080、デフォルト） |
| Cloud SQL 接続 | 注釈 `run.googleapis.com/cloudsql-instances` = `rvp-ai-proto-camp:asia-northeast1:portal-mock-backend-db` |
| イメージ | Artifact Registry `asia-northeast1-docker.pkg.dev/rvp-ai-proto-camp/cloud-run-source-deploy/portal-mock@sha256:...`（`--source` デプロイ。Terraform は ignore_changes） |
| 公開URL / AUTH_URL | `https://portal-mock-700069905019.asia-northeast1.run.app`（決定的URL。envs のデフォルト算出値と一致） |
| IAM | `allUsers` に `roles/run.invoker` のみ |
| 最新 revision | portal-mock-00031-2r7（generation 31） |

### 環境変数（名前と種別のみ）

| 名前 | 種別 |
|---|---|
| `DATABASE_URL` | 平文 |
| `AUTH_SECRET` | 平文 |
| `AUTH_TRUST_HOST` | 平文（`true`） |
| `AUTH_URL` | 平文（上記URL） |
| `ANTHROPIC_API_KEY` | Secret 参照（`anthropic-api-key-suenaga-daiso-portal` の `latest`） |

`CRON_SECRET` は未設定。

## Cloud SQL `portal-mock-backend-db`

| 項目 | 値 |
|---|---|
| 接続名 | `rvp-ai-proto-camp:asia-northeast1:portal-mock-backend-db` |
| バージョン / edition | POSTGRES_16 / ENTERPRISE |
| tier / 可用性 | db-f1-micro / ZONAL（zone asia-northeast1-b） |
| ディスク | 10GB PD_SSD、自動拡張あり |
| activationPolicy | ALWAYS（現在 RUNNABLE。`db-end` スキルで停止運用） |
| バックアップ | 無効（保持設定は 7 件の既定値のみ）、PITR 無効 |
| 削除保護 | 無効 |
| ネットワーク | public IP 有効、`sslMode=ALLOW_UNENCRYPTED_AND_ENCRYPTED` |
| データベース | `postgres`, `portal_mock` |
| ユーザー | `postgres` のみ（アプリは `postgres` ユーザーで接続している。`portal_mock` ユーザーは存在しない） |

## Secret Manager

- portal-mock が参照: `anthropic-api-key-suenaga-daiso-portal`（replication: automatic）
- `portal-mock-database-url` / `portal-mock-auth-secret` / `portal-mock-cron-secret` は**存在しない**（値は Cloud Run の平文 env にある）
- 同プロジェクトの他 secret（`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`JIRA_*`、`SLACK_*` 等）は portal-mock と無関係のため対象外

## 有効 API

`run` / `sqladmin` / `secretmanager` / `cloudscheduler` / `cloudbuild` / `artifactregistry` / `iam` / `cloudresourcemanager` / `monitoring` / `logging` はすべて有効（`modules/services` の対象10件と一致）。
