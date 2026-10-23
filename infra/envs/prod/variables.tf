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
