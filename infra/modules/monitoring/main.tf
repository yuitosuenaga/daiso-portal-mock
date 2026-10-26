# Cloud Run + Cloud SQL の監視・アラート雛形。
# クライアント要件確定前の雛形のため、閾値・通知先は変数で差し替える前提。
# 通知チャネルはメールのみ（alert_emails が空ならチャネルを作らず、ポリシーは通知先なしで作成される）。

variable "project_id" {
  type = string
}

variable "name_prefix" {
  type        = string
  description = "リソース表示名の接頭辞"
}

variable "cloudrun_service_name" {
  type = string
}

variable "cloudrun_uri" {
  type        = string
  description = "Cloud Run の URL（https://...）。uptime check のホスト名導出に使う"
}

variable "cloudsql_instance_name" {
  type        = string
  description = "Cloud SQL インスタンス名（project:を含まない）"
}

variable "alert_emails" {
  type        = list(string)
  default     = []
  description = "通知先メールアドレス。空なら通知チャネルを作成しない"
}

variable "enable_uptime_check" {
  type    = bool
  default = true
}

variable "enable_cloudsql_down_alert" {
  type        = bool
  default     = true
  description = "Cloud SQL 停止アラートを作成する。db-end で夜間停止する dev では false 推奨"
}

variable "uptime_check_path" {
  type    = string
  default = "/api/auth/providers"
}

variable "uptime_check_period" {
  type        = string
  default     = "300s"
  description = "uptime check の間隔（60s/300s/600s/900s）"
}

variable "error_rate_threshold" {
  type        = number
  default     = 0.05
  description = "Cloud Run 5xx 率（0〜1）。5分平均がこれを超えたら通知"
}

variable "latency_p95_threshold_ms" {
  type        = number
  default     = 3000
  description = "Cloud Run リクエストレイテンシ p95（ミリ秒）"
}

variable "cloudsql_cpu_threshold" {
  type        = number
  default     = 0.8
  description = "Cloud SQL CPU 使用率（0〜1）"
}

variable "cloudsql_disk_threshold" {
  type        = number
  default     = 0.85
  description = "Cloud SQL ディスク使用率（0〜1）"
}

variable "cloudsql_down_duration" {
  type        = string
  default     = "300s"
  description = "Cloud SQL が停止（up<1）し続けたら通知するまでの時間"
}

locals {
  channel_ids = [for c in google_monitoring_notification_channel.email : c.id]
  cr_filter   = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.cloudrun_service_name}\""
  sql_id      = "${var.project_id}:${var.cloudsql_instance_name}"
  sql_filter  = "resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${local.sql_id}\""
  uptime_host = trimsuffix(trimprefix(var.cloudrun_uri, "https://"), "/")
}

resource "google_monitoring_notification_channel" "email" {
  for_each     = toset(var.alert_emails)
  project      = var.project_id
  display_name = "${var.name_prefix} alert (${each.value})"
  type         = "email"
  labels = {
    email_address = each.value
  }
}

resource "google_monitoring_alert_policy" "cloudrun_5xx" {
  project               = var.project_id
  display_name          = "${var.name_prefix} Cloud Run 5xx rate"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "5xx ratio > ${var.error_rate_threshold}"
    condition_threshold {
      filter             = "metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\" AND ${local.cr_filter}"
      denominator_filter = "metric.type=\"run.googleapis.com/request_count\" AND ${local.cr_filter}"
      comparison         = "COMPARISON_GT"
      threshold_value    = var.error_rate_threshold
      duration           = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
      trigger {
        count = 1
      }
    }
  }
}

resource "google_monitoring_alert_policy" "cloudrun_latency" {
  project               = var.project_id
  display_name          = "${var.name_prefix} Cloud Run latency p95"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "p95 latency > ${var.latency_p95_threshold_ms}ms"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" AND ${local.cr_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = var.latency_p95_threshold_ms
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
      }
      trigger {
        count = 1
      }
    }
  }
}

resource "google_monitoring_alert_policy" "cloudsql_cpu" {
  project               = var.project_id
  display_name          = "${var.name_prefix} Cloud SQL CPU"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "CPU utilization > ${var.cloudsql_cpu_threshold}"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" AND ${local.sql_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = var.cloudsql_cpu_threshold
      duration        = "600s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
      trigger {
        count = 1
      }
    }
  }
}

resource "google_monitoring_alert_policy" "cloudsql_disk" {
  project               = var.project_id
  display_name          = "${var.name_prefix} Cloud SQL disk"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "Disk utilization > ${var.cloudsql_disk_threshold}"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/disk/utilization\" AND ${local.sql_filter}"
      comparison      = "COMPARISON_GT"
      threshold_value = var.cloudsql_disk_threshold
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
      trigger {
        count = 1
      }
    }
  }
}

# 停止判定: database/up が 1 未満（0）、またはメトリクス欠落（停止時は欠落しうる）。
# db-end で意図的に停止する dev では毎晩通知が出るため、enable_cloudsql_down_alert=false にできる（docs/infra/monitoring.md 参照）。
resource "google_monitoring_alert_policy" "cloudsql_down" {
  count                 = var.enable_cloudsql_down_alert ? 1 : 0
  project               = var.project_id
  display_name          = "${var.name_prefix} Cloud SQL down"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "database/up < 1"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/up\" AND ${local.sql_filter}"
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = var.cloudsql_down_duration

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "database/up absent"
    condition_absent {
      filter   = "metric.type=\"cloudsql.googleapis.com/database/up\" AND ${local.sql_filter}"
      duration = var.cloudsql_down_duration

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
      trigger {
        count = 1
      }
    }
  }
}

resource "google_monitoring_uptime_check_config" "app" {
  count        = var.enable_uptime_check ? 1 : 0
  project      = var.project_id
  display_name = "${var.name_prefix} uptime"
  period       = var.uptime_check_period
  timeout      = "10s"

  http_check {
    path           = var.uptime_check_path
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = local.uptime_host
    }
  }
}

resource "google_monitoring_alert_policy" "uptime" {
  count                 = var.enable_uptime_check ? 1 : 0
  project               = var.project_id
  display_name          = "${var.name_prefix} uptime check failed"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "uptime check failing"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id=\"${google_monitoring_uptime_check_config.app[0].uptime_check_id}\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
      trigger {
        count = 1
      }
    }
  }
}

output "notification_channel_ids" {
  value = local.channel_ids
}

# count 化に伴うアドレス変更（適用済み環境の再作成を防ぐ）
moved {
  from = google_monitoring_alert_policy.cloudsql_down
  to   = google_monitoring_alert_policy.cloudsql_down[0]
}
