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
# cloudbuild.migrate.yaml(例)
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

`DATABASE_URL` は Unix ソケット形式(`postgresql://user:pass@localhost/db?host=/cloudsql/<connection-name>`)。パスワード込みの値は Secret Manager から注入する。

```bash
gcloud run jobs create portal-mock-migrate --project $PROJECT --region $REGION \
  --image $IMAGE/migrate:<tag> \
  --set-cloudsql-instances <project>:<region>:<instance> \
  --set-secrets DATABASE_URL=<secret-name>:latest \
  --max-retries 0 --task-timeout 600

# 実行(完了まで待つ)
gcloud run jobs execute portal-mock-migrate --project $PROJECT --region $REGION --wait
```

運用順序: **migrate Job 実行 → サービスをデプロイ**(追加のみのマイグレーションは旧コードと後方互換)。
イメージ更新時は `gcloud run jobs update portal-mock-migrate --image ...` を使う。Terraform の Job 定義は別途追加予定。
