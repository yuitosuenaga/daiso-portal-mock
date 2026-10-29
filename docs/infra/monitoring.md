# 監視・アラート（modules/monitoring）

クライアント要件確定前の雛形。`enable_monitoring = true`（既定 false）で有効化する。閾値・通知先はすべて差し替え可能。

## 有効化

```hcl
# dev.tfvars / prod.tfvars
enable_monitoring = true
alert_emails      = ["ops@example.com"]   # 空なら通知チャネルを作らない（ポリシーのみ作成）
```

閾値は `infra/modules/monitoring` の変数デフォルト。変更する場合は `envs/*/main.tf` の末尾 `module "monitoring"` に変数を渡す（要件確定後に envs 側の変数として昇格させる）。

## 監視項目と閾値の根拠

| 項目 | 条件（既定） | 根拠 |
|---|---|---|
| Cloud Run 5xx 率 | 5分平均 > 5% | 低トラフィックのため絶対件数ではなく率。コールドスタート起因の散発エラーを許容しつつ、継続障害を検知 |
| Cloud Run レイテンシ p95 | > 3000ms が5分継続 | 通常画面は数百ms。翻訳（Anthropic API）呼び出しを含む処理があるため余裕を持たせる |
| Cloud SQL CPU | 平均 > 80% が10分継続 | db-f1-micro は共有 vCPU で張り付きやすい。短時間スパイクは無視 |
| Cloud SQL ディスク | > 85% | ディスク自動拡張が無効/上限ありの場合に枯渇前に対処できる余裕 |
| Cloud SQL 停止 | `database/up` < 1 または欠落が5分 | 停止時はメトリクスが欠落することがあるため absent 条件も併用 |
| アプリ ERROR ログ | `severity>=ERROR` が1件でも出たら通知（通知間隔 5 分、30 分で自動クローズ） | 捕捉されなかったリクエストエラー(`[request-error]`、runbook §3.5)や `load failed` は logger.error で出るため、1つの条件で拾える。ログベースは件数閾値を持てないので、通知間隔で連発を抑える |
| 稼働確認 (uptime) | `/api/auth/providers` が複数地点で失敗 | 認証不要で DB 非依存に近い軽量エンドポイント。Cloud Run の到達性と Next.js 起動を確認 |

## セキュリティ監視アラート（`modules/monitoring/security.tf`）

`docs/infra/security-monitoring.md` §5 の上位 1・2 の実装。`enable_security_alerts`（既定 true）で一括 on/off できる（`enable_monitoring=false` ならモジュールごと作られない）。しきい値はすべて**初期値**で、2〜4 週の運用でチューニングする前提。通知先は `alert_emails` と同じチャネル。

認証系しきい値アラートは、ログが無いときにインシデントが閉じるよう `evaluation_missing_data = INACTIVE` と `auth_threshold_auto_close`（既定 1800s）を設定している。

ログ一致型は通知間隔（`security_log_notification_interval` 既定 3600s）と自動クローズ（`security_log_auto_close` 既定 86400s）を持つ。表示名は `<name_prefix> security: ...`。

### Admin Activity（Cloud Audit Logs、1 件で通知）

| 名前 | 条件 | trusted 除外 |
|---|---|---|
| IAM policy / service account key change | `SetIamPolicy`（末尾一致）、`CreateServiceAccountKey` / `UploadServiceAccountKey` / `CreateServiceAccount` | しない |
| logging / alerting config changed | ログのシンク・除外・バケット等の Create/Update/Delete、アラートポリシー・通知チャネルの Delete/Update、ログベースメトリクスの Update/Delete（`MetricsServiceV2`。認証系しきい値アラートの無音化対策） | しない |
| Cloud SQL export | `cloudsql.instances.export` / `google.cloud.sql.v1beta4.SqlInstancesService.Export` | する |
| Cloud SQL instance update / patch by non-trusted principal (`cloudsql_update`) | instances の update / patch（`cloudsql.instances.update`、v1beta4 の Update / Patch）。db-start/db-end の `activation-policy` patch や apply で発生するため trusted を除外 | する |
| Cloud SQL clone / restore / user change (`cloudsql_users_clone_restore`) | clone・restore（`restoreBackup` / `backupRuns.restore`）・users の作成/更新/削除 | しない |
| Cloud Run service changed by non-trusted principal | `ReplaceService` / `UpdateService` / `DeleteService`（v1/v2） | する |
| Secret version / secret changed by non-trusted principal | `AddSecretVersion` / `DestroySecretVersion` / `DisableSecretVersion` / `DeleteSecret` | する |
| GCS bucket IAM / settings changed by non-trusted principal | `storage.setIamPermissions` / `storage.buckets.update`（エクスポート用バケット名は渡されないため**プロジェクト内の全バケット**が対象） | する |

methodName は GCP ドキュメント上の名称で書いており、実ログでの確認は未了。取りこぼしがないかは、初期運用で Logs Explorer から実際の methodName を確認する。

対象外: Cloud Run の `CreateService`・Jobs（#21 の目的は既存サービスの不正更新であり、新規サービス作成は想定しにくいため）。

#### 初回 apply 後の methodName 確認手順

1. Logs Explorer で `logName="projects/<project_id>/logs/cloudaudit.googleapis.com%2Factivity"` を指定し、`protoPayload.serviceName`（`cloudsql.googleapis.com` / `run.googleapis.com` / `secretmanager.googleapis.com` / `storage.googleapis.com` / `logging.googleapis.com` / `monitoring.googleapis.com` / `iam.googleapis.com` / `cloudresourcemanager.googleapis.com`）ごとに絞って、実際に記録される `protoPayload.methodName` を確認する。
2. `security.tf` のフィルタの methodName と実在が違っていれば、フィルタを直す。
3. 特に確信が持てないもの:
   - Cloud SQL の restore 系（`cloudsql.backupRuns.restore` / `cloudsql.instances.restoreBackup`。両方をフィルタに含めている）
   - Cloud SQL の v1beta4 形式（`google.cloud.sql.v1beta4.*`）が実際に記録されるか
   - `MetricsServiceV2`（`UpdateLogMetric` / `DeleteLogMetric`）の完全名と Admin Activity への記録
   - AlertPolicyService / NotificationChannelService の操作が Admin Activity に記録されるか、その完全名
   - Cloud Run v2 の methodName 形式（`google.cloud.run.v2.Services.UpdateService` 等）
   - `ConfigServiceV2` の Link 系（`CreateLink` / `UpdateLink` / `DeleteLink`）の実在
   - Cloud Run / Secret Manager の `SetIamPolicy` の methodName（`SetIamPolicy$` の末尾一致で拾えているか）

### 認証系（アプリの構造化ログ）

ログベースメトリクス `<name_prefix>-auth-events`（DELTA / INT64、ラベル type / reason / portal）を作成する。`identifierHash` はカーディナリティ爆発を避けるためラベルにしていない。**メトリクスは作成後に出力されたログしか数えない**（過去分は遡及されない）。

| 名前 | 条件（既定） | 通知の性質 |
|---|---|---|
| login_failure spike | `login_failure` が 600s で 20 件超（全体） | しきい値型。件数を超えている間継続 |
| login_locked spike | `login_locked` が 3600s で 3 件超 | 同上 |
| login_blocked spike | `login_blocked` が 3600s で 30 件超（全体。同一アカウント単位は identifierHash ラベルを避けたため断念） | 同上 |
| Google login by inactive account | `message="auth"` かつ `method="google"` かつ `reason="account_inactive"` | 1 件で通知 |
| helpdesk account auto-provisioned | `type="account_provisioned"` | 1 件で通知 |
| helpdesk staff role changed to admin | `message="helpdesk staff role changed"` かつ `role="admin"` | 1 件で通知 |
| helpdesk staff created | `message="helpdesk staff created"` | 1 件で通知 |
| helpdesk staff exported | `message="helpdesk staff exported"` | 1 件で通知 |

### `security_trusted_principals` の意味と使い方

想定された操作者（`terraform apply` 担当、定期エクスポート SA 等）の `principalEmail` のリスト。該当する principal の操作を、**Cloud Run 変更・Secret 変更・GCS IAM 変更・Cloud SQL export のアラートからのみ**除外する（`NOT protoPayload.authenticationInfo.principalEmail=("a" OR "b")` を付与。空なら条件なし）。

- `cloudsql_update`（Cloud SQL instances の update/patch）のアラートからも除外する。**db-start/db-end の実行者（`gcloud sql instances patch --activation-policy=...`）と terraform apply 担当を `security_trusted_principals` に入れること**。入れないと dev で始業・終業のたびに通知が届く。
- 受容したリスク: trusted にした操作者による authorizedNetworks 等の変更（`instances.update`）は検知されない。
- IAM・SA 鍵のアラート、監視無効化のアラート、Cloud SQL の clone/restore/users には適用しない。侵害された正規操作者こそが脅威のため、常に通知する。
- 空のまま（既定）だと、apply 担当者が IAM 変更や Cloud Run のデプロイを行うたびに通知が届く。担当者のメールを入れるまでは「計画的な変更」として無視する運用になる。
- **terraform apply 時に鳴りうるアラート**: `iam_and_keys`（SetIamPolicy 等）、`disable_monitoring`（本モジュールのポリシー・通知チャネル・ログベースメトリクスの更新・削除）、`cloudsql_users_clone_restore`（users の変更）は trusted を除外しないため、正規の apply でも発火しうる。apply 担当者は事前に関係者へ共有する。
- メールアドレスにダブルクォート・バックスラッシュ・空白は指定できない（変数の validation で拒否）。

### 実装していないもの

- 業務時間外（JST）の admin 操作・エクスポートの昇格: 時刻条件はアラートポリシー単体では表現できないため未実装。
- Secret Manager の `AccessSecretVersion`: Data Access ログが未有効のため未実装。
- Cloud SQL の postgres.log `password authentication failed`: ログが出力されるか未確認のため未実装。

## 注意点

- 初回 apply では、`google_logging_metric` と、それを参照するしきい値ポリシーを同時に作るため、メトリクスの伝播前に `Cannot find metric(s) that match type` で失敗することがある。その場合は再実行すれば通る（`time_sleep` は入れていない）。

- dev は `db-end` スキルで Cloud SQL を夜間停止するため、「Cloud SQL 停止」アラートが毎晩発報する。dev.tfvars に `enable_cloudsql_down_alert = false` を設定して停止アラートを作らない（既定 true。変更後は plan で該当ポリシーのみ destroy になることを確認）。
- Cloud Run の `ingress` を制限している場合、uptime check（Google 管理の外部 IP）が到達できず常時失敗になる。その場合は tfvars で `enable_uptime_check = false` にする（既定 true）。
- Cloud Run が `min_instances = 0` の場合、uptime check は既定5分間隔でアクセスするため実質ウォーム維持になり、スケールトゥゼロのコスト削減効果が薄れる（インスタンス稼働時間が増える）。またコールドスタートがレイテンシ p95 に影響しうる。不要なら `enable_uptime_check = false` か `uptime_check_period` を延ばす。
- Cloud SQL 停止の absent 条件は、メトリクス欠落が続く間は発報するが、欠落状態のままだとインシデントが自動クローズされうる（復旧通知ではなくクローズ扱い）。停止の継続監視には向かない。
- ERROR ログアラートは通知間隔(`error_log_notification_interval`)内の同種エラーを1通にまとめる。ERROR が常時出る環境（例: DB 停止中の dev）では通知が間隔ごとに続くため、`enable_error_log_alert = false` にするか間隔を延ばす。通知先がなければインシデントだけが作られる。
- 本モジュールは `monitoring.googleapis.com` API が有効であることを前提とする（modules/services で有効化済み）。

## 通知先の決め方

1. 初期: 担当者のメール（`alert_emails`）。本番は個人でなく共有 ML/グループアドレスを推奨。
2. クライアントの運用体制が決まったら、Slack / PagerDuty / Teams 等の通知チャネルを `google_monitoring_notification_channel` に追加し、`local.channel_ids` に合流させる（ポリシー側の変更は不要）。
3. 重大度の分離が必要なら、停止・5xx・uptime を本番用チャネル、CPU/ディスク/レイテンシを低優先チャネルに分ける。
4. dev と prod は別プロジェクト・別チャネルとし、dev の通知が本番運用者に届かないようにする。

## 未決事項（クライアント確認）

- 通知先・当番体制、SLO/稼働率目標（目標が決まれば uptime・5xx 閾値を逆算）
- 営業時間外の通知可否
- ログベースのアラートの追加条件（認証失敗の急増など。件数閾値が要る場合はログベースメトリクスを作ってしきい値アラートにする）。ERROR ログ検知は雛形として実装済みで、`enable_error_log_alert` で無効化できる
