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

output "secret_ids" {
  value = merge(
    { for k, s in google_secret_manager_secret.generated : k => s.secret_id },
    { for k, s in google_secret_manager_secret.manual : k => s.secret_id },
  )
}

output "generated_version_ids" {
  value = [for v in google_secret_manager_secret_version.generated : v.id]
}
