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

# 本番化で追加する API（compute / servicenetworking 等）。既定は空で現行と同一。
variable "extra_services" {
  type    = set(string)
  default = []
}

resource "google_project_service" "this" {
  for_each           = setunion(var.services, var.extra_services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
