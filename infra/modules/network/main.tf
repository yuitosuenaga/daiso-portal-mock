# private IP の Cloud SQL と Cloud Run Direct VPC egress 用の VPC。
# 必要 API: compute.googleapis.com, servicenetworking.googleapis.com
# 権限: compute.networkAdmin 相当 + servicenetworking.services.addPeering
#       （Editor で足りない場合は roles/servicenetworking.networksAdmin を管理者に依頼）

variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type = string
}

# Direct VPC egress の subnet。Cloud Run は /26 以上、インスタンス数に応じて余裕を持たせる
variable "subnet_cidr" {
  type    = string
  default = "10.10.0.0/24"
}

# Private Service Access（Cloud SQL 用ピアリング）の予約レンジ長
variable "psa_prefix_length" {
  type    = number
  default = 20
}

resource "google_compute_network" "this" {
  project                 = var.project_id
  name                    = "${var.name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "run" {
  project                  = var.project_id
  name                     = "${var.name}-run"
  region                   = var.region
  network                  = google_compute_network.this.id
  ip_cidr_range            = var.subnet_cidr
  private_ip_google_access = true
}

resource "google_compute_global_address" "psa" {
  project       = var.project_id
  name          = "${var.name}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = var.psa_prefix_length
  network       = google_compute_network.this.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.this.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa.name]
  # Cloud SQL 削除後に peering が使用中扱いで destroy が失敗するのを避ける（peering は残る＝ダングリングに注意）
  deletion_policy = "ABANDON"
}

output "network_id" {
  value = google_compute_network.this.id
}

output "network_name" {
  value = google_compute_network.this.name
}

output "subnetwork_name" {
  value = google_compute_subnetwork.run.name
}

# Cloud SQL はピアリング確立後に作る必要がある（depends_on に使う）
output "psa_connection" {
  value = google_service_networking_connection.psa.id
}
