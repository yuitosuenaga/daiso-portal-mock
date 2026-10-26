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
| 稼働確認 (uptime) | `/api/auth/providers` が複数地点で失敗 | 認証不要で DB 非依存に近い軽量エンドポイント。Cloud Run の到達性と Next.js 起動を確認 |

## 注意点

- dev は `db-end` スキルで Cloud SQL を夜間停止するため、「Cloud SQL 停止」アラートが毎晩発報する。dev では `alert_emails` を空にするか、このポリシーを無効化する運用を検討する。
- Cloud Run の `ingress` を制限している場合、uptime check（Google 管理の外部 IP）が到達できず常時失敗になる。その場合は `enable_uptime_check = false`（モジュール変数）にする。
- Cloud Run が `min_instances = 0` の場合、uptime check がコールドスタートを起こしレイテンシ p95 に影響しうる。
- 本モジュールは `monitoring.googleapis.com` API が有効であることを前提とする（modules/services で有効化済み）。

## 通知先の決め方

1. 初期: 担当者のメール（`alert_emails`）。本番は個人でなく共有 ML/グループアドレスを推奨。
2. クライアントの運用体制が決まったら、Slack / PagerDuty / Teams 等の通知チャネルを `google_monitoring_notification_channel` に追加し、`local.channel_ids` に合流させる（ポリシー側の変更は不要）。
3. 重大度の分離が必要なら、停止・5xx・uptime を本番用チャネル、CPU/ディスク/レイテンシを低優先チャネルに分ける。
4. dev と prod は別プロジェクト・別チャネルとし、dev の通知が本番運用者に届かないようにする。

## 未決事項（クライアント確認）

- 通知先・当番体制、SLO/稼働率目標（目標が決まれば uptime・5xx 閾値を逆算）
- 営業時間外の通知可否
- ログベースのアラート（認証失敗の急増など）の要否
