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
      condition     = (!var.db_private_ip_enabled && !var.cloudrun_direct_vpc_egress) || var.enable_private_network
      error_message = "db_private_ip_enabled / cloudrun_direct_vpc_egress には enable_private_network=true が必要。"
    }
    precondition {
      condition     = !var.db_private_ip_enabled || var.cloudrun_direct_vpc_egress
      error_message = "Cloud SQL を private IP 化する場合、Cloud Run が到達できるよう cloudrun_direct_vpc_egress=true も必要。"
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
  extra_services = var.enable_private_network ? [
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
  ] : []
}

# private IP / Direct VPC egress 用（enable_private_network=false なら何も作らない）
module "network" {
  count       = var.enable_private_network ? 1 : 0
  source      = "../../modules/network"
  project_id  = var.project_id
  region      = var.region
  name        = var.name_prefix
  subnet_cidr = var.vpc_subnet_cidr

  depends_on = [module.services]
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
  backup_retained_count                = var.db_backup_retained_count
  transaction_log_retention_days       = var.db_transaction_log_retention_days
  backup_start_time                    = var.db_backup_start_time
  private_ip_enabled                   = var.db_private_ip_enabled
  public_ip_enabled                    = var.db_public_ip_enabled
  private_network_id                   = var.enable_private_network ? module.network[0].network_id : null
  export_enabled                       = var.db_export_enabled
  export_bucket_name                   = var.db_export_bucket_name
  export_schedule                      = var.db_export_schedule
  export_retention_days                = var.db_export_retention_days

  depends_on = [module.services, module.network]
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
  vpc_network              = var.cloudrun_direct_vpc_egress ? module.network[0].network_name : null
  vpc_subnetwork           = var.cloudrun_direct_vpc_egress ? module.network[0].subnetwork_name : null

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
  vpc_network              = var.cloudrun_direct_vpc_egress ? module.network[0].network_name : null
  vpc_subnetwork           = var.cloudrun_direct_vpc_egress ? module.network[0].subnetwork_name : null
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
