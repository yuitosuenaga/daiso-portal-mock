variable "project_id" {
  type = string
}

variable "name" {
  type        = string
  description = "アプリ実行用サービスアカウントの account_id"
}

# Editor 権限ではプロジェクト IAM を変更できない。
# false にすると SA 作成のみ行い、ロール付与はクライアント管理者が別途実施する
# （付与すべきロールは output `required_roles` を参照）。
variable "manage_iam" {
  type    = bool
  default = true
}

locals {
  required_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
  ]
}

resource "google_service_account" "app" {
  project      = var.project_id
  account_id   = var.name
  display_name = "portal-mock app runtime (${var.name})"
}

resource "google_project_iam_member" "app" {
  for_each = var.manage_iam ? toset(local.required_roles) : toset([])
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.app.email}"
}

output "app_service_account_email" {
  value = google_service_account.app.email
}

output "required_roles" {
  value = local.required_roles
}
