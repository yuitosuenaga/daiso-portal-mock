project_id  = "rvp-ai-proto-camp"
region      = "asia-northeast1"
name_prefix = "portal-mock"

deletion_protection = true # Terraform 上の削除防止（既存 state の既定と一致）

db_instance_name               = "portal-mock-backend-db"
db_name                        = "portal_mock"
db_user                        = "postgres"
db_ssl_mode                    = "ENCRYPTED_ONLY" # 段階4b
db_backup_enabled              = true             # 段階4a適用済み
db_deletion_protection_enabled = true             # 段階4a適用済み
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

enable_migrate_job = true

# 監視（4 alert policy + メール通知チャネル）。dev は min_instances=0 かつ db-end で夜間停止のため、
# 誤報になる uptime check と Cloud SQL 停止アラートは無効にする
enable_monitoring          = true
alert_emails               = ["suenaga.yuito@revamp.co.jp"]
enable_uptime_check        = false
enable_cloudsql_down_alert = false
