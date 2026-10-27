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

# 初回はプレースホルダ。migrate ターゲットのイメージは `gcloud run jobs update --image` で
# 差し替え、Terraform は ignore_changes で触らない。
variable "image" {
  type    = string
  default = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "cloudsql_connection_name" {
  type = string
}

variable "database_url_secret_id" {
  type        = string
  description = "DATABASE_URL を保持する Secret Manager の secret_id（latest を参照）"
}

variable "timeout_seconds" {
  type    = number
  default = 600
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

# Direct VPC egress（private IP の Cloud SQL 用）。null なら無効。
variable "vpc_network" {
  type    = string
  default = null
}

variable "vpc_subnetwork" {
  type    = string
  default = null
}

variable "vpc_egress" {
  type    = string
  default = "PRIVATE_RANGES_ONLY"
}

resource "google_cloud_run_v2_job" "this" {
  project             = var.project_id
  name                = var.name
  location            = var.region
  deletion_protection = var.deletion_protection

  template {
    task_count  = 1
    parallelism = 1

    template {
      service_account = var.service_account_email
      max_retries     = 0
      timeout         = "${var.timeout_seconds}s"

      dynamic "vpc_access" {
        for_each = var.vpc_network == null ? [] : [1]
        content {
          egress = var.vpc_egress
          network_interfaces {
            network    = var.vpc_network
            subnetwork = var.vpc_subnetwork
          }
        }
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
        }

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.database_url_secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client,
      client_version,
    ]
  }
}

output "name" {
  value = google_cloud_run_v2_job.this.name
}
