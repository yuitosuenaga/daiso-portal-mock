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

# state バケットを読み書きするメンバー（例: ["group:infra-admins@example.com"]）。
# state には DB 接続文字列・生成した secret などの機密値が平文で入る。ここに挙げたメンバーだけが
# 読み書きできるようにし、プロジェクトの Editor / Owner など広いロール経由のアクセスは別途見直すこと。
# 既定の空リストでは何も付与しない（現行のアクセス状態を変えない）。
variable "state_access_members" {
  type        = list(string)
  default     = []
  description = "state バケットに roles/storage.objectAdmin を付与するメンバー（user:/group:/serviceAccount: 形式）"
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

  # state の消失は復旧が難しいため、誤った destroy を止める。
  lifecycle {
    prevent_destroy = true
  }

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

resource "google_storage_bucket_iam_member" "state_access" {
  for_each = toset(var.state_access_members)
  bucket   = google_storage_bucket.tfstate.name
  role     = "roles/storage.objectAdmin"
  member   = each.key
}

output "state_bucket" {
  value = google_storage_bucket.tfstate.name
}
