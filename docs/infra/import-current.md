# 現行環境（rvp-ai-proto-camp）の Terraform 取り込み手順

作成日: 2026-10-23（同日、機密ローテーション込みの確定フローに改訂）。目的は、稼働中の portal-mock（Cloud Run / Cloud SQL / secret）を `infra/envs/dev` の管理下に置き、あわせて機密値（`DATABASE_URL`＝postgres ユーザーのDBパスワード含む、`AUTH_SECRET`）を Secret Manager 参照へ移して**新しい値にローテーションする**こと。現行の実測値は `current-state.md` を参照。

## 前提・合意事項

- 現行 portal-mock は実利用の無いモック。旧機密値は過去の会話ログに露出したため、同値移行はせず**新しい値へ入れ替える**。
- **旧リビジョンへのロールバックは不可**（合意済）。DBパスワードと `AUTH_SECRET` を変えるため、平文 env を持つ旧 revision は apply 後に接続できなくなり、旧 revision へトラフィックを戻しても動かない。戻せるのは「Cloud SQL のバックアップからのデータ復元」のみ。
- state はローカルに平文機密（Cloud Run の平文 env）を残さないため、**最初から GCS backend** に import する（段階0で bootstrap を先に作る）。
- `terraform apply` と GCP への書き込みコマンドは**ユーザーが手動実行**する。エージェントは plan・読み取り確認・ドキュメント/スクリプト作成までを担当する。
- クライアント環境への新規構築ではこの手順は使わない（同じコードを tfvars 差し替えだけで適用する）。

## 追加した変数（デフォルト = 従来の挙動）

| 変数 | 既定 | 現行での値 | 用途 |
|---|---|---|---|
| `db_instance_name` | null（`<prefix>-db`） | `portal-mock-backend-db` | 既存インスタンス名 |
| `db_name` / `db_user` | `portal_mock` / `portal_mock` | `portal_mock` / `postgres` | 既存DB・ユーザー |
| `db_ssl_mode` | `ENCRYPTED_ONLY` | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` | 現行値に合わせる（段階4で既定へ） |
| `manage_db_password` | true | false | パスワードを生成・変更しない（`google_sql_user.existing` を使い `ignore_changes=[password]`）。パスワードは `rotate-secrets.sh` が変更する |
| `db_deletion_protection_enabled` | null（`deletion_protection` に従う） | false | GCP 側の削除保護（段階4で true へ） |
| `use_existing_secrets` | false | true | DATABASE_URL / AUTH_SECRET の secret は枠のみ管理、値は `rotate-secrets.sh` で登録 |
| `secret_name_overrides` | {} | `anthropic_api_key = "anthropic-api-key-suenaga-daiso-portal"` | 既存 secret 名 |
| `existing_service_account_email` | null（専用SAを作成） | compute SA | 実行SAを変えない（SA 作成・ロール付与なし） |
| `enable_cron_secret` | true | false | CRON_SECRET を注入しない（現行に無い） |
| `cloudrun_cpu/memory/concurrency/timeout_seconds/startup_cpu_boost/ingress` | 従来のハードコード値 | 既定のまま（現行と一致） | 将来の調整用 |

モジュール側の追加: `cloudrun` に `cpu_idle=true` を明示、`ignore_changes` に `build_config`（`--source` デプロイのビルド情報）と service 単位 `scaling` を追加。`cloudsql` に `settings[0].enable_dataplex_integration` の `ignore_changes` を追加。いずれも新規構築の挙動は変わらない。

## 自社現行用 tfvars（`infra/envs/dev/current.tfvars`。git 管理外、非機密のみ）

```hcl
project_id  = "rvp-ai-proto-camp"
region      = "asia-northeast1"
name_prefix = "portal-mock"

deletion_protection = true # Terraform 上の削除防止（既存 state の既定と一致）

db_instance_name               = "portal-mock-backend-db"
db_name                        = "portal_mock"
db_user                        = "postgres"
db_ssl_mode                    = "ALLOW_UNENCRYPTED_AND_ENCRYPTED" # 段階4で ENCRYPTED_ONLY へ
db_backup_enabled              = false                             # 段階4で true へ
db_deletion_protection_enabled = false                             # 段階4で true へ
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

## 全体フロー（確定）

以降、`R` = リポジトリ（worktree）ルートの絶対パス、`E=$R/infra/envs/dev`、`SCRATCH` = 作業用ディレクトリ。**plan / state show / `gcloud run services describe` の生出力は画面に出さない**（Cloud Run の平文 env が含まれる）。必要ならファイルへ保存して `grep` / `jq` で名前だけ確認し、確認後に削除する。

### 段階0: bootstrap（GCS state バケット）を作り、GCS backend に import する

1. bootstrap の plan と apply。plan は保存済み（エージェントが作成。内容は「バケット1＋API有効化3の新規作成のみ、既存資源への変更なし」）。

   - 実行者: **ユーザー**（apply）
   - コマンド:

     ```
     terraform -chdir=$R/infra/bootstrap apply -input=false $SCRATCH/bootstrap.tfplan
     ```

   - 確認項目: `Apply complete! Resources: 4 added`、`state_bucket = "rvp-ai-proto-camp-portal-iac-tfstate"`。
   - 戻し方: 未使用バケットなので `terraform -chdir=$R/infra/bootstrap destroy`（`force_destroy=false` のため空のときのみ）。bootstrap の state はローカル（機密なし。git 管理外）。

2. envs/dev を GCS backend で初期化（`local_override.tf` は使わない）。

   - 実行者: エージェントまたはユーザー（GCP への書き込みなし。state バケットへの書き込みのみ）
   - コマンド:

     ```
     terraform -chdir=$E init -input=false -reconfigure -backend-config="bucket=rvp-ai-proto-camp-portal-iac-tfstate" -backend-config="prefix=dev"
     ```

3. import（GCP には書き込まず、GCS 上の state にのみ書く）。`-var-file=current.tfvars` を毎回付ける。

   - 実行者: エージェントまたはユーザー

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

   - 確認項目: `terraform -chdir=$E plan -var-file=current.tfvars -input=false -no-color -out=$SCRATCH/dev.tfplan > $SCRATCH/plan.txt` を実行し、`grep -E '^Plan:|will be (created|updated|destroyed|replaced)' $SCRATCH/plan.txt` で差分を確認する。期待値は「5 to add, 1 to change, 0 to destroy」（add: `terraform_data.require_allowed_domains` と secret 枠4件、change: Cloud Run の env→secret 参照）。**destroy / replace が出たら進めない**。確認後 `plan.txt` と `dev.tfplan` を削除。
   - 戻し方: state の操作のみ。`terraform state rm <addr>` で取り込みを外せる（GCP 資源は無傷）。
   - 備考: GCS 上の state（バケットは非公開・バージョニング有効）には import 直後 Cloud Run の平文 env（旧値）が入る。旧値は段階3でローテーションされ無効になる。state の旧世代にも旧値が残るため、段階5で旧世代の削除を検討する。

### 段階1: Cloud SQL のオンデマンドバックアップ

- 実行者: **ユーザー**
- コマンド:

  ```
  gcloud sql backups create --instance portal-mock-backend-db --project rvp-ai-proto-camp --description "before-secret-rotation"
  ```

- 確認項目: `gcloud sql backups list --instance portal-mock-backend-db --project rvp-ai-proto-camp` に `SUCCESSFUL` の行がある。
- 戻し方: 不要（追加のみ）。データを戻す必要が出た場合はこのバックアップから `gcloud sql backups restore`。

### 段階2: secret の枠（空）4件を作成

- 実行者: **ユーザー**（apply）。事前に `plan -target=module.secrets` で確認してよい。
- コマンド:

  ```
  terraform -chdir=$E apply -var-file=current.tfvars -target='module.secrets'
  ```

- 確認項目: 作成されるのは `portal-mock-database-url` / `portal-mock-auth-secret` / `portal-mock-auth-google-id` / `portal-mock-auth-google-secret` の4件のみ（値なし）。`gcloud secrets list --project rvp-ai-proto-camp --filter="name~portal-mock" --format="value(name)"` で4件が出る。
- 戻し方: `terraform destroy -target=...` または `gcloud secrets delete <name>`（まだ誰も参照していない）。

### 段階3: 機密値のローテーション → 全体 apply（Cloud Run を secret 参照へ切替）

> **実施済み（2026-10-23）**: ローテーション、全体 apply、ブラウザでの動作確認まで完了。

1. ローテーションスクリプトを実行（新 AUTH_SECRET 登録 → 新 DB パスワード生成 → 新 DATABASE_URL 登録 → 最後に DB パスワード変更）。

   - 実行者: **ユーザー**（端末で YES を入力する対話あり）
   - コマンド:

     ```
     PROJECT=rvp-ai-proto-camp REGION=asia-northeast1 INSTANCE=portal-mock-backend-db DB_USER=postgres DB_NAME=portal_mock CONNECTION_NAME=rvp-ai-proto-camp:asia-northeast1:portal-mock-backend-db $R/infra/scripts/rotate-secrets.sh
     ```

   - 確認項目: `[a]` `[c]` `[d]` の3行が出て完了。`gcloud secrets versions list portal-mock-database-url --project rvp-ai-proto-camp`（および `portal-mock-auth-secret`）に ENABLED の version がある（値は読まない）。
   - 失敗時: 何度でも再実行してよい（毎回値を再生成し、最後に secret と DB が一致する）。**スクリプトが正常終了するまで次の apply へ進まない。**
   - 注意: この時点で稼働中の旧 revision（平文の旧 DB パスワード）は DB に接続できなくなる。モックで実利用が無いため許容（合意済）。ダウンタイムを短くするため、手順3-2 をすぐ続けて実行する。
   - 戻し方: **旧値には戻せない**。再実行で別の新値に入れ替えることのみ可能。

2. 全体 apply。

   - 実行者: **ユーザー**（apply）
   - コマンド（plan を確認してから）:

     ```
     terraform -chdir=$E plan -var-file=current.tfvars -input=false -no-color > $SCRATCH/plan.txt
     grep -E '^Plan:|will be (created|updated|destroyed|replaced)' $SCRATCH/plan.txt
     terraform -chdir=$E apply -var-file=current.tfvars
     ```

     （`plan.txt` は確認後に削除。apply 時の差分表示に旧値が出る場合は画面を共有しない）
   - 確認項目: 差分は `terraform_data.require_allowed_domains` の作成と Cloud Run の env 参照切替（`DATABASE_URL` / `AUTH_SECRET` が平文→`secret_key_ref` の `latest`）のみ。
   - 戻し方: **旧 revision へは戻せない**（上記前提）。失敗時は secret 参照・権限（compute SA は `roles/secretmanager.secretAccessor` 付与済みを確認済み）とログを確認して修正し、再 apply する。

3. 動作確認。

   - 実行者: ユーザー（またはエージェントがブラウザ確認）
   - 確認項目:
     - 公開URL（`https://portal-mock-700069905019.asia-northeast1.run.app`）でログインでき、主要画面（お知らせ・問い合わせ）が表示される
     - `curl -s https://portal-mock-700069905019.asia-northeast1.run.app/api/auth/providers` が JSON を返す
     - ログ: `gcloud run services logs read portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --limit 50` に DB 接続エラー（`password authentication failed` 等）が無い
     - `gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --format=json | jq '[.spec.template.spec.containers[0].env[] | {name, secret: (.valueFrom != null)}]'` で `DATABASE_URL` / `AUTH_SECRET` が `secret: true`（値は表示されない形式）
   - 戻し方: 動作しない場合は 3-1 を再実行して secret と DB を一致させ、現行イメージを指定した `gcloud run deploy portal-mock --image <現行イメージ>` で新 revision を作る(手順は `runbook.md` §3.3 末尾。`--update-labels` は新 revision が作られる保証がないため使わない)。

### 段階4: Cloud SQL 設定の改善（個別 apply）

`current.tfvars` を次のとおり編集し、1項目ずつ（または3つまとめて）`module.cloudsql` だけを apply する。変更により Cloud SQL の再起動が走る場合があるため、`plan` で `must be replaced` が出ないこと・再起動の有無を確認してから実行する。

| 設定 | 変更 | 目的 |
|---|---|---|
| `db_backup_enabled` | false → true | 自動バックアップ |
| `db_deletion_protection_enabled` | false → true | 誤削除防止 |
| `db_ssl_mode` | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` → `ENCRYPTED_ONLY` | TLS 必須（Cloud Run は `/cloudsql` ソケット経由の Cloud SQL コネクタで接続するため影響しない想定。適用後に段階3-3 の確認を再実施） |

- 実行者: **ユーザー**（apply）。plan はエージェントでも可。
- コマンド:

  ```
  terraform -chdir=$E plan -var-file=current.tfvars -input=false -no-color -target='module.cloudsql'
  terraform -chdir=$E apply -var-file=current.tfvars -target='module.cloudsql'
  ```

- 確認項目: plan が対象設定のみの in-place 更新（destroy / replace なし）。apply 後に動作確認（段階3-3）。`gcloud sql instances describe portal-mock-backend-db --project rvp-ai-proto-camp --format="value(settings.backupConfiguration.enabled,settings.deletionProtectionEnabled,settings.ipConfiguration.sslMode)"`。
- 戻し方: `current.tfvars` を元の値に戻して同じ apply（TLS 必須で接続できなくなった場合は `db_ssl_mode` を戻す）。

### 段階5: 後始末（任意）

- 旧 revision の整理: 平文の旧 env を持つ revision が残る（旧値は段階3で無効化済みだが、露出を残さないため削除が望ましい）。
  - 実行者: **ユーザー**
  - コマンド: `gcloud run revisions list --service portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --format="value(name)"` で一覧を出し、最新（secret 参照）以外を `gcloud run revisions delete <name> --region asia-northeast1 --project rvp-ai-proto-camp` で削除。
  - 確認項目: 最新 revision がトラフィック 100% を受けている。
  - 戻し方: 削除は不可逆（旧 revision は元々動かないため影響なし）。
- 旧 secret version の無効化: `anthropic-api-key-suenaga-daiso-portal` 等、今回触らなかった secret に旧 version がある場合のみ。ローテーション対象の2 secret は、`rotate-secrets.sh` を再実行した場合に古い version が残るので、`gcloud secrets versions disable <version> --secret <name> --project rvp-ai-proto-camp` で最新以外を無効化する。
  - 実行者: **ユーザー**。戻し方: `gcloud secrets versions enable`。
- state の旧世代: GCS state バケットの旧世代（import 直後の旧値入り）は、バージョニングのライフサイクル（新しい世代30件超で削除）に任せるか、`gcloud storage rm --all-versions` で該当 object の旧世代を手動削除する（現行 state は消さないこと）。
- 作業用ファイル（`$SCRATCH/*.tfplan`、`plan.txt`、`current.tfvars`）は削除する。tfstate / tfvars は `infra/.gitignore` で除外済み。
