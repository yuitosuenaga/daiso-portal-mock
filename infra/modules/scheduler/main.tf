variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type = string
}

variable "service_url" {
  type = string
}

variable "cron_secret" {
  type      = string
  sensitive = true
}

variable "schedule" {
  type    = string
  default = "0 9 * * *"
}

variable "time_zone" {
  type    = string
  default = "Asia/Tokyo"
}

# アプリの /api/cron/announcement-escalation は x-cron-secret ヘッダーで認証する。
# 値は Scheduler ジョブ定義と state に残る点に注意（閲覧権限の範囲を限定する）。
resource "google_cloud_scheduler_job" "escalation" {
  project   = var.project_id
  region    = var.region
  name      = var.name
  schedule  = var.schedule
  time_zone = var.time_zone

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "${var.service_url}/api/cron/announcement-escalation"
    headers = {
      "x-cron-secret" = var.cron_secret
    }
  }
}
