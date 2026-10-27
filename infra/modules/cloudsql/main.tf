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

# --- 本番化トグル（既定は現行と同一。docs/infra/prod-hardening.md 参照） ---

# 自動バックアップの保持世代数。null なら API 既定（7）のまま触らない。
variable "backup_retained_count" {
  type    = number
  default = null
}

# PITR 用トランザクションログの保持日数（1-7）。null なら API 既定のまま触らない。
variable "transaction_log_retention_days" {
  type    = number
  default = null
}

# 自動バックアップ開始時刻（UTC, "HH:MM"）。null なら API 既定。
variable "backup_start_time" {
  type    = string
  default = null
}

# パブリック IPv4。private IP 化後に false にすると外部経路が消える（Auth Proxy は private 経路が必要）。
variable "public_ip_enabled" {
  type    = bool
  default = true
}

# true: private IP を有効化する（private_network_id と、その VPC の Private Service Access が必要）。
variable "private_ip_enabled" {
  type    = bool
  default = false
}

variable "private_network_id" {
  type        = string
  default     = null
  description = "private IP で使う VPC の self_link / id。private_ip_enabled=true のとき必須"
}

# 定期 SQL エクスポート（Cloud Scheduler -> Cloud SQL Admin API -> GCS）
variable "export_enabled" {
  type    = bool
  default = false
}

variable "export_bucket_name" {
  type        = string
  default     = null
  description = "エクスポート先バケット名。null なら <project_id>-<name>-export"
}

variable "export_location" {
  type        = string
  default     = null
  description = "バケットのロケーション。null なら region"
}

variable "export_schedule" {
  type    = string
  default = "0 3 * * *"
}

variable "export_time_zone" {
  type    = string
  default = "Asia/Tokyo"
}

# 保持日数。バケットのバージョニング + ライフサイクルで古い世代を削除する。
variable "export_retention_days" {
  type    = number
  default = 30
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

resource "terraform_data" "private_ip_check" {
  lifecycle {
    precondition {
      condition     = !var.private_ip_enabled || var.private_network_id != null
      error_message = "private_ip_enabled=true には private_network_id が必要。"
    }
    precondition {
      condition     = var.public_ip_enabled || var.private_ip_enabled
      error_message = "public_ip_enabled=false の場合は private_ip_enabled=true が必要（接続経路がなくなる）。"
    }
    precondition {
      condition     = !var.point_in_time_recovery || var.backup_enabled
      error_message = "point_in_time_recovery=true には backup_enabled=true が必要。"
    }
    # HA の運用ガード（本リポジトリの方針）。公式ドキュメント上、HA に PITR/バックアップは必須とは明記されず
    # 「バックアップ強く推奨」。共有コア(f1-micro/g1-small)での HA 可否も公式ページで確認できていない（要確認）。
    # 安全側に倒し、HA は バックアップ有効 + PITR 有効 + 専有コア(db-custom-*) を要求する。
    precondition {
      condition     = !var.high_availability || (var.backup_enabled && var.point_in_time_recovery)
      error_message = "high_availability=true には backup_enabled=true と point_in_time_recovery=true が必要（本リポジトリの運用ガード）。"
    }
    precondition {
      condition     = !var.high_availability || startswith(var.tier, "db-custom-")
      error_message = "high_availability=true の tier は db-custom-<vCPU>-<MB> 形式（専有コア）にする。shared-core(db-f1-micro/db-g1-small)は不可（要確認事項のため安全側で拒否）。"
    }
    precondition {
      condition     = var.point_in_time_recovery || var.transaction_log_retention_days == null
      error_message = "transaction_log_retention_days は point_in_time_recovery=true のときだけ指定できる。"
    }
    precondition {
      condition     = !var.export_enabled || length(local.export_bucket) <= 63
      error_message = "エクスポート先バケット名が63文字を超えている（既定名は <project_id>-<name>-export）。export_bucket_name を短く指定する。"
    }
  }
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
      start_time                     = var.backup_start_time
      transaction_log_retention_days = var.transaction_log_retention_days

      dynamic "backup_retention_settings" {
        for_each = var.backup_retained_count == null ? [] : [1]
        content {
          retained_backups = var.backup_retained_count
          retention_unit   = "COUNT"
        }
      }
    }

    ip_configuration {
      ipv4_enabled    = var.public_ip_enabled # 既定 true: Cloud Run 組み込みコネクタ経由。TLS 必須。
      ssl_mode        = var.ssl_mode
      private_network = var.private_ip_enabled ? var.private_network_id : null
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

output "export_bucket" {
  value = var.export_enabled ? google_storage_bucket.export[0].name : null
}

output "connection_name" {
  value = google_sql_database_instance.this.connection_name
}

# Cloud Run の Unix ソケット接続形式（現行 DATABASE_URL と同じ形）
output "database_url" {
  value     = var.manage_password ? "postgresql://${var.database_user}:${random_password.db[0].result}@localhost/${var.database_name}?host=/cloudsql/${google_sql_database_instance.this.connection_name}" : ""
  sensitive = true
}

# --- 定期エクスポート ---
locals {
  export_bucket = coalesce(var.export_bucket_name, "${var.project_id}-${var.name}-export")
}

resource "google_storage_bucket" "export" {
  count                       = var.export_enabled ? 1 : 0
  project                     = var.project_id
  name                        = local.export_bucket
  location                    = coalesce(var.export_location, var.region)
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  # 固定ファイル名で上書きし、旧世代（noncurrent）を保持日数で削除する
  lifecycle_rule {
    condition {
      days_since_noncurrent_time = var.export_retention_days
    }
    action {
      type = "Delete"
    }
  }
}

# Cloud SQL インスタンスのサービスエージェントにバケット書き込みを許可
resource "google_storage_bucket_iam_member" "export_writer" {
  count  = var.export_enabled ? 1 : 0
  bucket = google_storage_bucket.export[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_sql_database_instance.this.service_account_email_address}"
}

resource "google_service_account" "export" {
  count        = var.export_enabled ? 1 : 0
  project      = var.project_id
  account_id   = "${substr(var.name, 0, 20)}-export"
  display_name = "Cloud SQL scheduled export (${var.name})"
}

# export 実行には cloudsql.instances.export が必要。cloudsql.editor に含まれる。
resource "google_project_iam_member" "export_invoker" {
  count   = var.export_enabled ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.editor"
  member  = "serviceAccount:${google_service_account.export[0].email}"
}

resource "google_cloud_scheduler_job" "export" {
  count     = var.export_enabled ? 1 : 0
  project   = var.project_id
  region    = var.region
  name      = "${var.name}-export"
  schedule  = var.export_schedule
  time_zone = var.export_time_zone

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${google_sql_database_instance.this.name}/export"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode(jsonencode({
      exportContext = {
        fileType  = "SQL"
        uri       = "gs://${google_storage_bucket.export[0].name}/${var.name}.sql.gz"
        databases = [var.database_name]
      }
    }))
    oauth_token {
      service_account_email = google_service_account.export[0].email
    }
  }

  depends_on = [google_storage_bucket_iam_member.export_writer, google_project_iam_member.export_invoker]
}
