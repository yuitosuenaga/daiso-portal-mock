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
