# state 用 GCS バケットと、その作成に必要な API の有効化。
# 初回のみローカル state で apply する（state は小さく再作成可能なので git 管理しない）。
# 以後 envs/* は、ここで作ったバケットを backend として使う。

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "state バケットを置くプロジェクトID"
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "state_bucket_name" {
  type        = string
  description = "グローバル一意なバケット名（例: <project_id>-tfstate）"
}

resource "google_project_service" "bootstrap" {
  for_each = toset([
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "storage.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

resource "google_storage_bucket" "tfstate" {
  name                        = var.state_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 30
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.bootstrap]
}

output "state_bucket" {
  value = google_storage_bucket.tfstate.name
}
