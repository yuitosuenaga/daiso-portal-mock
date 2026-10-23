# クライアントGCP環境向け IaC（Terraform）導入計画

作成日: 2026-10-23
ステータス: 計画（未着手）

## 1. 目的・前提

- 現行の `portal-mock` 一式（Cloud Run + Cloud SQL ほか）を、クライアントの**新規GCPプロジェクト**に Terraform で構築できるようにする
- 環境は **2面**（dev / prod。名称は変更可）
- ツールは **Terraform**
- `apply` は**自社担当者（suenaga）がローカルから実施**する。クライアント側から付与予定の権限は **Editor 相当**
- 初回リリースでは、**Googleアカウントでのログインを自社ドメインのユーザーのみに限定**する（現行のメール＋パスワード認証から Google OAuth へ切替）
- 現行プロジェクト `rvp-ai-proto-camp` は、`terraform import` の**検証台**として使ってよい（合意済み）

## 2. 対象資源

`rvp-ai-proto-camp` は他用途（sandbox 系の Cloud Functions / Cloud Run / Scheduler 等）と共用の検証プロジェクトで、`portal-mock` に関係するのは以下のみ。import 対象はこの範囲に限定する。

### 2.1 実環境の棚卸し結果（2026-10-23、gcloud による読み取りのみ）

- **Cloud Run `portal-mock`**（asia-northeast1）
  - 実行SA: デフォルト compute SA（`700069905019-compute@developer.gserviceaccount.com`）
  - cpu 1 / memory 512Mi / concurrency 80 / timeout 300s / startup-cpu-boost / **maxScale=1** / ingress=all
  - Cloud SQL 接続: `rvp-ai-proto-camp:asia-northeast1:portal-mock-backend-db`
  - IAM: `allUsers` に `roles/run.invoker`
  - 環境変数: `DATABASE_URL` / `AUTH_SECRET` / `AUTH_TRUST_HOST` / `AUTH_URL` は**すべて平文**。`ANTHROPIC_API_KEY` のみ Secret 参照
  - イメージ: Artifact Registry `cloud-run-source-deploy/portal-mock`（`--source` デプロイの自動生成リポジトリ）
- **Cloud SQL `portal-mock-backend-db`**
  - POSTGRES_16 / `db-f1-micro` / ZONAL / ディスク10GB / `activationPolicy=ALWAYS`（`db-end` スキルで停止運用）
  - **自動バックアップ無効**、PITR 無効、`deletion_protection` 無効
  - public IP 有効、SSL 強制なし（`ALLOW_UNENCRYPTED_AND_ENCRYPTED`）
- **Secret Manager**: `anthropic-api-key-suenaga-daiso-portal`（portal-mock が使用。同名ではない `ANTHROPIC_API_KEY` secret は別用途の可能性があり対象外）
- **Cloud Scheduler**: `portal-mock` 向けジョブは**存在しない**（`/api/cron/announcement-escalation` を叩くジョブは未作成。IaC 側で新規定義する）
- **サービスアカウント**: portal-mock 専用SAは無い（compute SA を共用）
- 有効 API: `run` / `sqladmin` / `secretmanager` / `cloudbuild` / `artifactregistry` / `cloudscheduler` / `iam` / `cloudresourcemanager` / `monitoring` / `logging` ほか（クライアント環境で有効化すべき最小セットは Phase 2 で確定）
- 未接続: SMTP、Google SSO

### 2.2 棚卸しから分かった、クライアント環境で改善すべき点

- 機密値（`DATABASE_URL` の DB パスワード、`AUTH_SECRET`）が Cloud Run の平文 env にある → Secret Manager 化
- 専用SA（最小権限）に切り替え、compute SA の共用をやめる
- Cloud SQL にバックアップ・PITR・削除保護・SSL 強制がない → 本番は有効化（dev は費用と相談）
- Scheduler ジョブが未作成のため、エスカレーション自動実行は現状動いていない（アクセス時トリガーのみ）
- maxScale=1 は検証用設定。prod の値は要検討

## 3. 重要な制約と対処（Editor 権限・Google ログイン）

### 3.1 Editor 権限では足りない操作

Editor は IAM ポリシーを変更できない（`resourcemanager.projects.setIamPolicy` を含まない）。Terraform で次を作る場合は失敗する。

- Cloud Run の `allUsers` invoker 付与（Cloud Run 側 IAM のため、サービス単位なら可能な場合もある。要検証）
- プロジェクトレベルのロール付与（アプリ用SA、Cloud Scheduler 用SA など）
- Workload Identity Federation 関連のバインディング

対処案（優先順）:

1. **bootstrap 時だけ**クライアントに `Project IAM Admin`（または `Owner`）を一時付与してもらい、IAM 系リソースを作成後に権限を戻す
2. IAM 系リソースだけ `bootstrap/` として分離し、クライアント管理者が実行（または手順書として渡す）
3. 上記が不可なら、SA とロール付与をクライアント側で事前作成してもらい、Terraform は `data` で参照のみにする

→ **クライアントへ早期に依頼する項目**（§7 のTODO参照）。

### 3.2 自社ドメイン限定 Google ログイン

- 実装はアプリ側（Auth.js の Google Provider + `hd` 指定、およびサーバー側での email ドメイン検証。`hd` はクライアント側ヒントのためサーバー検証が必須）
- **OAuth 同意画面・OAuth クライアント（Web）は Terraform で作成できない**（標準の Web OAuth クライアントは未サポート）。手動作成して client id / secret を Secret Manager に登録し、Terraform からは参照のみにする
- 同意画面の User Type は、クライアントが Google Workspace 組織配下なら **Internal** を選べる（自社ドメイン限定が同意画面側でも担保される）。組織外なら External + アプリ側検証
- 対象ドメイン名（構成図上は仮の `daisojapan.com`）は要確認。Terraform 変数 `allowed_email_domain` としてアプリへ環境変数注入する
- Cloud Run を `allUsers` 公開にするか、IAP 等で前段保護するかは別論点（組織ポリシー `iam.allowedPolicyMemberDomains` が有効だと `allUsers` が付けられない）

## 4. 方針

- state: 専用 GCS バケット（バージョニング有効）。バケット自体は `bootstrap/` で作成（初回のみローカル state → バケット作成後に移行）
- ディレクトリ構成（`infra/` 配下）:
  - `bootstrap/` — state バケット、API 有効化、（権限が得られれば）IAM・WIF
  - `modules/` — `cloudsql` / `cloudrun` / `secrets` / `scheduler` / `iam` / `monitoring`
  - `envs/dev` / `envs/prod` — モジュール呼び出しと環境差分（tfvars）
- アプリのデプロイ（イメージ更新）と Terraform は分離する。Cloud Run の `image` は `lifecycle.ignore_changes` にする
- 秘密情報は Terraform の state に載せない（値は手動 or `gcloud` で登録し、Terraform は secret の「枠」と参照だけ管理）。Cloud SQL のパスワードは `random_password` を使うと state に残るため、Secret Manager へ直接登録する運用を検討する
- provider バージョンは固定（`.terraform.lock.hcl` をコミット）

## 5. フェーズ

### Phase 1: 前提確定・棚卸し（棚卸しは2026-10-23完了、§2.1。クライアント確認は未了）
- gcloud 再認証 → 現行 `rvp-ai-proto-camp` の Cloud Run / Cloud SQL / Secret / Scheduler / IAM / 有効 API を JSON で取得し、§2 を確定
- クライアントへ権限・組織ポリシー・ドメイン・リージョンを確認（§7）

### Phase 2: Terraform 骨格と import 検証
- `infra/` の雛形作成、bootstrap（state バケット・API 有効化）
- `envs/dev` を `rvp-ai-proto-camp` に向け、既存資源を `terraform import` して `plan` が**差分ゼロ**になることを確認（再現性の検証）

### Phase 3: アプリ側の IaC 前提整備（別ブランチ・別PR）
- Dockerfile 化（Next.js standalone）
- `prisma migrate deploy` の Cloud Run Job 化（現状は手動で、反映漏れ障害が過去に複数回発生）
- `DATABASE_URL` / `AUTH_SECRET` の Secret Manager 化
- アプリ専用サービスアカウントと最小権限
- Google ログイン（ドメイン限定）の実装（既存 spec への要件追記で対応。CLAUDE.md の「1画面=1spec」に従う）

### Phase 4: クライアント環境への展開
- クライアントの新規プロジェクトで bootstrap → dev → prod の順に apply
- OAuth 同意画面・クライアントの手動作成と secret 登録
- 初回マイグレーション実行、初期ユーザー投入、動作確認

### Phase 5: 本番化・運用
- Cloud SQL: private IP、自動バックアップ・PITR、`deletion_protection`、HA の要否
- ネットワーク: Direct VPC egress
- 公開制御: カスタムドメイン + LB、Cloud Armor / IAP の要否
- 監視: アラートポリシー、budget alert、ログ保持
- SMTP 認証情報の secret 枠、CI/CD（GitHub Actions + WIF。権限が得られる場合）
- `deploy-main` / `db-start` / `db-end` スキルをクライアント環境向けに更新（常時稼働・HA にするなら `db-end` は不要）

## 6. リスク

- Editor 権限のみで IAM 系が作れず bootstrap が止まる（§3.1）
- 組織ポリシーで `allUsers` 公開・外部IP・リージョン等が制限されている
- ローカル `apply` は属人化しやすい → Phase 5 で CI 化を検討（state ロック、`plan` の PR 添付）
- import 対象の実態が棚卸し結果と異なり差分が出る（Phase 2 で吸収）

## 7. TODO（クライアントへの確認・依頼）

- [ ] プロジェクトID・請求先・リージョン（asia-northeast1 想定）
- [ ] bootstrap 時の一時的な IAM 権限付与の可否（§3.1）
- [ ] 組織ポリシー（`allUsers` 禁止、リージョン制限、`iam.allowedPolicyMemberDomains` など）
- [ ] ログイン許可ドメイン、Google Workspace 組織配下か（同意画面 Internal 可否）
- [ ] dev / prod の環境分離単位（同一プロジェクト内 or プロジェクト別）。**現状は新規プロジェクト1つに2環境か、環境ごとにプロジェクトか未確定**
- [ ] SMTP の方針（SendGrid 等 or 社内リレー）

## 8. Google 側の管理権限が自社に無い点への対処

現行環境（`rvp-ai-proto-camp`）は自社のプロジェクトをクライアントに見せている状態で、クライアント側の Google Workspace / GCP 組織の管理権限は自社に無い。したがって次はクライアント管理者の作業になり、Terraform だけでは完結しない。

- GCP プロジェクト作成、請求先リンク、自社メンバーへの Editor 付与
- bootstrap 時の IAM 権限の一時付与（§3.1）
- 組織ポリシーの確認・例外設定（`allUsers` 公開など）
- OAuth 同意画面と OAuth クライアント（Web）の作成、承認済みリダイレクトURIの登録（`<auth_url>/api/auth/callback/google`）。作成後の client id / secret を `<prefix>-auth-google-id` / `<prefix>-auth-google-secret` に登録してもらう
- 許可ドメインの確定（Workspace 組織配下なら同意画面を Internal にできるか）

コード側は、これらが揃っていなくても `apply` できるようにしてある（`enable_google_login=false` / `enable_translation=false` / `manage_iam=false` / `allow_public_access=false` のトグル）。

## 9. 作成したコード（`infra/`）

```
infra/
  bootstrap/          state 用 GCS バケット（バージョニング・公開禁止）。初回のみローカル state
  modules/
    services/         必要 API の有効化
    cloudsql/         PostgreSQL 16、ランダムパスワード、DATABASE_URL 生成（Unix ソケット形式）
    secrets/          生成値の secret（DATABASE_URL / AUTH_SECRET / CRON_SECRET）と手動登録用の枠
    iam/              アプリ専用SA。ロール付与は manage_iam で切替
    cloudrun/         Cloud Run v2。image・client は ignore_changes。allUsers は切替可
    scheduler/        /api/cron/announcement-escalation を x-cron-secret 付きで POST
  envs/dev, envs/prod 同一の main/variables/outputs。差分は *.tfvars.example のみ
```

`terraform validate` は bootstrap と envs/dev で成功。`plan` / `apply` は未実施（クライアント環境の資格情報待ち）。

### 実行手順（クライアントの新規プロジェクトで）

1. `gcloud auth application-default login`
2. bootstrap: `terraform -chdir=infra/bootstrap init` → `terraform -chdir=infra/bootstrap apply -var project_id=<id> -var state_bucket_name=<id>-tfstate`
3. dev: `envs/dev/dev.tfvars.example` を `dev.tfvars` にコピーして編集し、
   `terraform -chdir=infra/envs/dev init -backend-config="bucket=<id>-tfstate" -backend-config="prefix=dev"` → `plan -var-file=dev.tfvars` → `apply`
4. 初回デプロイ。Cloud Run は初回プレースホルダイメージで作成される。マイグレーション（`prisma migrate deploy`）は `deploy-main` の手順に従い、アプリのデプロイより先に実行する
5. 手動登録 secret に値を入れ、該当トグルを true にして再 `apply`（例: `gcloud secrets versions add <prefix>-anthropic-api-key --data-file=-`）
6. prod も同様（`prefix=prod`）

### 現行環境での検証方針（Phase 2 の見直し）

現行 `portal-mock` は専用SAなし・secret 名が本コードと異なるため、そのまま `import` すると差分が出る。検証は「現行に合わせた import」ではなく、**別 prefix の dev を `rvp-ai-proto-camp` 上に新規作成して `apply` が通ること**を確認する方針とする（既存資源を壊さず、モジュールの再現性を確認できる）。

### 既知の制約・注意

- DB パスワード・`AUTH_SECRET`・`CRON_SECRET` は Terraform が生成するため **state に平文で残る**。state バケットへのアクセスを限定する。`CRON_SECRET` は Scheduler ジョブ定義にも入る
- Cloud SQL は `ssl_mode=ENCRYPTED_ONLY`。Cloud Run の組み込みコネクタは TLS のため影響なし。ローカルから接続する際は Cloud SQL Auth Proxy を使う
- Cloud SQL は public IP（コネクタ経由）。private IP 化は Phase 5
- Google ログイン用の env 名（`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `ALLOWED_EMAIL_DOMAIN`）はアプリ側実装（Phase 3）で確定させる。現状のアプリは未対応で、`enable_google_login` は false のままにする
- SMTP、監視アラート、budget alert、CI/CD、カスタムドメイン、`db-end` 相当の停止運用は未実装
