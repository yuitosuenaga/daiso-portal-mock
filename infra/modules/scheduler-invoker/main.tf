# Cloud Scheduler が Cloud Run を OIDC で呼び出すための専用サービスアカウントと invoker 権限。
# Cloud Run を非公開（allow_public_access=false）にしても Scheduler から Cron エンドポイントを叩けるようにする。
# アプリ側は OIDC の Authorization ヘッダーに加えて x-cron-secret も検証する（二重防御）。

variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type        = string
  description = "Scheduler 用サービスアカウントの account_id"
}

variable "cloudrun_service_name" {
  type = string
}

resource "google_service_account" "scheduler" {
  project      = var.project_id
  account_id   = var.name
  display_name = "Cloud Scheduler invoker (${var.name})"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  project  = var.project_id
  location = var.region
  name     = var.cloudrun_service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

output "service_account_email" {
  value = google_service_account.scheduler.email
}
