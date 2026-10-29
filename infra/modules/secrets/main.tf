variable "project_id" {
  type = string
}

# 値を Terraform が生成・保持する secret（DATABASE_URL / AUTH_SECRET / CRON_SECRET）
variable "generated_secret_ids" {
  type = set(string)
}

variable "generated_values" {
  type      = map(string)
  sensitive = true
}

# 枠だけ作り、値は手動で登録する secret（ANTHROPIC_API_KEY / OAuth クライアント等）
# 値の登録: gcloud secrets versions add <id> --data-file=-
variable "manual_secret_ids" {
  type    = set(string)
  default = []
}

# 各 secret の secretAccessor を付与するメンバー（例: "serviceAccount:app@..."）。
# プロジェクト全体ではなく secret 単位で付与し、他の secret へのアクセスを許さない。
# grant_accessor=false（既存SA利用・manage_iam=false）の場合は付与せず、管理者が別途付与する。
variable "grant_accessor" {
  type    = bool
  default = false
}

variable "accessor_member" {
  type    = string
  default = null
}

resource "google_secret_manager_secret" "generated" {
  for_each  = var.generated_secret_ids
  project   = var.project_id
  secret_id = each.key
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "generated" {
  for_each    = var.generated_secret_ids
  secret      = google_secret_manager_secret.generated[each.key].id
  secret_data = var.generated_values[each.key]
}

resource "google_secret_manager_secret" "manual" {
  for_each  = var.manual_secret_ids
  project   = var.project_id
  secret_id = each.key
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "generated_accessor" {
  for_each  = var.grant_accessor ? var.generated_secret_ids : toset([])
  project   = var.project_id
  secret_id = google_secret_manager_secret.generated[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.accessor_member
}

resource "google_secret_manager_secret_iam_member" "manual_accessor" {
  for_each  = var.grant_accessor ? var.manual_secret_ids : toset([])
  project   = var.project_id
  secret_id = google_secret_manager_secret.manual[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.accessor_member
}

output "secret_ids" {
  value = merge(
    { for k, s in google_secret_manager_secret.generated : k => s.secret_id },
    { for k, s in google_secret_manager_secret.manual : k => s.secret_id },
  )
}

output "generated_version_ids" {
  value = [for v in google_secret_manager_secret_version.generated : v.id]
}
