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

variable "enable_scheduler" {
  type    = bool
  default = true
}

variable "scheduler_schedule" {
  type    = string
  default = "0 9 * * *"
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
  description = "secret 名の上書き。キーは database_url / auth_secret / cron_secret / anthropic_api_key / auth_google_id / auth_google_secret"
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
  default = "512Mi"
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

variable "db_deletion_protection_enabled" {
  type        = bool
  default     = null
  description = "Cloud SQL の GCP 側削除保護。null なら deletion_protection に従う"
}
