# セキュリティ監視アラート（docs/infra/security-monitoring.md §2・§5 の上位 1・2）。
# - Admin Activity（Cloud Audit Logs）のログ一致型アラート
# - 認証系の構造化ログ（jsonPayload.message="auth"）のログベースメトリクスとしきい値アラート、1 件通知のログ一致型
# 同形のポリシーが多数あるため、main.tf の個別 resource 記述と違い、本ファイルは for_each でまとめて重複を排除している。
# main.tf の locals（channel_ids / cr_filter）を再利用する。しきい値はすべて初期値で、2〜4 週の運用で調整する前提。
# enable_security_alerts=false なら本ファイルのリソースはすべて作られない（enable_monitoring=false のときはモジュールごと作られない）。

variable "enable_security_alerts" {
  type        = bool
  default     = true
  description = "セキュリティ監視アラート（Admin Activity・認証系）とログベースメトリクスをすべて作成する"
}

variable "security_trusted_principals" {
  type        = list(string)
  default     = []
  description = "想定された操作者（terraform apply 担当、定期エクスポート SA 等）の principalEmail。Cloud Run 変更・Secret 変更・エクスポート用 GCS の IAM 変更・Cloud SQL export・Cloud SQL instances の update/patch のアラートからのみ除外する。IAM/SA 鍵・監視無効化・Cloud SQL の clone/restore/users・認証系には適用しない。db-start/db-end（activation-policy の patch）の実行者や terraform apply 担当を入れる想定。trusted による authorizedNetworks 変更は検知されない（受容したリスク）"

  validation {
    # フィルタ文字列に埋め込むため、フィルタを壊しうる文字（ダブルクォート・バックスラッシュ・空白）を禁止する
    condition     = alltrue([for p in var.security_trusted_principals : can(regex("^[^\"\\\\\\s]+$", p))])
    error_message = "security_trusted_principals にダブルクォート・バックスラッシュ・空白を含む値は指定できません。"
  }
}

variable "login_failure_threshold" {
  type        = number
  default     = 20
  description = "login_failure（全体）の件数。login_failure_window 内にこれを超えたら通知"
}

variable "login_failure_window" {
  type        = string
  default     = "600s"
  description = "login_failure の集計窓（秒数に s を付ける）"
}

variable "login_locked_threshold" {
  type        = number
  default     = 3
  description = "login_locked の件数。login_locked_window 内にこれを超えたら通知"
}

variable "login_locked_window" {
  type        = string
  default     = "3600s"
  description = "login_locked の集計窓（秒数に s を付ける）"
}

variable "login_blocked_threshold" {
  type        = number
  default     = 30
  description = "login_blocked（全体）の件数。login_blocked_window 内にこれを超えたら通知"
}

variable "login_blocked_window" {
  type        = string
  default     = "3600s"
  description = "login_blocked の集計窓（秒数に s を付ける）"
}

variable "security_log_notification_interval" {
  type        = string
  default     = "3600s"
  description = "セキュリティ用ログ一致型アラートの通知間隔（同一ポリシーの再通知を抑える最短間隔。秒数に s を付ける）"
}

variable "auth_threshold_auto_close" {
  type        = string
  default     = "1800s"
  description = "認証系しきい値アラートのインシデントを自動クローズするまでの時間（ログベースメトリクスはログが無いとデータ点が出ず回復判定されないため、短めにする。error_log_auto_close と同程度）"
}

variable "security_log_auto_close" {
  type        = string
  default     = "86400s"
  description = "セキュリティ用ログ一致型アラートのインシデントを自動クローズするまでの時間"
}

locals {
  sec_enabled = var.enable_security_alerts

  # Admin Activity ログ。Data Access ログ（未有効）は対象外。
  audit_base = "logName=\"projects/${var.project_id}/logs/cloudaudit.googleapis.com%2Factivity\""

  # 想定された操作者の除外句。リストが空なら条件を付けない（空の OR () を作らない）。
  # 適用先は Cloud Run 変更・Secret 変更・GCS IAM 変更・Cloud SQL export・Cloud SQL instances update/patch のみ。
  trusted_exclusion = length(var.security_trusted_principals) == 0 ? "" : " AND NOT protoPayload.authenticationInfo.principalEmail=(${join(" OR ", [for p in var.security_trusted_principals : "\"${p}\""])})"

  # 認証イベントのログベースメトリクス名（無接頭辞だとプロジェクト内で衝突しうるため name_prefix を付ける）。
  # メトリクス定義としきい値アラートのフィルタで同じ値を参照する。
  auth_metric_name = "${var.name_prefix}-auth-events"

  # methodName は GCP ドキュメント上の名称で記述している。実ログでの確認が取れていないものは「要確認」と注記する。
  # 正規表現中の「.」はエスケープせずに任意 1 文字として扱う（フィルタ内のバックスラッシュ二重エスケープを避けるため。誤一致は実質起きない）。
  admin_activity_alerts = {
    # A-1: IAM ポリシー変更・サービスアカウント/鍵の作成。侵害された正規操作者こそが脅威のため trusted は除外しない。
    # SetIamPolicy はプロジェクト（"SetIamPolicy"）・Cloud Run（google.cloud.run.v*.Services.SetIamPolicy）・
    # Secret Manager（google.cloud.secretmanager.v1.SecretManagerService.SetIamPolicy）等を末尾一致で拾う。
    # 要確認: 各サービスの SetIamPolicy methodName は実ログで確認する。
    iam_and_keys = {
      display_name = "IAM policy / service account key change"
      filter       = "${local.audit_base} AND (protoPayload.methodName=~\"SetIamPolicy$\" OR protoPayload.methodName=(\"google.iam.admin.v1.CreateServiceAccountKey\" OR \"google.iam.admin.v1.UploadServiceAccountKey\" OR \"google.iam.admin.v1.CreateServiceAccount\"))"
    }

    # A-2: 監視・ログの無効化（痕跡消去）。trusted は除外しない。
    # 注意: terraform apply で本モジュールのアラートポリシー/通知チャネル/ログベースメトリクスを更新・削除したときにも発火しうる
    # （apply 担当の正規操作でも通知が来る。計画的な変更なら無視してよい）。
    # 要確認: ConfigServiceV2 の Create/Update/Delete 系 methodName の実在、AlertPolicyService / NotificationChannelService / MetricsServiceV2 の完全名。
    disable_monitoring = {
      display_name = "logging / alerting config changed"
      filter       = "${local.audit_base} AND (protoPayload.methodName=~\"^google.logging.v2.ConfigServiceV2.(Create|Update|Delete)(Sink|Exclusion|Bucket|View|Link)$\" OR protoPayload.methodName=~\"^google.monitoring.v3.(AlertPolicyService|NotificationChannelService).(Delete|Update)\" OR protoPayload.methodName=~\"^google.logging.v2.MetricsServiceV2.(Update|Delete)LogMetric$\")"
    }

    # A-3a: Cloud SQL export（DB ダンプの持ち出し）。定期エクスポート SA は正規に実行するため trusted を除外する。
    # 要確認: methodName は実ログで確認する（cloudsql.instances.export 形式と google.cloud.sql.v1beta4.* 形式の両方を指定）。
    cloudsql_export = {
      display_name = "Cloud SQL export"
      filter       = "${local.audit_base} AND protoPayload.serviceName=\"cloudsql.googleapis.com\" AND protoPayload.methodName=(\"cloudsql.instances.export\" OR \"google.cloud.sql.v1beta4.SqlInstancesService.Export\")${local.trusted_exclusion}"
    }

    # A-3b: Cloud SQL instances の update/patch（authorizedNetworks 等の設定変更）。
    # db-start/db-end（gcloud sql instances patch --activation-policy）や terraform apply で正規に発生するため trusted を除外する。
    # 受容したリスク: trusted にした操作者による authorizedNetworks 変更は検知されない。
    # 要確認: methodName（cloudsql.instances.update 形式と v1beta4 の Update / Patch）は実ログで確認する。
    cloudsql_update = {
      display_name = "Cloud SQL instance update / patch by non-trusted principal"
      filter       = "${local.audit_base} AND protoPayload.serviceName=\"cloudsql.googleapis.com\" AND protoPayload.methodName=(\"cloudsql.instances.update\" OR \"google.cloud.sql.v1beta4.SqlInstancesService.Update\" OR \"google.cloud.sql.v1beta4.SqlInstancesService.Patch\")${local.trusted_exclusion}"
    }

    # A-3c: Cloud SQL の clone / restore / ユーザー変更。trusted は除外しない。
    # terraform apply による users の変更でも発火しうる。
    # 要確認: restore 系の methodName（cloudsql.instances.restoreBackup / cloudsql.backupRuns.restore のどちらが出るか。両方含めて取りこぼしを避ける）と、
    # users 系・v1beta4 形式の名称を実ログで確認する。
    cloudsql_users_clone_restore = {
      display_name = "Cloud SQL clone / restore / user change"
      filter       = "${local.audit_base} AND protoPayload.serviceName=\"cloudsql.googleapis.com\" AND protoPayload.methodName=(\"cloudsql.instances.clone\" OR \"cloudsql.instances.restoreBackup\" OR \"cloudsql.backupRuns.restore\" OR \"cloudsql.users.create\" OR \"cloudsql.users.update\" OR \"cloudsql.users.delete\" OR \"google.cloud.sql.v1beta4.SqlInstancesService.Clone\" OR \"google.cloud.sql.v1beta4.SqlInstancesService.RestoreBackup\" OR \"google.cloud.sql.v1beta4.SqlUsersService.Insert\" OR \"google.cloud.sql.v1beta4.SqlUsersService.Update\" OR \"google.cloud.sql.v1beta4.SqlUsersService.Delete\")"
    }

    # A-4: Cloud Run サービスの変更（不正デプロイ）。trusted（デプロイ担当）以外の実行のみ通知。
    # v1 は ReplaceService/DeleteService、v2 は UpdateService/DeleteService が基本だが、取りこぼし防止で v1/v2 とも 3 種を許容する。
    # 要確認: methodName は実ログで確認する。
    cloudrun_change = {
      display_name = "Cloud Run service changed by non-trusted principal"
      filter       = "${local.audit_base} AND protoPayload.serviceName=\"run.googleapis.com\" AND protoPayload.methodName=~\"^google.cloud.run.v[12].Services.(ReplaceService|UpdateService|DeleteService)$\"${local.trusted_exclusion}"
    }

    # A-5: Secret の値のすり替え・削除。trusted（ローテーション担当）以外の実行のみ通知。
    # 要確認: methodName は実ログで確認する。
    secret_change = {
      display_name = "Secret version / secret changed by non-trusted principal"
      filter       = "${local.audit_base} AND protoPayload.serviceName=\"secretmanager.googleapis.com\" AND protoPayload.methodName=~\"^google.cloud.secretmanager.v1.SecretManagerService.(AddSecretVersion|DestroySecretVersion|DisableSecretVersion|DeleteSecret)$\"${local.trusted_exclusion}"
    }

    # A-6: GCS バケットの IAM 変更（DB ダンプ持ち出し・公開設定）。trusted 以外の実行のみ通知。
    # エクスポート用バケット名は本モジュールに渡されていないため、プロジェクト内の全バケットを対象にする
    # （tfstate バケットが同一プロジェクトにある場合はそちらの変更も拾う）。
    # 要確認: storage.setIamPermissions / storage.buckets.update は実ログで確認する（buckets.update はラベル更新等でも出る）。
    gcs_iam_change = {
      display_name = "GCS bucket IAM / settings changed by non-trusted principal"
      filter       = "${local.audit_base} AND protoPayload.serviceName=\"storage.googleapis.com\" AND protoPayload.methodName=(\"storage.setIamPermissions\" OR \"storage.buckets.update\")${local.trusted_exclusion}"
    }
  }

  # B-4: 1 件で通知するアプリログ（構造化ログのフィールドは jsonPayload 直下。出所は auth-audit.ts / logger.ts の write()）。
  # reason の文字列は src/lib/server/google-authorize.ts（account_inactive）で確認済み。
  # Google 経由に絞るため method="google" を付ける（Credentials 側は無効化アカウントでも invalid_credentials で記録され区別されない）。
  app_event_alerts = {
    google_account_inactive = {
      display_name = "Google login by inactive account"
      filter       = "${local.cr_filter} AND jsonPayload.message=\"auth\" AND jsonPayload.method=\"google\" AND jsonPayload.reason=\"account_inactive\""
    }
    account_provisioned = {
      display_name = "helpdesk account auto-provisioned"
      filter       = "${local.cr_filter} AND jsonPayload.message=\"auth\" AND jsonPayload.type=\"account_provisioned\""
    }
    staff_role_admin = {
      display_name = "helpdesk staff role changed to admin"
      filter       = "${local.cr_filter} AND jsonPayload.message=\"helpdesk staff role changed\" AND jsonPayload.role=\"admin\""
    }
    staff_created = {
      display_name = "helpdesk staff created"
      filter       = "${local.cr_filter} AND jsonPayload.message=\"helpdesk staff created\""
    }
    staff_exported = {
      display_name = "helpdesk staff exported"
      filter       = "${local.cr_filter} AND jsonPayload.message=\"helpdesk staff exported\""
    }
  }

  # B-1〜B-3: ログベースメトリクスのしきい値アラート。
  # B-3（login_blocked）は本来「同一アカウント単位」で見たいが、identifierHash をラベルにするとカーディナリティが爆発するため
  # 断念し、全体件数のみを見る（同一アカウント単位の調査は Logs Explorer で identifierHash を絞る）。
  auth_threshold_alerts = {
    login_failure = {
      display_name = "login_failure spike"
      threshold    = var.login_failure_threshold
      window       = var.login_failure_window
    }
    login_locked = {
      display_name = "login_locked spike"
      threshold    = var.login_locked_threshold
      window       = var.login_locked_window
    }
    login_blocked = {
      display_name = "login_blocked spike"
      threshold    = var.login_blocked_threshold
      window       = var.login_blocked_window
    }
  }
}

# --- A. Admin Activity（Cloud Audit Logs）---
# 1 件ごとに通知する。通知間隔と auto_close で連発を抑える。
resource "google_monitoring_alert_policy" "security_audit" {
  for_each              = local.sec_enabled ? local.admin_activity_alerts : {}
  project               = var.project_id
  display_name          = "${var.name_prefix} security: ${each.value.display_name}"
  combiner              = "OR"
  notification_channels = local.channel_ids

  documentation {
    content   = "Admin Activity ログのセキュリティ検知。対応は docs/infra/security-monitoring.md を参照。"
    mime_type = "text/markdown"
  }

  conditions {
    display_name = each.value.display_name
    condition_matched_log {
      filter = each.value.filter
    }
  }

  alert_strategy {
    notification_rate_limit {
      period = var.security_log_notification_interval
    }
    auto_close = var.security_log_auto_close
  }
}

# --- B-0. 認証イベントのログベースメトリクス ---
# ラベルは type / reason / portal のみ。identifierHash（アカウント単位のハッシュ）は値の種類が無制限に増え、
# メトリクスのカーディナリティが爆発するためラベルにしない。
# 注意: ログベースメトリクスは作成後に出力されたログしか数えない（過去分の遡及集計はされない）。
resource "google_logging_metric" "auth_events" {
  count   = local.sec_enabled ? 1 : 0
  project = var.project_id
  name    = local.auth_metric_name
  filter  = "${local.cr_filter} AND jsonPayload.message=\"auth\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"

    labels {
      key         = "type"
      value_type  = "STRING"
      description = "認証イベント種別（login_success / login_failure / login_locked / login_blocked / account_provisioned）"
    }
    labels {
      key         = "reason"
      value_type  = "STRING"
      description = "失敗理由（invalid_credentials / account_inactive 等。無い場合は空）"
    }
    labels {
      key         = "portal"
      value_type  = "STRING"
      description = "applicant / helpdesk"
    }
  }

  label_extractors = {
    type   = "EXTRACT(jsonPayload.type)"
    reason = "EXTRACT(jsonPayload.reason)"
    portal = "EXTRACT(jsonPayload.portal)"
  }
}

# --- B-1〜B-3. 認証イベント件数のしきい値アラート ---
resource "google_monitoring_alert_policy" "auth_threshold" {
  # フィルタが local 経由の文字列でメトリクス resource を直接参照しなくなったため、作成順序を明示する。
  depends_on = [google_logging_metric.auth_events]

  for_each              = local.sec_enabled ? local.auth_threshold_alerts : {}
  project               = var.project_id
  display_name          = "${var.name_prefix} security: ${each.value.display_name}"
  combiner              = "OR"
  notification_channels = local.channel_ids

  documentation {
    content   = "認証イベント（${each.key}）の件数がしきい値を超えました。対応は docs/infra/security-monitoring.md を参照。"
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "${each.key} count > ${each.value.threshold} in ${each.value.window}"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${local.auth_metric_name}\" AND metric.labels.type=\"${each.key}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = each.value.threshold
      duration        = "0s"
      # DELTA のログベースメトリクスは該当ログが無いとデータ点が出ない。INACTIVE にしないと一度開いたインシデントが回復判定されず、
      # 次の攻撃で再通知されない。provider 6.50.0 のスキーマに evaluation_missing_data があることを確認済み。
      evaluation_missing_data = "EVALUATION_MISSING_DATA_INACTIVE"

      aggregations {
        alignment_period     = each.value.window
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
      }
      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = var.auth_threshold_auto_close
  }
}

# --- B-4. アプリログ 1 件で通知 ---
resource "google_monitoring_alert_policy" "security_app_log" {
  for_each              = local.sec_enabled ? local.app_event_alerts : {}
  project               = var.project_id
  display_name          = "${var.name_prefix} security: ${each.value.display_name}"
  combiner              = "OR"
  notification_channels = local.channel_ids

  documentation {
    content   = "アプリの監査ログのセキュリティ検知。対応は docs/infra/security-monitoring.md を参照。"
    mime_type = "text/markdown"
  }

  conditions {
    display_name = each.value.display_name
    condition_matched_log {
      filter = each.value.filter
    }
  }

  alert_strategy {
    notification_rate_limit {
      period = var.security_log_notification_interval
    }
    auto_close = var.security_log_auto_close
  }
}

# 未実装（理由は docs/infra/monitoring.md 参照）:
# - 業務時間外（JST）の admin 操作・エクスポートの昇格: 時刻条件はアラートポリシー単体では表現できない。
# - Secret Manager の AccessSecretVersion: Data Access ログが未有効のため。
# - Cloud SQL postgres.log の "password authentication failed": ログが出力されるか未確認のため。
