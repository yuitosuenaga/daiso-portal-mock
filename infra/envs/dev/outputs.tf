output "service_url" {
  value = module.cloudrun.uri
}

output "auth_url" {
  value       = local.auth_url
  description = "Google OAuth クライアントの承認済みリダイレクトURI（<auth_url>/api/auth/callback/google）の元になる"
}

output "app_service_account" {
  value = module.iam.app_service_account_email
}

output "required_project_roles" {
  value       = module.iam.required_roles
  description = "manage_iam=false の場合に、アプリSAへクライアント管理者が付与するロール"
}

output "manual_secrets_to_populate" {
  value       = local.manual_secret_ids
  description = "値を手動登録する secret（gcloud secrets versions add <id> --data-file=-）"
}

output "migrate_job_name" {
  value       = one(module.migrate_job[*].name)
  description = "enable_migrate_job=true の場合の migrate Job 名（無効時は null）"
}

output "cloudsql_connection_name" {
  value = module.cloudsql.connection_name
}
