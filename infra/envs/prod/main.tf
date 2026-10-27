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

# Budget API 用。ユーザー認証(ADC)では課金/クォータ用プロジェクトの指定が必要なため、
# modules/budget にだけ渡す別名 provider を用意する（他リソースの挙動は変えない）。
provider "google" {
  alias                 = "budget"
  project               = var.project_id
  region                = var.region
  user_project_override = true
  billing_project       = var.project_id
}

data "google_project" "this" {
  project_id = var.project_id
}

locals {
  # 現行 AUTH_URL と同じ決定的な Cloud Run URL。独自ドメインを使う場合は var.auth_url で上書きする。
  default_auth_url = "https://${var.name_prefix}-${data.google_project.this.number}.${var.region}.run.app"
  auth_url         = coalesce(var.auth_url, local.default_auth_url)

  # 既存 secret 名に合わせる場合は var.secret_name_overrides で上書き（例: anthropic_api_key）
  secret_names = merge(
    {
      database_url       = "${var.name_prefix}-database-url"
      auth_secret        = "${var.name_prefix}-auth-secret"
      cron_secret        = "${var.name_prefix}-cron-secret"
      anthropic_api_key  = "${var.name_prefix}-anthropic-api-key"
      auth_google_id     = "${var.name_prefix}-auth-google-id"
      auth_google_secret = "${var.name_prefix}-auth-google-secret"
    },
    var.secret_name_overrides,
  )

  # use_existing_secrets=true: 3 secret の「枠」だけ管理し、値（version）は手動登録
  core_secret_ids = concat(
    [local.secret_names.database_url, local.secret_names.auth_secret],
    var.enable_cron_secret ? [local.secret_names.cron_secret] : [],
  )
  generated_secret_ids = var.use_existing_secrets ? [] : local.core_secret_ids
  manual_secret_ids = concat(
    var.use_existing_secrets ? local.core_secret_ids : [],
    [
      local.secret_names.anthropic_api_key,
      local.secret_names.auth_google_id,
      local.secret_names.auth_google_secret,
    ],
  )

  app_env = merge(
    {
      AUTH_TRUST_HOST = "true"
      AUTH_URL        = local.auth_url
    },
    var.enable_google_login ? { ALLOWED_EMAIL_DOMAINS = join(",", var.allowed_email_domains) } : {},
  )

  app_secret_env = merge(
    {
      DATABASE_URL = local.secret_names.database_url
      AUTH_SECRET  = local.secret_names.auth_secret
    },
    var.enable_cron_secret ? { CRON_SECRET = local.secret_names.cron_secret } : {},
    var.enable_translation ? { ANTHROPIC_API_KEY = local.secret_names.anthropic_api_key } : {},
    var.enable_google_login ? {
      AUTH_GOOGLE_ID     = local.secret_names.auth_google_id
      AUTH_GOOGLE_SECRET = local.secret_names.auth_google_secret
    } : {},
  )
}

# fail closed: Google ログイン有効時に許可ドメインが空なら apply させない
resource "terraform_data" "require_allowed_domains" {
  lifecycle {
    precondition {
      condition     = !var.enable_google_login || length(var.allowed_email_domains) > 0
      error_message = "enable_google_login=true の場合は allowed_email_domains に1つ以上のドメインを指定すること（空のままでは全ドメイン許可になり得るため拒否する）。"
    }
    precondition {
      condition     = !var.enable_scheduler || (var.enable_cron_secret && !var.use_existing_secrets)
      error_message = "enable_scheduler=true には Terraform が生成する CRON_SECRET が必要（enable_cron_secret=true かつ use_existing_secrets=false）。"
    }
  }
}

resource "random_password" "auth_secret" {
  count   = var.use_existing_secrets ? 0 : 1
  length  = 48
  special = false
}

resource "random_password" "cron_secret" {
  count   = var.use_existing_secrets || !var.enable_cron_secret ? 0 : 1
  length  = 48
  special = false
}

module "services" {
  source     = "../../modules/services"
  project_id = var.project_id
}

module "cloudsql" {
  source                               = "../../modules/cloudsql"
  project_id                           = var.project_id
  region                               = var.region
  name                                 = coalesce(var.db_instance_name, "${var.name_prefix}-db")
  database_name                        = var.db_name
  database_user                        = var.db_user
  ssl_mode                             = var.db_ssl_mode
  manage_password                      = var.manage_db_password
  tier                                 = var.db_tier
  disk_size_gb                         = var.db_disk_size_gb
  high_availability                    = var.db_high_availability
  backup_enabled                       = var.db_backup_enabled
  point_in_time_recovery               = var.db_point_in_time_recovery
  deletion_protection                  = var.deletion_protection
  instance_deletion_protection_enabled = var.db_deletion_protection_enabled

  depends_on = [module.services]
}

module "secrets" {
  source     = "../../modules/secrets"
  project_id = var.project_id

  generated_secret_ids = toset(local.generated_secret_ids)
  generated_values = var.use_existing_secrets ? {} : merge(
    {
      (local.secret_names.database_url) = module.cloudsql.database_url
      (local.secret_names.auth_secret)  = random_password.auth_secret[0].result
    },
    var.enable_cron_secret ? { (local.secret_names.cron_secret) = random_password.cron_secret[0].result } : {},
  )

  manual_secret_ids = toset(local.manual_secret_ids)

  depends_on = [module.services]
}

module "iam" {
  source     = "../../modules/iam"
  project_id = var.project_id
  name       = "${var.name_prefix}-app"
  manage_iam = var.manage_iam

  existing_service_account_email = var.existing_service_account_email

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
  concurrency              = var.cloudrun_concurrency
  timeout_seconds          = var.cloudrun_timeout_seconds
  startup_cpu_boost        = var.cloudrun_startup_cpu_boost
  ingress                  = var.cloudrun_ingress
  cpu                      = var.cloudrun_cpu
  memory                   = var.cloudrun_memory

  # secret 本体・バージョン・SA のロール付与が揃ってから作成する
  depends_on = [module.secrets, module.iam]
}

module "migrate_job" {
  count                    = var.enable_migrate_job ? 1 : 0
  source                   = "../../modules/migrate-job"
  project_id               = var.project_id
  region                   = var.region
  name                     = "${var.name_prefix}-migrate"
  service_account_email    = module.iam.app_service_account_email
  cloudsql_connection_name = module.cloudsql.connection_name
  database_url_secret_id   = local.secret_names.database_url
  timeout_seconds          = var.migrate_job_timeout_seconds
  deletion_protection      = var.deletion_protection

  depends_on = [module.secrets, module.iam]
}

module "scheduler" {
  count       = var.enable_scheduler ? 1 : 0
  source      = "../../modules/scheduler"
  project_id  = var.project_id
  region      = var.region
  name        = "${var.name_prefix}-announcement-escalation"
  service_url = module.cloudrun.uri
  cron_secret = random_password.cron_secret[0].result
  schedule    = var.scheduler_schedule

  depends_on = [module.services]
}

# 監視・アラート（末尾に集約。enable_monitoring=false なら何も作らない）
module "monitoring" {
  count                  = var.enable_monitoring ? 1 : 0
  source                 = "../../modules/monitoring"
  project_id             = var.project_id
  name_prefix            = var.name_prefix
  cloudrun_service_name  = module.cloudrun.name
  cloudrun_uri           = module.cloudrun.uri
  cloudsql_instance_name = module.cloudsql.instance_name
  alert_emails           = var.alert_emails

  enable_uptime_check        = var.enable_uptime_check
  enable_cloudsql_down_alert = var.enable_cloudsql_down_alert

  depends_on = [module.services]
}

# 予算アラート（enable_budget_alert=false なら何も作らない）。請求先アカウントの権限が必要。
module "budget" {
  count     = var.enable_budget_alert ? 1 : 0
  source    = "../../modules/budget"
  providers = { google = google.budget }

  project_id         = var.project_id
  billing_account_id = var.billing_account_id
  name_prefix        = var.name_prefix
  monthly_amount     = var.budget_monthly_amount
  currency_code      = var.budget_currency_code
  alert_emails       = var.budget_alert_emails
}

resource "terraform_data" "require_budget_inputs" {
  count = var.enable_budget_alert ? 1 : 0
  lifecycle {
    precondition {
      condition     = var.billing_account_id != null && var.budget_monthly_amount != null
      error_message = "enable_budget_alert=true の場合は billing_account_id と budget_monthly_amount が必須。"
    }
  }
}
