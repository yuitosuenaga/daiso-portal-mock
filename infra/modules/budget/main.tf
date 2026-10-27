# 予算アラート（google_billing_budget）。プロジェクト単位の月額予算と、しきい値到達時のメール通知。
#
# 重要（権限）:
# - 予算は「請求先アカウント」側のリソース。作成には請求先アカウントに対する
#   Billing Account Administrator（roles/billing.admin）または Billing Account Costs Manager
#   （roles/billing.costsManager）相当が必要。プロジェクトの Editor だけでは作成できない可能性が高い。
#   権限が無い間は envs 側の enable_budget_alert=false（既定）のままにし、請求先管理者へ依頼する。
# - Budget API（billingbudgets.googleapis.com）の有効化が必要（このモジュールで有効化する）。
# - ユーザー認証(ADC)で呼ぶ場合、Budget API は課金/クォータ用プロジェクトの指定が必要。
#   envs 側で user_project_override=true の別名 provider を渡す（envs/*/main.tf 参照）。

terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
    }
  }
}

variable "project_id" {
  type = string
}

variable "billing_account_id" {
  type        = string
  description = "請求先アカウントID（例: 012345-6789AB-CDEF01）。gcloud billing projects describe <project> で確認できる"
}

variable "name_prefix" {
  type        = string
  description = "予算・通知チャネルの表示名の接頭辞"
}

variable "monthly_amount" {
  type        = number
  description = "月額予算額"
}

variable "currency_code" {
  type        = string
  default     = "JPY"
  description = "予算の通貨。請求先アカウントの通貨と一致させる必要がある"
}

variable "threshold_percents" {
  type        = list(number)
  default     = [0.5, 0.9, 1.0]
  description = "実績額に対する通知しきい値（0.5 = 50%）"
}

variable "forecast_threshold_percents" {
  type        = list(number)
  default     = [1.0]
  description = "予測額に対する通知しきい値"
}

variable "alert_emails" {
  type        = list(string)
  default     = []
  description = "通知先メール。空なら請求先アカウントの管理者・ユーザー（既定の IAM 受信者）にのみ通知される"
}

data "google_project" "this" {
  project_id = var.project_id
}

resource "google_project_service" "billingbudgets" {
  project            = var.project_id
  service            = "billingbudgets.googleapis.com"
  disable_on_destroy = false
}

resource "google_monitoring_notification_channel" "budget_email" {
  for_each     = toset(var.alert_emails)
  project      = var.project_id
  display_name = "${var.name_prefix} budget (${each.value})"
  type         = "email"
  labels = {
    email_address = each.value
  }
}

resource "google_billing_budget" "this" {
  billing_account = var.billing_account_id
  display_name    = "${var.name_prefix}-monthly"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = var.currency_code
      units         = tostring(floor(var.monthly_amount))
    }
  }

  dynamic "threshold_rules" {
    for_each = var.threshold_percents
    content {
      threshold_percent = threshold_rules.value
      spend_basis       = "CURRENT_SPEND"
    }
  }

  dynamic "threshold_rules" {
    for_each = var.forecast_threshold_percents
    content {
      threshold_percent = threshold_rules.value
      spend_basis       = "FORECASTED_SPEND"
    }
  }

  all_updates_rule {
    monitoring_notification_channels = [for c in google_monitoring_notification_channel.budget_email : c.id]
    # 通知先メールを指定した場合のみ既定の請求先管理者通知を止める
    disable_default_iam_recipients = length(var.alert_emails) > 0
  }

  depends_on = [google_project_service.billingbudgets]
}

output "budget_name" {
  value = google_billing_budget.this.name
}
