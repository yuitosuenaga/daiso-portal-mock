# dev / prod 共通のルートモジュール（envs/dev と envs/prod は同一内容。差分は tfvars のみ）。
#
# 初期化: terraform init -backend-config="bucket=<state bucket>" -backend-config="prefix=<env>"
# 適用  : terraform apply -var-file=<env>.tfvars

terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "this" {
  project_id = var.project_id
}

locals {
  # 現行 AUTH_URL と同じ決定的な Cloud Run URL。独自ドメインを使う場合は var.auth_url で上書きする。
  default_auth_url = "https://${var.name_prefix}-${data.google_project.this.number}.${var.region}.run.app"
  auth_url         = coalesce(var.auth_url, local.default_auth_url)

  secret_names = {
    database_url       = "${var.name_prefix}-database-url"
    auth_secret        = "${var.name_prefix}-auth-secret"
    cron_secret        = "${var.name_prefix}-cron-secret"
    anthropic_api_key  = "${var.name_prefix}-anthropic-api-key"
    auth_google_id     = "${var.name_prefix}-auth-google-id"
    auth_google_secret = "${var.name_prefix}-auth-google-secret"
  }

  app_env = merge(
    {
      AUTH_TRUST_HOST = "true"
      AUTH_URL        = local.auth_url
    },
    var.enable_google_login ? { ALLOWED_EMAIL_DOMAIN = var.allowed_email_domain } : {},
  )

  app_secret_env = merge(
    {
      DATABASE_URL = local.secret_names.database_url
      AUTH_SECRET  = local.secret_names.auth_secret
      CRON_SECRET  = local.secret_names.cron_secret
    },
    var.enable_translation ? { ANTHROPIC_API_KEY = local.secret_names.anthropic_api_key } : {},
    var.enable_google_login ? {
      AUTH_GOOGLE_ID     = local.secret_names.auth_google_id
      AUTH_GOOGLE_SECRET = local.secret_names.auth_google_secret
    } : {},
  )
}

resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "random_password" "cron_secret" {
  length  = 48
  special = false
}

module "services" {
  source     = "../../modules/services"
  project_id = var.project_id
}

module "cloudsql" {
  source                 = "../../modules/cloudsql"
  project_id             = var.project_id
  region                 = var.region
  name                   = "${var.name_prefix}-db"
  tier                   = var.db_tier
  disk_size_gb           = var.db_disk_size_gb
  high_availability      = var.db_high_availability
  backup_enabled         = var.db_backup_enabled
  point_in_time_recovery = var.db_point_in_time_recovery
  deletion_protection    = var.deletion_protection

  depends_on = [module.services]
}

module "secrets" {
  source     = "../../modules/secrets"
  project_id = var.project_id

  generated_secret_ids = toset([
    local.secret_names.database_url,
    local.secret_names.auth_secret,
    local.secret_names.cron_secret,
  ])
  generated_values = {
    (local.secret_names.database_url) = module.cloudsql.database_url
    (local.secret_names.auth_secret)  = random_password.auth_secret.result
    (local.secret_names.cron_secret)  = random_password.cron_secret.result
  }

  manual_secret_ids = toset([
    local.secret_names.anthropic_api_key,
    local.secret_names.auth_google_id,
    local.secret_names.auth_google_secret,
  ])

  depends_on = [module.services]
}

module "iam" {
  source     = "../../modules/iam"
  project_id = var.project_id
  name       = "${var.name_prefix}-app"
  manage_iam = var.manage_iam

  depends_on = [module.services]
}

module "cloudrun" {
  source                   = "../../modules/cloudrun"
  project_id               = var.project_id
  region                   = var.region
  name                     = var.name_prefix
  service_account_email    = module.iam.app_service_account_email
  cloudsql_connection_name = module.cloudsql.connection_name
  env                      = local.app_env
  secret_env               = local.app_secret_env
  min_instances            = var.min_instances
  max_instances            = var.max_instances
  allow_public_access      = var.allow_public_access
  deletion_protection      = var.deletion_protection

  # secret 本体・バージョン・SA のロール付与が揃ってから作成する
  depends_on = [module.secrets, module.iam]
}

module "scheduler" {
  count       = var.enable_scheduler ? 1 : 0
  source      = "../../modules/scheduler"
  project_id  = var.project_id
  region      = var.region
  name        = "${var.name_prefix}-announcement-escalation"
  service_url = module.cloudrun.uri
  cron_secret = random_password.cron_secret.result
  schedule    = var.scheduler_schedule

  depends_on = [module.services]
}
