# クライアントGCP環境が用意されるまでに進められる作業

作成日: 2026-10-23(同日、現状に更新)
関連: `docs/infra/iac-plan.md`(全体計画)、`docs/infra/import-current.md`(現行環境の取り込み手順。確定済み)

## 前提と合意事項

- クライアントのGCP環境(新規プロジェクト)は、まだ受け取れない想定
- `apply` は自社担当者(suenaga)がローカルから実施。クライアントから付与予定の権限は Editor 相当
- 環境は dev / prod の2面。ツールは Terraform
- 現行の自社GCP(`rvp-ai-proto-camp`)の `portal-mock` は、**作り直さず Terraform に取り込み(import)**、アプリイメージ・DBデータ・公開URL・`AUTH_URL` を変えずに段階的に設定を直す
- Google ログインは「許可ドメインのみ」。確認期間は自社+クライアントの複数ドメイン、本番はクライアントのみ。既存アカウントとの対応づけは案A(DB登録済みユーザーのみ、自動作成なし)
- 作業は別エージェントに依頼して進める(ユーザー指示)。共用プロジェクトへの `apply` は権限分類器にブロックされるため、ユーザーが `!` で実行する

## 決定事項(2026-10-23)

- 機密値(DBパスワード・`AUTH_SECRET`)は**ローテーションする(案A)**。旧 revision へのロールバックは不可(合意済)
- secret 参照への切替は、3a(同値移行)を省いて**3b(ローテーション込み)に一本化**
- Terraform の検証先プロジェクト: 空プロジェクトの新規作成は不可のため**保留**。現行環境の取り込みで実環境に対する plan/apply 検証を兼ねる
- Google ログインのエラー表示: 「未登録 / 無効化済み / ドメイン不許可 / その他」の**4種類を区別したまま**とする
- spec 管理(`design.md` / `tasks.md` 更新): kiro の spec 駆動フローが停止中のため**更新不要**

## 完了済み

- 段階0〜3(現行環境の取り込み)
  - Cloud SQL オンデマンドバックアップ作成(バックアップ ID 1792737901348)
  - bootstrap(GCS state バケット `rvp-ai-proto-camp-portal-iac-tfstate`)作成
  - Terraform 取り込み(import)16件
  - 機密値のローテーション(`rotate-secrets.sh`)
  - Cloud Run を secret 参照へ切替(ブラウザでの正常動作確認済み)
- Dockerfile 化(コミット f503ec0、ブランチ `chore/dockerfile-migrate-job`)
- Google ログイン(ドメイン限定、サーバー側検証。コミット 86970e3、ブランチ `feature/google-login`。実OAuthの往復は未検証)
- 現行環境の Google ログイン有効化の準備(2026-10-27): OAuth 同意画面(内部)とクライアント作成、`portal-mock-auth-google-id` / `-secret` に値を登録済み。`current.tfvars` で `enable_google_login = true`・許可ドメイン `revamp.co.jp`(plan は Cloud Run の env 3件追加のみ)。apply と実機検証は未了
- 許可メールドメインの複数指定対応(コミット 94534d1、ブランチ `chore/iac-terraform-plan`)
- Terraform 一式(`infra/`: bootstrap / modules / envs dev・prod)と取り込み手順書
- 現行環境へのデプロイ(2026-10-26)
  - migrate Job の作成と実行(事前にオンデマンドバックアップ取得。38 migration 検出・1 件適用 `20261026000000_add_auth_throttle_and_audit`、19秒で成功)
  - アプリを revision `portal-mock-00033-dcr` へデプロイ(トラフィック 100%、ERROR ログ 0 件、画面で正常表示を確認)。ロールバック先は `00032-mcg`(保持中)
  - 作業用ファイル(Terraform の保存 plan とログ)の削除

## 未了

- (段階4a は適用済み: 自動バックアップ有効・削除保護有効。再起動なし、Cloud Run のエラーなしを確認)
- (段階4b は適用済み: Cloud SQL の TLS 必須化 `sslMode=ENCRYPTED_ONLY`。適用後に Cloud Run の正常稼働を確認)
- 段階5: 後始末
  - 旧 revision の削除: 完了(00001〜00029 を削除。00030/00031 は保持、00032 が 100% 配信)。注意: 00030/00031 は Secret 切替前の旧値(ローテーション済み=無効)を持つため、戻しても動かない(`runbook.md` §1.7)
  - 旧 secret version: 無し(対応不要)
  - GCS 上の state 旧世代: 巻き戻し用に保持
  - 作業用ファイルの削除: 完了(2026-10-26)
- (完了) `feature/google-login` の spec 変更の取り消し、各ブランチの push / PR
- (完了) migrate Job(PR #155。2026-10-26 に現行環境で作成・実行を検証済み)、監視(PR #156)、運用手順書(PR #157)は main にマージ済み
- (完了) 認証まわりの堅牢化(ロックアウト、ログイン試行制限、監査ログ、セキュリティヘッダ。PR #158)は main にマージ済みで、2026-10-26 に現行環境へデプロイ済み
- アプリ側の残り: SMTP の接続先差し替え対応と検証、保持期間超過データの削除
- 運用面: 運用手順書(リリース、バックアップからの復旧、障害対応)、監視・アラート定義の雛形(いずれも main に反映済み。実環境での検証は未了)
- クライアントとの並行調整(早めに依頼)
  - ギャップ一覧(「本番に必須 / リリース後でよい / 不要」)の合意
  - クライアント環境の申請(プロジェクト作成、請求先、Editor 付与)
  - Workspace 管理者への依頼事項(OAuth 同意画面・クライアント、許可ドメイン、サードパーティアプリの許可)
  - セキュリティ質問票への回答(現状は二要素認証・SSO ともに未対応、IP 制限なし)

## 後回しでよいもの(クライアントの要件確定後)

SMTP の本接続と Cloud Scheduler(現行環境では見送り。`enable_scheduler` は Terraform 生成の CRON_SECRET 前提で、`use_existing_secrets=true` の現行環境とは両立しない。クライアント環境(新規構築)で実施する。2026-10-27 に plan で確認)、バックアップの定期エクスポート(保持期間・RPO の確認が先)、監視、CI/CD、Cloud Armor / IAP、カスタムドメイン、Cloud SQL の private IP 化

## 判断待ち(ユーザー)

1. (解消済み) 各ブランチの push / PR は完了
