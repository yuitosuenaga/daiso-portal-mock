# 現行環境（rvp-ai-proto-camp）の Terraform 取り込み手順

作成日: 2026-10-23。目的は、稼働中の portal-mock（Cloud Run / Cloud SQL / secret）を**中身を変えずに** `infra/envs/dev` の管理下に置くこと。現行の実測値は `current-state.md` を参照。

クライアント環境への新規構築ではこの手順は使わない（同じコードを tfvars 差し替えだけで適用する）。以下の変数はすべてデフォルトが新規構築向けで、現行に合わせる差分だけを `current.tfvars` で上書きする。

## 追加した変数（デフォルト = 従来の挙動）

| 変数 | 既定 | 現行での値 | 用途 |
|---|---|---|---|
| `db_instance_name` | null（`<prefix>-db`） | `portal-mock-backend-db` | 既存インスタンス名 |
| `db_name` / `db_user` | `portal_mock` / `portal_mock` | `portal_mock` / `postgres` | 既存DB・ユーザー |
| `db_ssl_mode` | `ENCRYPTED_ONLY` | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` | 現行値に合わせる |
| `manage_db_password` | true | false | パスワードを生成・変更しない（`google_sql_user.existing` を使い `ignore_changes=[password]`） |
| `db_deletion_protection_enabled` | null（`deletion_protection` に従う） | false | GCP 側の削除保護を現行（無効）のまま維持 |
| `use_existing_secrets` | false | true | DATABASE_URL / AUTH_SECRET の secret は枠のみ管理、値は手動登録 |
| `secret_name_overrides` | {} | `anthropic_api_key = "anthropic-api-key-suenaga-daiso-portal"` | 既存 secret 名 |
| `existing_service_account_email` | null（専用SAを作成） | compute SA | 実行SAを変えない（SA 作成・ロール付与なし） |
| `enable_cron_secret` | true | false | CRON_SECRET を注入しない（現行に無い） |
| `cloudrun_cpu/memory/concurrency/timeout_seconds/startup_cpu_boost/ingress` | 従来のハードコード値 | 既定のまま（現行と一致） | 将来の調整用 |

モジュール側の追加: `cloudrun` に `cpu_idle=true` を明示、`ignore_changes` に `build_config`（`--source` デプロイのビルド情報）と service 単位 `scaling` を追加。`cloudsql` に `settings[0].enable_dataplex_integration` の `ignore_changes` を追加（API が返す値で未設定のため）。いずれも新規構築の挙動は変わらない。

## 自社現行用 tfvars（`infra/envs/dev/current.tfvars`。git 管理外、非機密のみ）

```hcl
project_id  = "rvp-ai-proto-camp"
region      = "asia-northeast1"
name_prefix = "portal-mock"

deletion_protection = true # Terraform 上の削除防止（既存 state の既定と一致）

db_instance_name               = "portal-mock-backend-db"
db_name                        = "portal_mock"
db_user                        = "postgres"
db_ssl_mode                    = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
db_backup_enabled              = false
db_deletion_protection_enabled = false
manage_db_password             = false

min_instances = 0
max_instances = 1

existing_service_account_email = "700069905019-compute@developer.gserviceaccount.com"
manage_iam                     = false
allow_public_access            = true

use_existing_secrets = true
enable_cron_secret   = false
enable_scheduler     = false
secret_name_overrides = {
  anthropic_api_key = "anthropic-api-key-suenaga-daiso-portal"
}

enable_translation  = true
enable_google_login = false
```

## 取り込み手順（ローカル state）

import は GCP に書き込まず、ローカル state にのみ書く。import blocks は Terraform 1.6 で `for_each` 不可、かつクライアント新規適用で壊れるため CLI 方式にする。

1. backend を一時的にローカルへ差し替える（`*_override.tf` は envs/dev に置くだけ。コミットしない）。

   ```hcl
   # infra/envs/dev/local_override.tf
   terraform {
     backend "local" {}
   }
   ```

   ```
   terraform -chdir=infra/envs/dev init -reconfigure -input=false
   ```

2. import（`-var-file=current.tfvars` を毎回付ける）。`E=infra/envs/dev` として:

   ```
   terraform -chdir=$E import -var-file=current.tfvars 'module.cloudsql.google_sql_database_instance.this' 'projects/rvp-ai-proto-camp/instances/portal-mock-backend-db'
   terraform -chdir=$E import -var-file=current.tfvars 'module.cloudsql.google_sql_database.this' 'projects/rvp-ai-proto-camp/instances/portal-mock-backend-db/databases/portal_mock'
   terraform -chdir=$E import -var-file=current.tfvars 'module.cloudsql.google_sql_user.existing[0]' 'rvp-ai-proto-camp/portal-mock-backend-db/postgres'
   terraform -chdir=$E import -var-file=current.tfvars 'module.cloudrun.google_cloud_run_v2_service.this' 'projects/rvp-ai-proto-camp/locations/asia-northeast1/services/portal-mock'
   terraform -chdir=$E import -var-file=current.tfvars 'module.cloudrun.google_cloud_run_v2_service_iam_member.public[0]' 'projects/rvp-ai-proto-camp/locations/asia-northeast1/services/portal-mock roles/run.invoker allUsers'
   terraform -chdir=$E import -var-file=current.tfvars 'module.secrets.google_secret_manager_secret.manual["anthropic-api-key-suenaga-daiso-portal"]' 'projects/rvp-ai-proto-camp/secrets/anthropic-api-key-suenaga-daiso-portal'
   ```

   API 有効化（10件。すべて有効済み）:

   ```
   for s in run sqladmin secretmanager cloudscheduler cloudbuild artifactregistry iam cloudresourcemanager monitoring logging; do
     terraform -chdir=$E import -var-file=current.tfvars "module.services.google_project_service.this[\"$s.googleapis.com\"]" "rvp-ai-proto-camp/$s.googleapis.com"
   done
   ```

3. `terraform -chdir=$E plan -var-file=current.tfvars -input=false -no-color`

注意: plan の出力には Cloud Run の平文 env（`DATABASE_URL` / `AUTH_SECRET`）の値が**そのまま表示される**。ターミナルに直接出さず、ファイルへ保存して必要箇所だけ確認し、確認後に削除する。plan ファイル・state・`current.tfvars` はコミットしない。

## plan 差分の分類（2026-10-23 実施結果: 5 to add, 1 to change, 0 to destroy）

### (a) 想定内・挙動が変わらない

- `terraform_data.require_allowed_domains` の新規作成（Terraform 内の precondition 用で GCP に影響なし）
- 取り込み直後に出ていた次の差分は、コード・tfvars 側で吸収済みで、現在は plan に出ない:
  - `deletion_protection` の true→false（state 既定値との差。tfvars を true にして一致）
  - Cloud SQL `settings.deletion_protection_enabled`（GCP 側設定。`db_deletion_protection_enabled=false` で現行維持）
  - Cloud Run `build_config` の削除、service 単位 `scaling` の 0→null、`resources.cpu_idle`（`ignore_changes` と `cpu_idle=true` 明示）
  - Cloud SQL `enable_dataplex_integration`（`ignore_changes`）
- Cloud SQL 接続（v1 注釈）と v2 の volume 表現の差分は、provider が注釈を volume として読み取るため plan に出なかった。`ANTHROPIC_API_KEY` の secret 参照、`cpu/memory/concurrency/timeout/startup-cpu-boost/ingress/maxScale`、イメージ、`AUTH_URL`、`AUTH_TRUST_HOST`、SA、IAM も差分なし。

### (b) 加算のみ・稼働影響なし

- 空の secret 枠の新規作成（4件）: `portal-mock-database-url`、`portal-mock-auth-secret`（次節の移行で使う）、`portal-mock-auth-google-id`、`portal-mock-auth-google-secret`（Google ログイン用の空枠。現行では未使用）
- 専用SA・プロジェクト IAM 付与は無し（`existing_service_account_email` と `manage_iam=false` のため）

### (c) 稼働に影響しうるもの

- **Cloud Run の `DATABASE_URL` / `AUTH_SECRET` が「平文 env」から「secret 参照（`latest`）」へ変わる**。新 revision が作られる。値が同一であれば挙動は変わらないが、secret に値が入っていない状態で apply すると新 revision の起動に失敗する（トラフィックは旧 revision に残るが、デプロイとしては失敗する）。これは意図した移行であり、次の段階的 apply で安全に行う。
  - 前提: 実行SA（compute SA）が当該 secret を読めること（既存の `anthropic-api-key-...` を読めているため通常は問題ない。apply 前に確認する）
- Cloud Run の replace、Cloud SQL の再起動を伴う変更、image の変化、`AUTH_URL` の変化は **plan に出ない**（0 to destroy）。

## 段階的 apply の手順（ユーザー承認後に実施。今回は未実施）

1. **事前にバックアップ**（`gcloud sql backups create` または export。承認後に実施）
2. secret 枠のみ作成: `terraform apply -var-file=current.tfvars -target='module.secrets'`
3. 現行 Cloud Run の env 値を secret に**同値で**登録する（値を画面・ログに出さない）。例（値は標準入力経由）:

   ```
   gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --format=json | jq -j '.spec.template.spec.containers[0].env[] | select(.name=="DATABASE_URL") | .value' | gcloud secrets versions add portal-mock-database-url --project rvp-ai-proto-camp --data-file=-
   gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --format=json | jq -j '.spec.template.spec.containers[0].env[] | select(.name=="AUTH_SECRET") | .value' | gcloud secrets versions add portal-mock-auth-secret --project rvp-ai-proto-camp --data-file=-
   ```

4. 登録できたことを確認（`gcloud secrets versions list portal-mock-database-url` 等。値は読まない）
5. 全体 apply: `terraform apply -var-file=current.tfvars`（差分は Cloud Run の env 参照切替のみ）
6. 公開URLでログインと主要画面を確認。問題があれば旧 revision へトラフィックを戻す（`gcloud run services update-traffic portal-mock --to-revisions=<旧revision>=100`）
7. 完了後、平文 env を持っていた旧 revision は残るため、必要なら整理する（旧 revision には平文の値が残っている点に注意）

## 後始末

- `infra/envs/dev/terraform.tfstate*`（平文 env が入る）、`local_override.tf`、`current.tfvars` は作業後に削除またはコミット対象外であることを確認する（tfstate / tfvars は `infra/.gitignore` で除外済み。`local_override.tf` は除外されないので削除する）
- 本番運用の state は GCS（bootstrap の state バケット）へ移す
