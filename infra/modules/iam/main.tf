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

# 既存SA（例: デフォルト compute SA）を使う場合にそのメールを指定。SA 作成とロール付与は行わない。
variable "existing_service_account_email" {
  type    = string
  default = null
}

locals {
  use_existing = var.existing_service_account_email != null
  # プロジェクト全体に付与するロール。Secret Manager の secretAccessor はプロジェクト全体に付与せず、
  # アプリが参照する secret 単位で付与する（modules/secrets の accessor_member）。
  required_roles = [
    "roles/cloudsql.client",
  ]
}

resource "google_service_account" "app" {
  count        = local.use_existing ? 0 : 1
  project      = var.project_id
  account_id   = var.name
  display_name = "portal-mock app runtime (${var.name})"
}

resource "google_project_iam_member" "app" {
  for_each = var.manage_iam && !local.use_existing ? toset(local.required_roles) : toset([])
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.app[0].email}"
}

output "app_service_account_email" {
  value = local.use_existing ? var.existing_service_account_email : google_service_account.app[0].email
}

output "required_roles" {
  value = local.required_roles
}
