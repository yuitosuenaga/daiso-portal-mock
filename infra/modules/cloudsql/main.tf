variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type        = string
  description = "Cloud SQL インスタンス名"
}

variable "database_name" {
  type    = string
  default = "portal_mock"
}

variable "database_user" {
  type    = string
  default = "portal_mock"
}

variable "tier" {
  type    = string
  default = "db-f1-micro"
}

variable "disk_size_gb" {
  type    = number
  default = 10
}

variable "high_availability" {
  type    = bool
  default = false
}

variable "backup_enabled" {
  type    = bool
  default = true
}

variable "point_in_time_recovery" {
  type    = bool
  default = false
}

variable "deletion_protection" {
  type    = bool
  default = true
}

# GCP 側の削除保護（settings.deletion_protection_enabled）。null なら deletion_protection に従う。
variable "instance_deletion_protection_enabled" {
  type    = bool
  default = null
}

variable "ssl_mode" {
  type    = string
  default = "ENCRYPTED_ONLY"
}

# false: 既存インスタンスのパスワードを Terraform が生成・変更しない（import 用）。
# DATABASE_URL は手動登録の secret を参照する。
variable "manage_password" {
  type    = bool
  default = true
}

# パスワードは state に残る（state バケットは非公開・バージョニング付き）。
# URL に埋め込むため記号は使わない。
resource "random_password" "db" {
  count   = var.manage_password ? 1 : 0
  length  = 32
  special = false
}

resource "google_sql_database_instance" "this" {
  project             = var.project_id
  name                = var.name
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  lifecycle {
    # API が返す値で、設定していないため差分を無視する（変更すると不要な settings 更新が走る）
    ignore_changes = [settings[0].enable_dataplex_integration]
  }

  settings {
    tier                        = var.tier
    availability_type           = var.high_availability ? "REGIONAL" : "ZONAL"
    disk_size                   = var.disk_size_gb
    disk_autoresize             = true
    deletion_protection_enabled = coalesce(var.instance_deletion_protection_enabled, var.deletion_protection)

    backup_configuration {
      enabled                        = var.backup_enabled
      point_in_time_recovery_enabled = var.backup_enabled && var.point_in_time_recovery
    }

    ip_configuration {
      ipv4_enabled = true # Cloud Run 組み込みの Cloud SQL コネクタ経由で接続。TLS 必須。
      ssl_mode     = var.ssl_mode
    }
  }
}

resource "google_sql_database" "this" {
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  name     = var.database_name
}

resource "google_sql_user" "this" {
  count    = var.manage_password ? 1 : 0
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  name     = var.database_user
  password = random_password.db[0].result
}

# manage_password=false: 既存ユーザーを import して使う。パスワードは一切触らない。
resource "google_sql_user" "existing" {
  count    = var.manage_password ? 0 : 1
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  name     = var.database_user

  lifecycle {
    ignore_changes = [password]
  }
}

output "instance_name" {
  value = google_sql_database_instance.this.name
}

output "connection_name" {
  value = google_sql_database_instance.this.connection_name
}

# Cloud Run の Unix ソケット接続形式（現行 DATABASE_URL と同じ形）
output "database_url" {
  value     = var.manage_password ? "postgresql://${var.database_user}:${random_password.db[0].result}@localhost/${var.database_name}?host=/cloudsql/${google_sql_database_instance.this.connection_name}" : ""
  sensitive = true
}
