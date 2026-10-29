# 本番化（Phase 5）Terraform トグル

`docs/infra/iac-plan.md` Phase 5 のうち、Cloud SQL の耐障害性とネットワークを Terraform で切り替えられるようにした変更の説明。
**すべてのトグルの既定値は「現行と同一」**（現行環境 `rvp-ai-proto-camp` の state に差分を出さない）。有効化は `prod.tfvars` で行う（推奨値は `infra/envs/prod/prod.tfvars.example`）。

検証状況: `terraform init -backend=false` + `terraform validate` が dev / prod で成功。実 state への `plan` / `apply` は未実施（クライアント環境、または現行環境での dev 別 prefix 検証時に実施すること）。

## トグル一覧

| 変数（envs） | 既定 | 内容 |
|---|---|---|
| `db_backup_enabled` | true | 自動バックアップ（既存） |
| `db_point_in_time_recovery` | false | PITR（トランザクションログ保存）。要 `db_backup_enabled=true` |
| `db_transaction_log_retention_days` | null | PITR で遡れる日数 1-7。null は API 既定 |
| `db_backup_retained_count` | null | 自動バックアップの保持世代数。null は API 既定（7） |
| `db_backup_start_time` | null | バックアップ開始時刻（UTC `HH:MM`） |
| `db_high_availability` | false | `REGIONAL`（HA）。インスタンス費用がほぼ2倍。**要件: `db_backup_enabled=true` かつ `db_point_in_time_recovery=true` かつ `db_tier` が `db-custom-<vCPU>-<MB>`（専有コア）**（下記「HA のティア制約」） |
| `cloudrun_vpc_egress` | `PRIVATE_RANGES_ONLY` | Direct VPC egress の egress 設定（Cloud Run サービスと migrate job 共通）。`ALL_TRAFFIC` は Cloud NAT が別途必要 |
| `deletion_protection` / `db_deletion_protection_enabled` | true / null | 削除保護（既存） |
| `db_export_enabled` | false | 定期 SQL エクスポート（Cloud Scheduler → Cloud SQL Admin API → GCS） |
| `db_export_schedule` / `db_export_retention_days` / `db_export_bucket_name` | `0 3 * * *` / 30 / null | 実行時刻・保持日数・バケット名（null は `<project>-<db名>-export`） |
| `enable_private_network` | false | VPC・サブネット・Private Service Access を作成（`modules/network`）。compute / servicenetworking API も有効化 |
| `db_private_ip_enabled` | false | Cloud SQL に private IP を付与 |
| `cloudrun_direct_vpc_egress` | false | Cloud Run サービスと migrate job に Direct VPC egress を付与 |
| `db_public_ip_enabled` | true | public IPv4。最終的に false にして完全 private 化 |

整合性チェック（precondition）: private IP / Direct VPC egress は `enable_private_network=true` が前提。Cloud SQL を private IP 化するなら Direct VPC egress も必須（Cloud Run が到達できなくなるため）。public IP を無効化するなら private IP が必須。

### HA のティア制約と precondition

`modules/cloudsql` は `high_availability=true` のとき、次を満たさないと plan で失敗させる。
- `backup_enabled=true` かつ `point_in_time_recovery=true`
- `tier` が `db-custom-` で始まる（専有コア。例 `db-custom-2-7680`）。`db-f1-micro` / `db-g1-small`（shared-core）は不可

**根拠の確度（要確認）**: 公式ドキュメント(Cloud SQL for PostgreSQL の高可用性ページ)で確認できたのは「専有 CPU が1つ以上ある構成が SLA の対象」「HA にはバックアップを強く推奨」まで。**shared-core での HA 可否、および HA に PITR/バックアップが API 上必須かは当該ページでは確認できていない（要確認）**。上記 precondition は本リポジトリの安全側の運用ガードであり、公式の必須要件と断定するものではない。実際の API 挙動は Cloud SQL の edition（Enterprise / Enterprise Plus）やクライアント環境の組織ポリシーでも変わりうるため、有効化前に `gcloud sql instances create --help` / 公式ドキュメントで最新を確認すること。

`prod.tfvars.example` の `db_tier = "db-g1-small"` は HA 無効の例。HA を有効にする場合は `db_tier = "db-custom-2-7680"` 等へ変更する（費用が上がる）。

## 各機能の動作と注意

### PITR / バックアップ
- PITR は WAL を保存するためディスク使用量が増える（`disk_autoresize` 有効のため自動拡張。ディスク費用増）。
- 設定変更はインスタンスの再起動を伴うことがある（PITR 有効化は通常再起動あり）。メンテナンス時間帯に実施する。
- 自動バックアップはインスタンス削除と同時に消える。**インスタンス削除・プロジェクト障害への備えは次の GCS エクスポートが担う**。

### 定期 SQL エクスポート
- Scheduler が専用 SA（`<db名>-export`）で `sqladmin.googleapis.com/.../export` を POST し、固定ファイル名 `<db名>.sql.gz` を GCS に上書き出力する。
- バケットはバージョニング有効 + ライフサイクルで非現行世代を `db_export_retention_days` 日後に削除し、日次世代を保持する。公開禁止・uniform access・`force_destroy=false`。
- 実行結果は Cloud SQL の操作履歴（`gcloud sql operations list`）で確認する。失敗検知のアラートは未実装（要検討）。
- エクスポートはインスタンス負荷を伴う（小規模 DB では軽微）。リストアは `gcloud sql import sql` で別インスタンスへ行うのが安全。
- バックアップは運用上「復元訓練」を一度実施して初めて有効。runbook に追記予定（別途）。

### private IP + Direct VPC egress
- 適用順: `enable_private_network` → `db_private_ip_enabled` + `cloudrun_direct_vpc_egress` → 疎通確認 → `db_public_ip_enabled=false`。
- DATABASE_URL は Unix ソケット形式（`/cloudsql/...`）のまま。Cloud SQL コネクタが private IP を使うので Secret の変更は不要。
- Direct VPC egress は `PRIVATE_RANGES_ONLY`。外部 API（Anthropic 等）への通信は従来通りインターネット経由で、Cloud NAT は不要。
- subnet は既定 `10.10.0.0/24`。クライアント側の既存 VPC・オンプレとレンジが重複しないか要確認。PSA 用に /20 を別途予約する。
- 既存 VPC を使う構成は未対応（`modules/network` は新規 VPC を作る）。クライアントが共有 VPC を指定する場合は別途対応。
- public IP を無効化するとローカルからの Cloud SQL Auth Proxy 直結ができなくなる（踏み台 VM か、Proxy を VPC 内から使う運用が必要）。`db-start` 等のスキル・runbook の接続手順の見直しが要る。
- 既存インスタンスへの private IP 追加は in-place だが再起動を伴う。
- `modules/network` の `google_service_networking_connection` は `deletion_policy = "ABANDON"`(provider 6.50.0 で validate 成功を確認)。Cloud SQL 削除後に peering が「使用中」扱いで destroy が失敗する問題を避けるための設定で、**destroy しても peering 自体は削除されず残る**。VPC ごと消す場合は peering が残っていないか確認する。
- `private_ip_check`（`terraform_data`、precondition 用）は plan に `+1 to add`（create）として常に1件出る。インフラ変更ではなく検証用のダミーリソースなので無視してよい。
- migrate job の `vpc_egress` は `cloudrun_vpc_egress` で Cloud Run サービスと同じ値を渡す（既定 `PRIVATE_RANGES_ONLY` で現行と同じ）。

#### private IP 移行中（public/private 併存）の経路確認

`db_private_ip_enabled=true` かつ `db_public_ip_enabled=true` の期間は、接続が public / private のどちらを通っているか分からない。`db_public_ip_enabled=false` にする前に次で確認する。
1. インスタンスの IP 一覧: `gcloud sql instances describe <name> --format='value(ipAddresses)'`（`PRIMARY` と `PRIVATE` の両方が出ているか。`PRIVATE` の存在確認）
2. 接続元 IP の確認: Cloud SQL の PostgreSQL ログ（Cloud Logging の `cloudsql.googleapis.com/postgres.log`）で `connection received: host=...` を見る。`host` が Direct VPC egress の subnet レンジ（既定 `10.10.0.0/24`）内なら private 経路、それ以外（public IP や Cloud SQL コネクタ経由の Google 管理レンジ）なら public 経路。ログに出ない場合は `log_connections` フラグの有効化が必要（要確認。変更は再起動を伴う場合あり）
3. Cloud Run 側: 新リビジョンの `vpcAccess`（`gcloud run services describe <svc> --format='yaml(spec.template.metadata.annotations)'` 等）で network / subnetwork が付いていること
4. 切替後の判定: Cloud Run の新リビジョンから DB を使う画面/ヘルスチェックを実行し、上記ログの接続元が subnet レンジであることを確認 → 問題なければ `db_public_ip_enabled=false`。戻す場合は true に戻すだけ（in-place）。
5. 上記の判定方法は設計上の想定であり、実環境での検証は未実施（要確認）。

## 費用の目安（asia-northeast1、概算。実際は料金表で確認）

| 項目 | 影響 |
|---|---|
| HA（REGIONAL） | インスタンス費用が約2倍（ディスクも2倍） |
| PITR | ログ分のディスク増。小規模なら月数百円程度 |
| 自動バックアップ保持増 | バックアップ容量分の従量（安価） |
| GCS エクスポート | DB サイズ × 保持世代分のストレージ。小規模なら誤差 |
| Cloud Scheduler | ジョブ3つまで無料枠 |
| private IP / PSA | 追加費用なし |
| Direct VPC egress | 追加費用なし（Cloud Run のネットワーク転送料のみ） |

## 権限・API 要件

Editor で足りるもの・足りないものの見立て（組織ポリシー次第。要クライアントの確認）。

| 操作 | 必要なもの | Editor で可否 |
|---|---|---|
| PITR / HA / バックアップ設定 | `cloudsql.instances.update` | 可 |
| GCS バケット作成 | storage 系 | 可 |
| バケット IAM（Cloud SQL SA への objectAdmin） | `storage.buckets.setIamPolicy` | 不可の可能性（Storage Admin が必要） |
| プロジェクト IAM（エクスポート SA に `roles/cloudsql.editor`） | `resourcemanager.projects.setIamPolicy` | **不可**（`iam.manage_iam=false` 相当の運用では管理者が付与） |
| Cloud Scheduler | `cloudscheduler.jobs.create`, SA への `actAs` | 可（自社 SA の actAs が要る場合あり） |
| VPC / subnet | compute 系 | 可（API 有効化が前提） |
| Private Service Access（`google_service_networking_connection`） | `servicenetworking.services.addPeering`, `compute.globalAddresses.*` | **不可の可能性**（`roles/servicenetworking.networksAdmin` を依頼） |

有効化が必要な API: `compute.googleapis.com`, `servicenetworking.googleapis.com`（`enable_private_network=true` で自動有効化）。`cloudscheduler` / `sqladmin` は既に有効化済み。API の有効化自体も権限が必要（Editor は可）。

エクスポート関連の IAM を管理者に付与してもらう場合は、次の3つを依頼する。
1. エクスポート SA（`<db名>-export@<project>.iam.gserviceaccount.com`）に `roles/cloudsql.editor`（`cloudsql.instances.export` を含む最小の定義済みロール）
2. Cloud SQL インスタンスのサービスアカウント（`gcloud sql instances describe <name> --format='value(serviceAccountEmailAddress)'`）に、エクスポート先バケットの `roles/storage.objectAdmin`
3. Scheduler 作成者に、エクスポート SA への `iam.serviceAccountUser`

現状このモジュールは上記 IAM を Terraform で付与する（権限が無いと apply が失敗する）。manage_iam と同様の「付与しない」トグルは未実装のため、クライアントが権限付与を認めない場合は追加実装が必要。

## RPO / RTO の前提（クライアント確認事項）

コードは「手段」を用意しただけで、目標値は未確定。次をクライアントに確認する。

| 構成 | RPO（失うデータ） | RTO（復旧時間）の目安 |
|---|---|---|
| 自動バックアップのみ | 最大24時間 | 数十分〜（バックアップからの復元。新インスタンスへの復元が基本） |
| + PITR | 数分（ログ保持期間内の任意時点） | 同上。復元は新インスタンスを作成するため、アプリの接続先切替が必要 |
| + HA（REGIONAL） | ゾーン障害時はほぼ 0（同期レプリケーション） | 自動フェイルオーバーで数分以内 |
| + GCS エクスポート | 最大24時間（論理バックアップ） | インスタンス消失・誤削除時の最終手段。import に DB サイズ依存の時間 |

確認事項:
1. 許容できるデータ損失（RPO）と停止時間（RTO）。業務時間のみ稼働か 24h 稼働か（HA の要否、`db-end` による夜間停止を本番で続けるか）
2. バックアップ・エクスポートの保持期間（社内規程・個人情報の保管期限との関係）。アプリ側ログ（AuthEvent / LoginThrottle / 通知履歴）の保持期間はクライアント規程で確定する（現状の定数は暫定値。`runbook.md` §3.7）
3. データの所在地要件（バケットのロケーションは既定でリージョン内。マルチリージョン不可か）
4. 復元訓練の頻度と実施主体
5. 本番で public IP を完全に無効化してよいか（運用者の DB 接続方法に影響）
6. エクスポートの暗号化鍵（CMEK）要件。現状は Google 管理鍵

## 推奨（prod）

`infra/envs/prod/prod.tfvars.example` の値を出発点とする。
- 最低限: `deletion_protection=true`、PITR 有効、保持14世代、ログ7日、GCS エクスポート有効
- 要件次第: HA、private IP / Direct VPC egress（権限が揃ってから）

## 未実装・今後

- エクスポート失敗のアラート（monitoring モジュールへの追加）
- エクスポート IAM の「付与しない」トグル
- エクスポート SA の `roles/cloudsql.editor` は広い権限（インスタンスの更新・削除に近い操作を含む）。`cloudsql.instances.export` のみを持つカスタムロールへの置き換えを**将来検討**（現状は未実装。権限最小化の観点でクライアントのセキュリティ方針次第）
- 既存 VPC / 共有 VPC の利用
- 復元手順書（runbook 追記）と復元訓練
- Cloud Armor / LB / カスタムドメイン（Phase 5 の別項目）
