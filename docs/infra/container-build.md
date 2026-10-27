# コンテナビルドとマイグレーション Job

`Dockerfile` はマルチステージで、2つの出力ターゲットを持つ。

| ターゲット | 用途 | 内容 |
|---|---|---|
| `runner`(既定) | Cloud Run サービス | Next.js standalone 出力。非root(node)、`PORT=8080` |
| `migrate` | Cloud Run Job | prisma CLI + schema + migrations のみ。`prisma migrate deploy` が既定CMD |

`NEXT_PUBLIC_*` などビルド時 env は不要(ビルド時に秘密情報は渡さない)。実行時 env(`DATABASE_URL` / `AUTH_SECRET` / `AUTH_TRUST_HOST` / `AUTH_URL` 等)はサービス・Job 側で設定する。

## ローカル確認

```bash
docker build -t portal-mock:local .                       # runner
docker build --target migrate -t portal-mock-migrate:local .

# docker-compose の Postgres に対して migrate deploy
docker compose up -d postgres
docker run --rm --network host \
  -e DATABASE_URL="postgresql://portal_mock:portal_mock@localhost:5432/portal_mock" \
  portal-mock-migrate:local
```

## Artifact Registry へビルド・push(Cloud Build)

```bash
PROJECT=<project-id>; REGION=asia-northeast1; REPO=portal-mock
IMAGE=$REGION-docker.pkg.dev/$PROJECT/$REPO

# アプリ(runner)
gcloud builds submit --project $PROJECT --tag $IMAGE/app:$(git rev-parse --short HEAD) .
```

`migrate` ターゲットは `--tag` では指定できないため、cloudbuild.yaml で `docker build --target migrate` を使うか、ローカルで `docker build --target migrate` して push する。

```yaml
# cloudbuild.migrate.yaml(リポジトリ直下に実体あり)
steps:
  - name: gcr.io/cloud-builders/docker
    args: ["build", "--target", "migrate", "-t", "${_IMAGE}/migrate:${_TAG}", "."]
images: ["${_IMAGE}/migrate:${_TAG}"]
```

```bash
gcloud builds submit --project $PROJECT --config cloudbuild.migrate.yaml \
  --substitutions _IMAGE=$IMAGE,_TAG=$(git rev-parse --short HEAD) .
```

## Cloud Run サービスのデプロイ

```bash
gcloud run deploy portal-mock --project $PROJECT --region $REGION \
  --image $IMAGE/app:<tag> \
  --add-cloudsql-instances <project>:<region>:<instance>
```

## マイグレーション Job(Cloud Run Job)

Job は Terraform(`enable_migrate_job`)で管理する。下記「Terraform による Job 定義」を参照。

`gcloud run jobs create portal-mock-migrate` で手動作成済みの環境は、`enable_migrate_job=true` を apply する前に import する(しないと 409 already exists になる)。

```bash
terraform import 'module.migrate_job[0].google_cloud_run_v2_job.this' \
  projects/<project>/locations/<region>/jobs/<name>
```

運用順序: **migrate Job 実行 → サービスをデプロイ**(追加のみのマイグレーションは旧コードと後方互換)。
`DATABASE_URL` は Unix ソケット形式で、Secret Manager から注入する(Terraform 側で設定済み)。

## Terraform による Job 定義(`enable_migrate_job`)

`infra/modules/migrate-job` が Job(`<name_prefix>-migrate`)を定義する。既定は無効(`enable_migrate_job = false`)で、既存環境の plan には差分が出ない。

- アプリと同じ SA、`/cloudsql` マウント、`DATABASE_URL` は `database_url` secret(latest)を参照
- `max_retries = 0`、タイムアウトは `migrate_job_timeout_seconds`(既定 600 秒)
- image は初期プレースホルダ(hello)で、`ignore_changes` により Terraform は以後触らない

### 手順(クライアント環境移行時のスキーマ更新)

```bash
PROJECT=<project-id>; REGION=asia-northeast1; REPO=portal-mock
IMAGE=$REGION-docker.pkg.dev/$PROJECT/$REPO
TAG=$(git rev-parse --short HEAD)
JOB=<name_prefix>-migrate   # 例: portal-mock-migrate

# 1. Job を作成(tfvars で enable_migrate_job=true にして terraform apply。plan で Job 1件の追加のみであることを確認)

# 2. migrate イメージを build / push(リポジトリ直下の cloudbuild.migrate.yaml)
gcloud builds submit --project $PROJECT --config cloudbuild.migrate.yaml \
  --substitutions _IMAGE=$IMAGE,_TAG=$TAG .

# 3. Job のイメージを更新(初回はプレースホルダから差し替え。このステップは飛ばさない)
gcloud run jobs update $JOB --project $PROJECT --region $REGION --image $IMAGE/migrate:$TAG

# 4. 実行(完了まで待つ。失敗すると非ゼロで終了)
gcloud run jobs execute $JOB --project $PROJECT --region $REGION --wait

# 5. サービスをデプロイ(migrate 成功後)
```

> **警告**: image がプレースホルダ(hello)のまま `jobs execute` すると、タイムアウト(600秒)まで待って失敗する。必ず手順3の `jobs update --image` を先に行う。
> prod は `deletion_protection=true` のため、Job を `terraform destroy` / 削除する前に false にして apply する。

### 失敗時の確認

```bash
# 直近の実行一覧(ステータス・失敗タスク)
gcloud run jobs executions list --project $PROJECT --region $REGION --job $JOB --limit 5

# 実行ログ(prisma のエラー本文)
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=$JOB" \
  --project $PROJECT --limit 50 --format='value(timestamp,severity,textPayload,jsonPayload.message)'
```

よくある原因:

- `P1001`(接続不可): Cloud SQL が停止中、`/cloudsql` の接続名違い、SA の `roles/cloudsql.client` 不足
- `P1000`(認証失敗)/ secret 取得失敗: `database_url` secret に version が無い、SA の `roles/secretmanager.secretAccessor` 不足
- マイグレーション SQL のエラー: 途中まで適用された場合は `_prisma_migrations` の失敗レコードを確認し、`prisma migrate resolve` で解消してから再実行(`max_retries = 0` なので自動再試行はしない)

Terraform 側の `image` は `ignore_changes` のため、`jobs update` で変えても次回 plan に差分は出ない。
