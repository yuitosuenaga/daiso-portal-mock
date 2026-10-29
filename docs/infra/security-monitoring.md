# セキュリティ監視・インシデント対応計画

Cloud Logging で観測できる各種ログについて、「何を問題とみなすか」と「問題が起きたときどう動くか」を整理した計画書。2026-10-29 時点のコードと IaC を読み取って作成した（Opus による計画検討の結果）。

- 既存のメトリクス・ERROR ログアラートは [monitoring.md](./monitoring.md)、運用手順は [runbook.md](./runbook.md) を参照。
- 本書のしきい値はすべて**初期値**で、2〜4 週の運用で調整する前提。
- 推測・未確認の事項は「推測」「要確認」と明記している。法的な判断は断定しない。

## 0. 前提（現状の実態）

- **認証基盤は Auth.js v5**（`next-auth@5.0.0-beta.32`）。Firebase Auth / Identity Platform ではない。メール+パスワードの Credentials（申請者用・ヘルプデスク用）と、許可ドメインに限った Google OAuth を使い、セッションは JWT（`src/auth.ts`、`src/auth.config.ts`）。認証イベントの情報源は、アプリの構造化ログ `jsonPayload.message="auth"` と DB の `AuthEvent` テーブル（`src/lib/server/auth-audit.ts`）の 2 つ。
- **「dev は社内ネットワークのみ」は IaC では未実装**。`cloudrun_ingress` の既定は `INGRESS_TRAFFIC_ALL`、`allow_public_access=true`。IAP / Cloud Armor / LB は未作成（`iac-plan.md` §5 の積み残し）。
- **prod の「社内 Google アカウント」制限は実装済み**（`enable_google_login` + `allowed_email_domains`、空なら precondition で停止）。ただし Credentials ログインは並存しており、無効化するトグルは見当たらない（要確認）。
- ファイル（添付・ドキュメント）は DB の `dataUrl` 列（base64）に保持。GCS は任意の DB エクスポート用バケットと tfstate バケットのみ。
- `AuthEvent.ipSummary` は `x-forwarded-for` の**先頭**を使う（`src/lib/auth/login-throttle-policy.ts`）。クライアントが XFF を偽装できる可能性があるため（推測・要検証）、**調査では `httpRequest.remoteIp` を正とし、ipSummary は参考値**とする。

## 1. 現状の実装済みコントロール

| 領域 | 実装済み | 根拠 |
|---|---|---|
| メトリクスアラート | Cloud Run 5xx 率 >5%、p95 >3s、Cloud SQL CPU >80%・ディスク >85%・停止、uptime check | `infra/modules/monitoring/main.tf` |
| ログベースアラート | `severity>=ERROR` 1 件で通知（5 分 rate limit、30 分で自動クローズ）。**定義はこの 1 本のみ** | 同上 `app_error_log` |
| 通知 | メールのみ。通知先は個人アドレス 1 件 | `infra/envs/dev/current.tfvars` |
| ログイン保護 | 5 回失敗で 15 分ロック、bcrypt、存在しないアカウントでも同じ時間をかける | `src/lib/server/login-throttle.ts` ほか |
| 認証監査 | `login_success` / `login_failure` / `login_locked` / `login_blocked` / `account_provisioned`。メールは HMAC ハッシュ、IP は /24 に丸め、DB 365 日保持 | `auth-audit.ts` |
| 即時失効 | リクエストごとに `isActive` を DB 再照会 | `src/lib/server/get-session.ts` |
| 権限変更の監査 | スタッフの作成・ロール変更・isActive 変更・CSV エクスポートを INFO ログに出力（operatorId 付き） | `src/lib/actions/helpdesk-staff.ts` ほか |
| API 認可失敗 | `[api-errors] Unauthorized/Forbidden` を WARNING で出力 | `src/lib/server/api-errors.ts` |
| Cron 認証 | `x-cron-secret` を定数時間比較。OIDC は任意（`enable_scheduler_oidc`、既定 false）。**401 はアプリログに出ない** | `src/lib/server/cron-auth.ts` |
| Secret | secret 単位の `secretAccessor` 付与 | `infra/modules/iam/main.tf` |
| ログの秘匿 | URL の資格情報、Bearer、Cookie、password 系キーを伏字化 | `src/lib/server/logger.ts` |
| その他 | CSP などのセキュリティヘッダ、Cloud SQL TLS 必須、バックアップ・削除保護、budget モジュール、CI（npm audit、Actions SHA 固定、dependabot cooldown、CODEOWNERS） | `.github/` ほか |

**Terraform に無いもの**: `google_logging_metric`、`google_project_iam_audit_config`（Data Access ログ）、ログシンク・ログバケット、Cloud SQL の `database_flags`（`log_connections` / pgaudit）、IAP・Cloud Armor・LB。

**コードから見えた気になる点**

1. ipSummary が偽装可能（上記）。
2. Credentials で無効化済みアカウントが正しいパスワードでログインしても `invalid_credentials` と記録され区別できない（外部応答を区別しない意図的設計）。Google 経由のみ `account_inactive` が残る。
3. 申請者アカウント・販社の作成/無効化/パスワード関連の Server Action（`applicant-users.ts`、`companies.ts`）とドキュメント登録に監査ログがない。
4. `app_error_log` はあらゆる ERROR で発火するため、DB を夜間停止する dev ではノイズになる。

## 2. 検知対象（何を問題とみなすか）

重大度:

- **P1**: 即時対応（時間外含む）。侵害が確定・強く疑われる、またはデータが外部に出た可能性がある。
- **P2**: 当日の業務時間内に対応。
- **P3**: 週次レビューで確認（通知しない）。

利用者は数十〜数百人の販社担当者と推測（要確認）。少人数運用のため通知は P1/P2 に絞る。

| # | 発生源 | 問題とみなす条件（初期値） | 重大度 | 想定原因 | 誤検知しやすいもの | 現状 |
|---|---|---|---|---|---|---|
| 1 | Cloud Run リクエスト | 5xx 率 >5%（5 分） | P2 | 障害、DB 停止、負荷 | コールドスタート、DB 停止中の dev | 済 |
| 2 | Cloud Run リクエスト | リクエスト数がベースラインの 10 倍、または 1 IP から 5 分で 300 件超 | P2（継続で P1） | DoS、スクレイピング | 社内 NAT 共有 IP、uptime check | 未 |
| 3 | Cloud Run リクエスト | 401/403 が 10 分で 50 件超 | P2 | トークン総当たり、認可回避の試行 | 期限切れセッションの再読み込み、Cron 401 | 未 |
| 4 | Cloud Run リクエスト | `/.env`・`/wp-admin`・`/.git` 等へのアクセス、スキャナ UA | P3（集計のみ） | 自動スキャナ | 公開 URL では常時発生。**アラートにしない** | 未 |
| 5 | アプリ auth | `login_failure` が 10 分で 20 件超（全体） | P2 | ブルートフォース、スプレー | 一斉周知の直後 | 済(PR) |
| 6 | アプリ auth | `login_locked` が 1 時間で 3 件超、または同一 identifierHash の `login_blocked` が 1 時間で 10 件超 | P2 | 特定アカウントへの攻撃 | 本人の入力ミス | 一部済(PR)（login_locked のみ。同一 identifierHash の login_blocked は全体 30 件/時で代替、アカウント単位は未） |
| 7 | アプリ auth | 同一 remoteIp から複数 identifierHash への失敗が 10 分で 10 件超 | P2 | パスワードスプレー | NAT | 未（remoteIp と auth イベントの突合に工夫が必要） |
| 8 | アプリ auth | Google 経由の `account_inactive`（1 件でも） | P2 | 退職者・無効化済みの継続アクセス | 無効化直後の誤操作 | 済(PR) |
| 9 | アプリ auth | `domain_not_allowed` が 1 時間で 5 件超 | P3 | 個人 Gmail の誤用、探索 | 私用アカウント | 未 |
| 10 | アプリ auth | `account_provisioned`（ヘルプデスク自動作成。有効化した場合） | P2（1 件で通知） | 想定外の権限付与 | 新入社員 | 済(PR)（機能は既定 OFF） |
| 11 | アプリ監査 | `helpdesk staff role changed`（role=admin）、`created`、`exported` | P2（1 件で通知） | 権限昇格、持ち出し | 正規の管理作業（本人確認運用で吸収） | 済(PR)（role=admin / created / exported を 1 件で通知） |
| 12 | アプリ監査 | 業務時間外（JST 22–7 時、要調整）の admin 操作・エクスポート | P1 | 乗っ取り | 時差（ヘルプデスクは日本側と推測） | 未 |
| 13 | アプリ API | `[api-errors] Forbidden` が同一ユーザーで 10 分に 10 件超 | P2 | 他社データへの IDOR 試行 | UI バグ | 未 |
| 14 | アプリ API | `[api-errors] Invalid request` が 10 分で 30 件超 | P3 | ファジング、インジェクション試行 | フォームのバグ | 未 |
| 15 | アプリ | `severity>=ERROR` | P2 | 未捕捉例外 | DB 停止中の dev | 済 |
| 16 | Cloud SQL | CPU、ディスク、停止 | P2 | 重いクエリ、大量 SELECT | 夜間停止（dev） | 済 |
| 17 | Cloud SQL postgres.log | `password authentication failed` が 1 件以上 | P1 | DB パスワード漏えい疑い、ローテーション後の旧値 | ローテーション作業中 | 未（ログに出るか要確認） |
| 18 | Admin Activity（Cloud SQL） | `cloudsql.instances.export` / `users.update` / `users.create` / `instances.update`（authorizedNetworks 等）/ `instances.clone` / `backupRuns.restore` を想定外 principal が実行 | P1（export・ユーザー変更）/ P2（設定変更） | 持ち出し、バックドア | 定期エクスポート SA（principal で除外） | 済(PR)（export は trusted 除外、他は常に通知） |
| 19 | Admin Activity | `SetIamPolicy`（project / Cloud Run / Secret）、`CreateServiceAccountKey`、`allUsers` 追加 | P1 | 侵害、権限昇格 | bootstrap 作業（事前共有で吸収） | 済(PR)（SetIamPolicy は全件通知のため allUsers 追加も含む） |
| 20 | Admin Activity | `UpdateSink` / `DeleteSink` / `DeleteBucket` / audit config 変更（監視の無効化） | P1 | 痕跡の消去 | ほぼ無し | 済(PR)（audit config 変更は SetIamPolicy 経由で #19 の対象） |
| 21 | Admin Activity（Cloud Run） | `ReplaceService` / `CreateRevision` / `UpdateService` を担当外 principal・予定外時間に実行 | P2 | 不正デプロイ | 手動デプロイ（現状は個人ローカルから） | 一部済(PR)（Replace/Update/DeleteService を trusted 以外で通知。CreateRevision・予定外時間は未） |
| 22 | Data Access（要有効化） | Secret Manager `AccessSecretVersion` をアプリ SA・サービスエージェント以外が実行 | P2（時間外・未知 principal は P1） | 秘密値の閲覧・漏えい | deploy-main 手順、`rotate-secrets.sh` | 未 |
| 23 | Audit | `AddSecretVersion` / `DestroySecretVersion` / `DisableSecretVersion` | P2 | 秘密値のすり替え | ローテーション作業 | 済(PR)（trusted 以外で通知） |
| 24 | Scheduler | `cloud_scheduler_job` の失敗（severity>=ERROR） | P3（督促停止の業務影響次第で P2） | アプリ障害、OIDC/secret 不一致 | DB 停止中 | 未 |
| 25 | Cron API | `/api/cron/*` への 401、または UA が `Google-Cloud-Scheduler` 以外からの 2xx | 401: P3（多ければ P2）/ UA 不一致の 2xx: P1 | CRON_SECRET 漏えい、探索 | 手動 dryRun（事前共有で吸収） | 未 |
| 26 | メール | `[mailer]` / `[announcement-notifications]` の送信量が 1 時間で N 件超（N は宛先数から決定） | P2 | 乗っ取りアカウントからの大量送信 | 正規の全社お知らせ | 未（送信件数ログの有無は要確認） |
| 27 | 翻訳 API | Anthropic 呼び出しエラー急増、または予算アラート | P3 | 本文大量投入によるコスト攻撃 | — | budget モジュールは既定 off |
| 28 | GCS（エクスポートバケット） | `storage.objects.get/list` を想定外 principal が実行、IAM 変更、公開設定 | P1 | DB ダンプの持ち出し | — | 一部済(PR)（バケット IAM 変更のみ。objects.get/list は Data Access 未有効のため未） |
| 29 | tfstate バケット | 読み取り（state に `random_password`・CRON_SECRET が平文で入る） | P2 | 秘密の漏えい | apply 担当者 | 未 |
| 30 | GitHub | ブランチ保護変更、新規 Actions secret / environment、WIF 利用元が想定外 | P2 | サプライチェーン | — | 未（GitHub Audit log は GCP 外） |

## 3. 対応プレイブック

### 3.1 共通の初動（全ケース）

1. Monitoring のインシデント画面で発報内容を確認し、記録を開始する（時刻は UTC と JST を併記）。
2. 重大度を判定する。P1 なら責任者とクライアント側管理者へ 30 分以内に一報する。
3. 証拠を保全する。**ログを削除・上書きしない。** 対象ログを BigQuery やファイルへエクスポートし、DB はオンデマンドバックアップを取る（runbook §2.2）。
4. 誰が・いつ・何をしたかをすべて記録する。
5. 初期段階で「個人データ影響の有無」「対象国」「件数」を記録する（§4.5 の報告判断のため）。

### 3.2 Logs Explorer 共通フィルタ（`P` はプロジェクト ID）

```
# Cloud Run リクエストログ
resource.type="cloud_run_revision" AND resource.labels.service_name="<svc>"
logName="projects/P/logs/run.googleapis.com%2Frequests"

# 認証イベント
resource.type="cloud_run_revision" AND jsonPayload.message="auth" AND jsonPayload.type="login_failure"

# 管理操作の監査
jsonPayload.message=~"^helpdesk staff (created|role changed|active state changed|exported)$"

# Admin Activity
logName="projects/P/logs/cloudaudit.googleapis.com%2Factivity"

# Data Access
logName="projects/P/logs/cloudaudit.googleapis.com%2Fdata_access"

# Cloud SQL（DB ログ）
resource.type="cloudsql_database" AND logName=~"postgres.log"
```

### 3.3 ケース別

#### A. アカウント乗っ取り疑い（申請者 / ヘルプデスク）

- **検知**: #5〜8、11〜13、利用者からの申告。
- **止血**: 対象を `isActive=false` にする（次リクエストでセッション失効）。admin 被害や全体への拡大の恐れがあれば `AUTH_SECRET` をローテーションして全セッション失効（runbook §4、全員再ログイン）。
- **調査**:
  - `jsonPayload.message="auth" AND jsonPayload.identifierHash="<hash>"` で成功・失敗の時系列を確認（hash は `hashIdentifier(email)` と同じ鍵で算出。DB の AuthEvent も参照）。
  - 成功時刻前後のリクエストログで `httpRequest.remoteIp` と `userAgent` を確認（普段と違う国・UA か）。
  - 同時間帯の管理操作ログ（role changed / exported / created）を確認。
  - 申請者の場合、閲覧・投稿した問い合わせを DB（`InquiryHistoryEntry` 等）から洗い出す（読み取りのみ）。
- **封じ込め**: パスワードをリセット。Google 利用者はクライアントの Workspace 管理者へパスワード変更とセッション失効を依頼。同じ IP 帯からの他アカウントの成功も確認。
- **復旧**: 本人確認のうえ再有効化。
- **再発防止**: prod の Credentials ログイン廃止と Google 一本化、Workspace 側の 2SV 強制（現状アプリは 2FA 未対応）。
- **連絡**: 責任者、クライアントのヘルプデスク責任者、Workspace 管理者。販社データが閲覧された可能性があれば §4.5 へ。

#### B. 認証情報 / SA 鍵 / シークレットの漏えい

- **検知**: #17、19、22、25、GitHub secret scanning、外部通報。
- **止血**:
  - SA 鍵は即無効化・削除（本システムは鍵を使わない設計のため、**鍵の存在自体が異常**）。
  - Secret は新 version を追加 → Cloud Run を再デプロイ（新リビジョン）→ 旧 version を disable。`DATABASE_URL` / `AUTH_SECRET` は `infra/scripts/rotate-secrets.sh`（runbook §4）。
  - CRON_SECRET は Terraform の `random_password` を taint して apply し、Scheduler ジョブも更新。
  - ANTHROPIC / Google OAuth / SMTP は発行元で失効させて再登録（runbook §4.5）。
- **調査**:
  - `protoPayload.serviceName="secretmanager.googleapis.com" AND protoPayload.methodName=~"AccessSecretVersion"` で principal・callerIp・時刻を確認（要 Data Access）。
  - SA 鍵を使った操作: `protoPayload.authenticationInfo.serviceAccountKeyName:*`
  - DB パスワードの場合は postgres.log の接続元（`log_connections` が必要）。
  - tfstate バケットの読み取り履歴（要 Data Access）。
- **封じ込め**: 漏れた principal の IAM を剥がす。漏えい元（ローカル端末、CI ログ）を特定。
- **再発防止**: org policy `iam.disableServiceAccountKeyCreation`（クライアント側）、tfstate 閲覧者の最小化、CRON_SECRET を state に載せない設計の検討、OIDC 必須化（`enable_scheduler_oidc=true` かつ Cloud Run 非公開、または Cron パスで OIDC 検証）。
- **連絡**: 責任者、クライアント GCP 管理者、各発行元。

#### C. DDoS / ブルートフォース / スクレイピング

- **検知**: #2、3、5〜7、5xx・レイテンシ上昇。
- **止血**: アプリ側ロックは識別子単位のためスプレーには効かない。Cloud Armor が無い現状の手段は (a) `max_instances` 上限でコストが頭打ちになることの確認（prod 例は 5）、(b) 必要なら ingress を `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` に変更（LB が無いと全面停止になる点に注意）。悪化時は一時的なメンテナンス表示、または `allow_public_access=false` による停止を判断。
- **調査**: `httpRequest.remoteIp` の上位集計（Log Analytics の SQL が有効）。対象パス、UA、`login_success` の混入有無（混入していれば A へ）。
- **封じ込め**: LB + Cloud Armor を導入し、IP 拒否とレート制限をかける（中工数）。
- **再発防止**: Cloud Armor の rate-based ban。IAP の導入も検討（申請者＝社外ドメインの扱いが論点、要確認）。
- **連絡**: 責任者。継続する場合はクライアント。

#### D. データ持ち出し疑い

- **検知**: #11（exported）、18、28、Cloud SQL CPU 急増、`/api/documents|manuals|monthly-materials/[id]/file` の同一ユーザーによる短時間大量取得。
- **止血**: 対象アカウントを無効化（A）。GCS エクスポートバケットの公開設定・IAM を確認し、不要な付与を除去。
- **調査**:
  - Admin Activity: `protoPayload.methodName="cloudsql.instances.export"` で principal と出力先 URI。
  - GCS Data Access: `resource.type="gcs_bucket" AND protoPayload.methodName="storage.objects.get"`
  - アプリ: `jsonPayload.message="helpdesk staff exported"` の operatorId。
  - リクエストログ: `httpRequest.requestUrl=~"/api/.*/file"` を remoteIp・時刻で集計。申請者 API の閲覧はアプリログに出ないため、リクエストログ（URL の ID）から推定する。
- **封じ込め・復旧**: 持ち出し範囲（テーブル、会社、期間）を特定。
- **再発防止**: pgaudit（要検討）、申請者・販社管理の監査ログ追加、エクスポート先バケットの別プロジェクト化または VPC-SC（大工数・後回し）。
- **連絡**: 責任者、クライアント。個人情報が含まれれば §4.5。

#### E. 不正な IAM / インフラ変更（Terraform 外の変更）

- **検知**: #19〜21、月次 `terraform plan` のドリフト（runbook §6）。
- **止血**: 不審な IAM バインディング・SA 鍵を削除。不審 principal の無効化はクライアント管理者へ依頼。
- **調査**: `logName=~"cloudaudit.googleapis.com%2Factivity" AND protoPayload.authenticationInfo.principalEmail!="<既知の apply 担当>"`、`protoPayload.methodName=~"SetIamPolicy"` の `serviceData.policyDelta`。
- **封じ込め**: `terraform plan` で差分を確認し、コードどおりに戻す。
- **再発防止**: apply を CI + WIF に寄せ、principal を apply 用 SA に固定（そうすれば「人間 principal による変更＝要確認」と定義できる。現状は個人ローカル apply のため正規変更と区別しにくい）。
- **連絡**: クライアント GCP 管理者（IAM はクライアント権限）。

#### F. アプリ脆弱性の悪用（XSS / インジェクション / ファイルアップロード / IDOR）

- **検知**: #13、14、15。CSP 違反（report-uri は未設定と推測、要確認）。
- **止血**: 機能単位の無効化トグルは無い（推測）。直前の正常リビジョンへのロールバック（runbook §1.7）か修正版のデプロイ。悪意あるコンテンツ（お知らせ、問い合わせ本文、添付）は管理画面での削除・非公開化を優先。
- **調査**: `[api-errors] Forbidden` / `Invalid request` の issues.path と対象ユーザー、リクエストログの URL・UA、DB で当該レコードの作成者と時刻。添付は MIME 許可リストと上限（5MB / 20MB、`src/lib/constants/attachment.ts`）を通過している前提で、中身も確認。
- **封じ込め**: 修正 PR を出し、デプロイ前にマイグレーション要否を確認（deploy-main）。
- **再発防止**: テスト追加、CSP report-uri、依存更新。
- **連絡**: 責任者。他社データの閲覧が成立していればクライアントと §4.5。

#### G. Cloud SQL の異常

- **検知**: #16〜18。
- **止血**: 接続元が異常なら `db_public_ip_enabled` / authorizedNetworks を確認（Terraform 管理、authorizedNetworks は空のはずだが要確認）。DB パスワードをローテーション（B）。重いクエリは `pg_stat_activity` で確認（本番 DB への書き込み操作は手順書化と承認が必要）。
- **調査**: postgres.log（`connection received: host=`、`authentication failed`）、Admin Activity、Query Insights（有効化状況は要確認）。
- **復旧**: バックアップ / PITR（runbook §2.3）。
- **再発防止**: private IP 化（Terraform にトグル実装済み）、`log_connections` / `log_disconnections` フラグ、必要なら pgaudit。

#### H. Scheduler / 内部 API の悪用

- **検知**: #24、25。
- **止血**: `gcloud scheduler jobs pause`（runbook §3.7）、CRON_SECRET のローテーション。
- **調査**: `httpRequest.requestUrl=~"/api/cron/"` を remoteIp・userAgent・status で集計し、`resource.type="cloud_scheduler_job"` の実行ログと突合。督促はメール送信を伴うため `[cron] announcement-escalation result` の件数と `AnnouncementNotificationLog` を確認。log-retention の不正実行は AuthEvent（監査ログ）の消失につながるが、削除対象は保持期間外の行のみで dryRun は fail-safe。
- **再発防止**: OIDC を必須化し、アプリ側でトークン（aud と SA email）を検証する。現状は secret のみで認証し、OIDC は Cloud Run の IAM 側でしか効かない。Cloud Run が allUsers 公開のままでは OIDC は実質効いていない。

#### I. サプライチェーン（npm / Actions / イメージ / デプロイ経路）

- **検知**: dependabot、CI の `npm audit`、GitHub セキュリティアドバイザリ、#21（予定外リビジョン）。
- **止血**: 該当リビジョンを止め、直前の正常リビジョンにトラフィックを戻す。
- **調査**: `package-lock.json` の差分、リビジョン作成の principal（Admin Activity の run.googleapis.com）、Cloud Build 履歴。
- **封じ込め**: 漏えいの恐れがある secret をすべてローテーション（ビルド時に env を読むコードは無い前提、要確認）。
- **再発防止**: 既存対策（Actions SHA 固定、dependabot cooldown、CODEOWNERS、必須チェック `verify`）に加え、イメージのコミットハッシュタグ（container-build.md で推奨済み・未検証）、Binary Authorization（後回し）、ブランチ保護・タグ保護の定期確認。
- **連絡**: 責任者。

## 4. 体制・運用

### 4.1 通知先

| 重大度 | 経路 | 備考 |
|---|---|---|
| P1 | 共有 ML とチャット（Slack / Teams / Google Chat）、必要なら電話 | 現状はメール 1 件のみ。monitoring.md の方針どおりチャネルを足すだけでポリシーは変えなくてよい |
| P2 | 共有 ML とチャット | 業務時間内に対応 |
| P3 | 通知しない | 週次レビューで保存クエリを確認 |

dev と prod はチャネルを分け、dev の通知を本番運用者に送らない。dev のセキュリティアラートは P3 扱いでよい。

### 4.2 当番・責任者（少人数前提）

- インシデント責任者（判断・対外連絡）と対応者（調査・操作）を最低限分ける。2 名体制なら主担当・副担当を週替わりにする。
- 業務時間外の P1 に対応するかはクライアントと合意する（未決）。対応しない場合は「翌営業日朝に初動」と許容停止時間を文書化する。
- 現状、apply・デプロイ・アラート受信が 1 人に集中している（CODEOWNERS も 1 名）。属人化リスクとして副担当を任命する。

### 4.3 ログの保持・シンク

- 既定は `_Required` が 400 日（Admin Activity・システムイベント）、`_Default` が 30 日（Cloud Run・Cloud SQL・Data Access）。
- **提案**: セキュリティ関連ログ専用のログバケット（保持 365 日。AuthEvent の 365 日に揃える）と、包含フィルタ付きシンクを Terraform で作る。
  - 対象: Cloud Run リクエストログ、`jsonPayload.message="auth"`、管理操作の監査、`[api-errors]`、Data Access、postgres.log。
  - 費用は 30 日超の保持料金のみ。小規模なら月数百円程度と推測（要試算）。
  - 改ざん耐性が必要ならバケットロックや別プロジェクトへのシンク（クライアント管理）。
- Log Analytics を有効にすると SQL で集計でき、IP 上位抽出などが容易になる。

### 4.4 Data Access ログ（コストと範囲）

| サービス | 推奨 | 理由 |
|---|---|---|
| secretmanager DATA_READ | 有効 | 読み取りはデプロイ・起動時のみで低量。漏えい調査に必須 |
| storage DATA_READ / DATA_WRITE | 有効（量を見て判断） | 低量。持ち出し調査に使う。バケット単位で絞れないため量を確認 |
| cloudsql DATA_READ | 任意 | Admin API の読み取りのみで SQL クエリは記録されない。SQL を見たいなら pgaudit（後回し） |
| iam / run DATA_READ | 無効 | 量の割に価値が低い |

### 4.5 クライアント GCP との責任分界（案）と個人情報

- **クライアント**: 組織ポリシー、IAM 付与、Workspace（2SV、退職者停止）、OAuth 同意画面、組織レベルのログ（SCC 等）、請求。
- **自社**: アプリ、Terraform 管理リソース、アラートの一次受け、アプリ内アカウント（スタッフ・申請者）の運用。
- **共同**: P1 の判断、外部報告。SOC・セキュリティ窓口をどちらが持つかは要確認。
- **個人情報の報告義務**: 保有データは販社担当者の氏名・メール、問い合わせ本文、`AnnouncementNotificationLog` の宛先メール（平文）。AuthEvent は仮名化されているが突合で個人に結び付く可能性がある。利用者は 20 か国以上と想定され、GDPR（EU/EEA 拠点がある場合）、日本の個人情報保護法、タイ PDPA、ブラジル LGPD、中国 PIPL などが該当しうる。適用法域・管理者/処理者の区分・委託契約上の報告期限は、**クライアントの法務・DPO に要確認**（本書では法的断定をしない）。

## 5. ギャップと優先順位

### 先にやるべき上位 5 つ

> 上位 1・2 は実装済み（`infra/modules/monitoring/security.tf`、一覧と使い方は [monitoring.md](./monitoring.md)）。methodName の実ログ確認と、業務時間外条件・Data Access・postgres.log 系は未実装。

| # | 項目 | 解決手段 | 工数 |
|---|---|---|---|
| 1 | Admin Activity のセキュリティアラート（SetIamPolicy、SA 鍵作成、シンク/バケット/audit config 変更、Cloud SQL export・ユーザー変更）。ログ一致型（`condition_matched_log`）で monitoring モジュールに追加 | Terraform | 小 |
| 2 | 認証系ログベースメトリクスとしきい値アラート（#5、6、8、11）。`google_logging_metric` に type/reason のラベルを付ける。admin 化・エクスポート・account_inactive は 1 件で通知 | Terraform | 小〜中 |
| 3 | セキュリティログ用バケットとシンク（365 日）、Secret Manager / GCS の Data Access 有効化 | Terraform（audit_config は IAM 権限が必要なため、クライアントによる bootstrap 側） | 小〜中 |
| 4 | 通知チャネルの多重化、P1/P2 の分離、共有 ML 化、当番表とエスカレーション表の作成 | Terraform + 運用ルール | 小 |
| 5 | アプリの監査ログの穴埋め: 申請者・販社の作成/無効化/パスワード変更、Cron 401 の WARNING ログ、ipSummary を XFF の最後の値（または Cloud Run 付与値）から取る修正（または根拠にしない旨の明記） | アプリ変更 | 中 |

### 次点

- dev の「社内ネットワークのみ」の実装（LB + Cloud Armor の IP 許可、または IAP）。Terraform・大工数。方針と実態が矛盾しているため、方針決定が先。
- Cloud SQL の `log_connections` フラグ（Terraform・小。再起動の要否は要確認）。
- Cron の OIDC 必須化とアプリ側トークン検証（アプリ + Terraform・中）。
- prod の Credentials ログイン無効化トグル（アプリ + Terraform・中）。
- Cloud Armor のレート制限（Terraform・中〜大）。

### 後回しでよいもの

pgaudit（中）、VPC-SC（大）、Binary Authorization（中）、SCC 導入（クライアントの組織次第）、スキャナのパス・UA のアラート化（P3 集計で十分）、CSP report-uri（小）。

## 6. 要確認事項（クライアントとの論点）

1. 申請者（海外販社）のログイン方式。prod で Google（社外ドメイン含む）に一本化するか、Credentials を残すか。「prod=社内 Google アカウント」の「社内」の範囲（販社を含むか）。
2. dev の「社内ネットワークのみ」の実現方法（IAP / Cloud Armor IP 許可 / VPN）と社内の送信元 IP レンジ。
3. 業務時間外の P1 対応の要否、許容停止時間、SLO。
4. 通知先（共有 ML、チャットツール）とクライアント側の一次連絡先。クライアントに SOC・CSIRT があるか。
5. Data Access ログ有効化と audit_config 変更の実施者（IAM 権限が必要）、ログ保持期間・保管場所の社内規程、費用負担。
6. 組織ポリシー（SA 鍵作成禁止、allUsers 禁止、Domain Restricted Sharing）、組織レベルのログシンクや SCC の有無。
7. 個人情報の取り扱い: 対象国・拠点、適用法域、管理者/処理者の区分、委託契約上のインシデント報告期限、DPO・法務窓口。
8. Workspace の 2SV 強制・退職者即時停止の運用と、アプリのアカウント棚卸し（月次）の連動。
9. apply・デプロイ経路の将来像（CI + WIF 化）と IAM 変更の承認フロー。正規 principal の一覧。
10. tfstate バケットと DB エクスポートバケットの閲覧権限者。
11. SMTP の送信元・送信量上限（スパム悪用時に止める手段）、Anthropic API キーの所有者と上限設定（現在は個人発行キーを流用）。
12. 利用者数と想定アクセス量（しきい値のベースライン）、販社拠点の国・IP 帯（地理的異常判定に使えるか）。
