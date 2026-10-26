variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type = string
}

variable "service_account_email" {
  type = string
}

# 初回はプレースホルダ。以後のイメージ更新は CI / `gcloud run deploy` が行い、
# Terraform は ignore_changes で触らない。
variable "image" {
  type    = string
  default = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "cloudsql_connection_name" {
  type = string
}

variable "env" {
  type        = map(string)
  description = "平文の環境変数"
  default     = {}
}

variable "secret_env" {
  type        = map(string)
  description = "環境変数名 => Secret Manager の secret_id（latest を参照）"
  default     = {}
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 3
}

# Editor 権限では allUsers の付与に失敗する場合がある（組織ポリシー含む）。
variable "allow_public_access" {
  type    = bool
  default = true
}

variable "concurrency" {
  type    = number
  default = 80
}

variable "timeout_seconds" {
  type    = number
  default = 300
}

variable "startup_cpu_boost" {
  type    = bool
  default = true
}

variable "ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

resource "google_cloud_run_v2_service" "this" {
  project             = var.project_id
  name                = var.name
  location            = var.region
  ingress             = var.ingress
  deletion_protection = var.deletion_protection

  template {
    service_account                  = var.service_account_email
    max_instance_request_concurrency = var.concurrency
    timeout                          = "${var.timeout_seconds}s"

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloudsql_connection_name]
      }
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        startup_cpu_boost = var.startup_cpu_boost
        cpu_idle          = true # リクエスト時のみ CPU 割当（API 既定と同じ）
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
      build_config, # `gcloud run deploy --source` が付与するビルド情報。Terraform は触らない
      scaling,      # サービス単位の scaling ブロック（API が既定値を返す）
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.allow_public_access ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "uri" {
  value = google_cloud_run_v2_service.this.uri
}

output "name" {
  value = google_cloud_run_v2_service.this.name
}
