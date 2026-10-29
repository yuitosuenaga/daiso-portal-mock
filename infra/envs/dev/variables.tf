variable "project_id" {
  type        = string
  description = "デプロイ先 GCP プロジェクトID"
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "name_prefix" {
  type        = string
  description = "リソース名の接頭辞（例: portal-mock-dev）。同一プロジェクトに2環境置く場合も衝突しない"
}

variable "deletion_protection" {
  type        = bool
  default     = true
  description = "Cloud SQL / Cloud Run の削除保護。dev の作り直しを許すなら false"
}

# --- IAM / 公開（Editor 権限では失敗しうる操作） ---
variable "manage_iam" {
  type        = bool
  default     = true
  description = "false: SA 作成のみ。ロール付与はクライアント管理者が実施（modules/iam の required_roles）"
}

variable "allow_public_access" {
  type        = bool
  default     = true
  description = "Cloud Run に allUsers の invoker を付与する。組織ポリシーで禁止なら false"
}

# --- Cloud SQL ---
variable "db_tier" {
  type    = string
  default = "db-f1-micro"
}

variable "db_disk_size_gb" {
  type    = number
  default = 10
}

variable "db_high_availability" {
  type    = bool
  default = false
}

variable "db_backup_enabled" {
  type    = bool
  default = true
}

variable "db_point_in_time_recovery" {
  type    = bool
  default = false
}

# --- Cloud Run ---
variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 3
}

variable "auth_url" {
  type        = string
  default     = null
  description = "公開URL。null なら Cloud Run の決定的URL。独自ドメイン導入後に設定"
}

# --- 機能トグル（手動登録が必要な secret を使う機能は、値登録後に true にする） ---
variable "enable_translation" {
  type        = bool
  default     = false
  description = "ANTHROPIC_API_KEY を注入する。先に `<prefix>-anthropic-api-key` の値を登録すること"
}

variable "enable_smtp" {
  type        = bool
  default     = false
  description = "SMTP_HOST/PORT/FROM（平文）と SMTP_USER/PASS（secret）を注入する。先に `<prefix>-smtp-user` / `<prefix>-smtp-pass` の値を登録すること。false の間、アプリはメール送信をスキップする"
}

variable "smtp_host" {
  type        = string
  default     = ""
  description = "SMTP サーバーのホスト名（enable_smtp=true の場合は必須）"
}

variable "smtp_port" {
  type        = number
  default     = 587
  description = "SMTP ポート番号"
}

variable "smtp_from" {
  type        = string
  default     = ""
  description = "送信元アドレス（SMTP_FROM。enable_smtp=true の場合は必須）。送信元ドメインの SPF/DKIM 設定が前提"
}

variable "enable_google_login" {
  type        = bool
  default     = false
  description = "Google ログイン用の AUTH_GOOGLE_ID/SECRET と ALLOWED_EMAIL_DOMAINS を注入する（アプリ側実装が前提）。true の場合は allowed_email_domains が必須（空だと失敗する）"
}

variable "allowed_email_domains" {
  type        = list(string)
  default     = []
  description = "ログインを許可するメールドメインのリスト（例: [\"example.com\"]）。アプリには ALLOWED_EMAIL_DOMAINS としてカンマ区切りで渡す"

  validation {
    condition     = alltrue([for d in var.allowed_email_domains : can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\\.[a-z]{2,}$", d))])
    error_message = "allowed_email_domains の各要素は小文字のドメイン形式（例: example.com）で指定する。空要素は不可。"
  }
}

variable "enable_helpdesk_auto_provision" {
  type        = bool
  default     = false
  description = "Google ログイン時に、未登録のヘルプデスク担当者を自動作成する（GOOGLE_HELPDESK_AUTO_PROVISION=true）。true の場合は enable_google_login=true と helpdesk_auto_provision_domains が必須"
}

variable "helpdesk_auto_provision_domains" {
  type        = list(string)
  default     = []
  description = "ヘルプデスク担当者の自動作成を許可するメールドメイン。allowed_email_domains の部分集合であること。アプリには GOOGLE_HELPDESK_AUTO_PROVISION_DOMAINS としてカンマ区切りで渡す"

  validation {
    condition     = alltrue([for d in var.helpdesk_auto_provision_domains : can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\\.[a-z]{2,}$", d))])
    error_message = "helpdesk_auto_provision_domains の各要素は小文字のドメイン形式（例: example.com）で指定する。空要素は不可。"
  }
}

variable "enable_scheduler" {
  type    = bool
  default = true
}

variable "enable_scheduler_oidc" {
  type        = bool
  default     = false
  description = "Scheduler に OIDC トークンを付与し、専用SAに Cloud Run の invoker を付与する。Cloud Run を非公開（allow_public_access=false）にする場合は true。x-cron-secret は併用する"
}

variable "scheduler_schedule" {
  type    = string
  default = "0 9 * * *"
}

variable "log_retention_schedule" {
  type        = string
  default     = "0 4 * * *"
  description = "運用ログ保持期間削除 Cron の実行スケジュール（Scheduler の time_zone=Asia/Tokyo 基準。既定は毎日 4:00）"
}

# --- 既存環境の取り込み（import）用。デフォルトはすべて新規構築向けの挙動 ---
variable "db_instance_name" {
  type        = string
  default     = null
  description = "Cloud SQL インスタンス名。null なら <name_prefix>-db。既存名に合わせる場合に指定"
}

variable "db_name" {
  type    = string
  default = "portal_mock"
}

variable "db_user" {
  type    = string
  default = "portal_mock"
}

variable "db_ssl_mode" {
  type    = string
  default = "ENCRYPTED_ONLY"
}

variable "manage_db_password" {
  type        = bool
  default     = true
  description = "false: DB パスワードを生成・変更しない（既存ユーザーを import して使う）"
}

variable "use_existing_secrets" {
  type        = bool
  default     = false
  description = "true: DATABASE_URL / AUTH_SECRET / CRON_SECRET は secret の枠のみ管理し、値は手動登録（Terraform は値を生成・保持しない）"
}

variable "secret_name_overrides" {
  type        = map(string)
  default     = {}
  description = "secret 名の上書き。キーは database_url / auth_secret / cron_secret / anthropic_api_key / auth_google_id / auth_google_secret / smtp_user / smtp_pass"
}

variable "existing_service_account_email" {
  type        = string
  default     = null
  description = "既存SA（例: デフォルト compute SA）を実行SAとして使う。null なら専用SAを作成"
}

variable "enable_cron_secret" {
  type        = bool
  default     = true
  description = "CRON_SECRET を生成して Cloud Run に注入する。false なら注入しない（enable_scheduler=false とセットで使う）"
}

variable "cloudrun_cpu" {
  type    = string
  default = "1"
}

variable "cloudrun_memory" {
  type    = string
  default = "1Gi"
}

variable "cloudrun_concurrency" {
  type    = number
  default = 80
}

variable "cloudrun_timeout_seconds" {
  type    = number
  default = 300
}

variable "cloudrun_startup_cpu_boost" {
  type    = bool
  default = true
}

variable "cloudrun_ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

variable "enable_migrate_job" {
  type        = bool
  default     = false
  description = "prisma migrate deploy 用の Cloud Run Job（<name_prefix>-migrate）を作成する。image は初期プレースホルダで、migrate ターゲットのイメージは gcloud run jobs update で設定する"
}

variable "migrate_job_timeout_seconds" {
  type        = number
  default     = 600
  description = "migrate Job のタスクタイムアウト（秒）。プレースホルダ image のまま実行するとこの時間まで待って失敗する"
}

variable "db_deletion_protection_enabled" {
  type        = bool
  default     = null
  description = "Cloud SQL の GCP 側削除保護。null なら deletion_protection に従う"
}

# --- 監視（modules/monitoring。既定 false で既存挙動不変） ---
variable "enable_monitoring" {
  type        = bool
  default     = false
  description = "Cloud Run / Cloud SQL の監視・アラートを作成する"
}

variable "enable_uptime_check" {
  type        = bool
  default     = true
  description = "稼働確認（uptime check とそのアラート）を作成する。ingress 制限時や min_instances=0 でウォーム維持したくない場合は false"
}

variable "enable_cloudsql_down_alert" {
  type        = bool
  default     = true
  description = "Cloud SQL 停止アラートを作成する。db-end で夜間停止する dev では false 推奨"
}

variable "alert_emails" {
  type        = list(string)
  default     = []
  description = "アラート通知先メール。空なら通知チャネルを作らない"
}

# --- 本番化トグル（docs/infra/prod-hardening.md）。既定は現行と同一 ---
variable "db_backup_retained_count" {
  type        = number
  default     = null
  description = "自動バックアップ保持世代数。null=API既定(7)のまま"
}

variable "db_transaction_log_retention_days" {
  type        = number
  default     = null
  description = "PITR 用ログ保持日数(1-7)。null=API既定のまま"
}

variable "db_backup_start_time" {
  type        = string
  default     = null
  description = "自動バックアップ開始時刻(UTC HH:MM)。null=API既定"
}

variable "enable_private_network" {
  type        = bool
  default     = false
  description = "VPC / Private Service Access を作成する（compute, servicenetworking API も有効化）"
}

variable "db_private_ip_enabled" {
  type        = bool
  default     = false
  description = "Cloud SQL を private IP 化。enable_private_network=true が前提"
}

variable "db_public_ip_enabled" {
  type        = bool
  default     = true
  description = "Cloud SQL の public IPv4。完全 private 化するなら false（db_private_ip_enabled=true が前提）"
}

variable "cloudrun_direct_vpc_egress" {
  type        = bool
  default     = false
  description = "Cloud Run / migrate job に Direct VPC egress を付ける。enable_private_network=true が前提"
}

variable "cloudrun_vpc_egress" {
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
  description = "Direct VPC egress の egress 設定（Cloud Run サービスと migrate job 共通）。PRIVATE_RANGES_ONLY（既定・現行値）または ALL_TRAFFIC（要 Cloud NAT）"

  validation {
    condition     = contains(["PRIVATE_RANGES_ONLY", "ALL_TRAFFIC"], var.cloudrun_vpc_egress)
    error_message = "cloudrun_vpc_egress は PRIVATE_RANGES_ONLY か ALL_TRAFFIC。"
  }
}

variable "vpc_subnet_cidr" {
  type    = string
  default = "10.10.0.0/24"
}

variable "db_export_enabled" {
  type        = bool
  default     = false
  description = "Cloud SQL の定期 SQL エクスポート（Scheduler -> GCS）を有効化"
}

variable "db_export_bucket_name" {
  type    = string
  default = null
}

variable "db_export_schedule" {
  type    = string
  default = "0 3 * * *"
}

variable "db_export_retention_days" {
  type    = number
  default = 30
}

# --- 予算アラート（modules/budget。既定 false で既存挙動不変） ---
# 請求先アカウントの Billing Account Administrator / Costs Manager 相当が必要。
# プロジェクトの Editor だけでは作成できない可能性が高いので、権限確認後に true にする。
variable "enable_budget_alert" {
  type        = bool
  default     = false
  description = "月額予算と通知（google_billing_budget）を作成する。請求先アカウントの権限が必要"
}

variable "billing_account_id" {
  type        = string
  default     = null
  description = "請求先アカウントID（例: 012345-6789AB-CDEF01）。enable_budget_alert=true で必須"
}

variable "budget_monthly_amount" {
  type        = number
  default     = null
  description = "月額予算額。enable_budget_alert=true で必須"
}

variable "budget_currency_code" {
  type        = string
  default     = "JPY"
  description = "予算の通貨。請求先アカウントの通貨と一致させる"
}

variable "budget_alert_emails" {
  type        = list(string)
  default     = []
  description = "予算アラートの通知先メール。空なら請求先アカウント管理者への既定通知のみ"
}
