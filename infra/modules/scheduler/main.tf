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

# 叩くアプリ側 Cron エンドポイントのパス。既定は督促（既存ジョブの定義を変えない）。
variable "path" {
  type    = string
  default = "/api/cron/announcement-escalation"
}

variable "time_zone" {
  type    = string
  default = "Asia/Tokyo"
}

# 1 回の試行の締切。HTTP ターゲットの既定は 180s（許容 15s〜30m）。
# 督促 cron の処理締切(240s)と Cloud Run timeout(300s)に合わせ、Scheduler 側の打切りが
# 先に起きて失敗扱い→retry_count による再 POST（ロックで skip され失敗アラート誤検知）を防ぐ。
variable "attempt_deadline" {
  type    = string
  default = "300s"

  validation {
    condition     = can(regex("^[0-9]+s$", var.attempt_deadline)) && tonumber(trimsuffix(var.attempt_deadline, "s")) >= 15 && tonumber(trimsuffix(var.attempt_deadline, "s")) <= 1800
    error_message = "attempt_deadline は \"300s\" 形式で 15s〜1800s（HTTP ターゲットの許容範囲）。"
  }
}

# アプリの Cron エンドポイント（/api/cron/announcement-escalation、/api/cron/log-retention 等）は
# x-cron-secret ヘッダーで認証する。値は Scheduler ジョブ定義と state に残る点に注意（閲覧権限の範囲を限定する）。
# リソース名 `escalation` は督促専用だった名残。汎用化後も変えない（変えると既存ジョブが state 上
# 再作成になるため）。
resource "google_cloud_scheduler_job" "escalation" {
  project   = var.project_id
  region    = var.region
  name      = var.name
  schedule  = var.schedule
  time_zone = var.time_zone

  attempt_deadline = var.attempt_deadline

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "${var.service_url}${var.path}"
    headers = {
      "x-cron-secret" = var.cron_secret
    }
  }
}
