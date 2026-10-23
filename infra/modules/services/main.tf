variable "project_id" {
  type = string
}

variable "services" {
  type = set(string)
  default = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ]
}

resource "google_project_service" "this" {
  for_each           = var.services
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
