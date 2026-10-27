# Terraform の CI と予算アラート

作成日: 2026-10-27
関連: `docs/infra/iac-plan.md`(全体計画。Phase 5 の budget alert / CI/CD に相当)

## 1. 予算アラート(`infra/modules/budget`)

`google_billing_budget` で、対象プロジェクトの月額予算としきい値通知を作成する。`envs/dev` / `envs/prod` の変数で切り替える。**既定は `enable_budget_alert = false`(何も作らない)**。

| 変数 | 既定 | 内容 |
|---|---|---|
| `enable_budget_alert` | `false` | 予算を作成する |
| `billing_account_id` | `null` | 請求先アカウントID(`enable_budget_alert=true` で必須) |
| `budget_monthly_amount` | `null` | 月額予算額(同上) |
| `budget_currency_code` | `JPY` | 請求先アカウントの通貨と一致させる |
| `budget_alert_emails` | `[]` | 通知先メール。空なら請求先アカウント管理者への既定通知のみ |

- 通知しきい値: 実績 50% / 90% / 100%、予測 100%(モジュール変数 `threshold_percents` / `forecast_threshold_percents` で変更可)
- `budget_alert_emails` を指定すると Cloud Monitoring のメール通知チャネルを作り、既定の請求先管理者通知は止める(両方欲しい場合は管理者のメールも `budget_alert_emails` に含める)
- Budget API(`billingbudgets.googleapis.com`)はモジュールが有効化する

### 権限(重要)

- 予算は**請求先アカウント側**のリソース。作成には請求先アカウントに対する `Billing Account Administrator`(`roles/billing.admin`)または `Billing Account Costs Manager`(`roles/billing.costsManager`)相当が必要
- **プロジェクトの Editor だけでは作成できない可能性が高い**。クライアントから Editor のみ付与される場合は、①請求先管理者に上記ロールを(一時的にでも)付与してもらう、②請求先管理者に予算を作ってもらう(上記の月額・しきい値・通知先を伝える)、のどちらかになる
- 権限確認が済むまでは `enable_budget_alert=false` のままにする(`apply` が権限エラーで止まるのを避ける)
- ユーザー認証(ADC)で Budget API を呼ぶには課金/クォータ用プロジェクトの指定が必要なため、`envs/*/main.tf` に `user_project_override=true` の別名 provider(`google.budget`)を追加し、budget モジュールにだけ渡している(他リソースの挙動は変わらない)
- `billing_account_id` は `gcloud billing projects describe <project_id>` で確認できる(要 `billing.resourceAssociations.list`。分からなければクライアントに確認)
- 通貨はクライアントの請求先アカウントの通貨に合わせる(JPY 想定。要確認)

### 有効化手順

1. `<env>.tfvars` に `enable_budget_alert = true` と `billing_account_id` / `budget_monthly_amount` / `budget_alert_emails` を設定
2. `terraform plan` で `module.budget` の追加のみであることを確認 → `apply`
3. dev と prod を同一プロジェクトに置く場合、予算フィルタは**プロジェクト単位**のため、両 env で有効化すると同じプロジェクトに予算が2つできる(競合ではなく二重通知になり、`name_prefix` が同じだと表示名も紛らわしい)。**片方の env のみ有効化する**のを推奨。両方有効化する場合は `name_prefix` を分け、通知が二重になることを許容する
4. `module.budget` は `module.services`(API 有効化)の後に作成される(`depends_on`)。`billing_account_id` / `budget_monthly_amount` / 通貨はモジュール側 validation で形式チェックされ、不正なら分かりやすいメッセージで止まる

## 2. CI(`.github/workflows/terraform.yml`)

`infra/**` を変更する PR と main への push で動く。

| ジョブ | 内容 | 認証 | 状態 |
|---|---|---|---|
| `fmt` | `terraform fmt -check -recursive` | 不要 | 常に有効 |
| `validate` | `bootstrap` / `envs/dev` / `envs/prod` で `init -backend=false` → `validate` | 不要 | 常に有効 |
| `plan` | `envs/dev` / `envs/prod` で `terraform plan`(Job Summary には変更件数のみ。prod は GitHub Environment 承認必須) | WIF | **既定で無効** |

- Terraform のバージョンは `1.6.1`(ローカルと同じ。`required_version >= 1.6`)。`.terraform.lock.hcl` はコミット済みなので provider は固定される
- **`apply` は CI では行わない**(ローカルから実施する運用のまま)

### plan を有効にする条件と手順

クライアント環境に Workload Identity Federation を作れる権限(`iac-plan.md` §3.1 のとおり Editor では不足。`Project IAM Admin` 相当)が得られてから行う。権限が無い間は何も設定せず、`fmt` / `validate` のみで運用する。

1. クライアント環境に WIF プール / プロバイダ(GitHub OIDC、リポジトリ条件を `yuitosuenaga/<repo>` に限定)と plan 用サービスアカウントを作る
2. plan 用 SA には**読み取り系ロール**(`roles/viewer` 等)と、state バケットの `roles/storage.objectViewer` を付与する。`secretmanager` の値を読むロールは付けない。state には生成済み secret が平文で入る(`iac-plan.md` §9)ため、state の読み取り権限をどこまで CI に与えるかはクライアントのセキュリティ方針に従う
   - `-lock=false` で plan するため state への書き込み権限は不要
3. GitHub のリポジトリ設定に次を登録する
   - Variables: `GCP_WIF_PROVIDER`(`projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`)、`GCP_PLAN_SERVICE_ACCOUNT`、`TF_STATE_BUCKET`
   - Secrets: `TFVARS_DEV` / `TFVARS_PROD`(各 `<env>.tfvars` の中身。tfvars は git 管理外のため)
   - Variables: `TF_PLAN_ENABLED` = `true`(これが plan ジョブのスイッチ)
4. GitHub の Environment `terraform-plan-prod` を作成し、Required reviewers を設定する(workflow は prod の plan のみこの Environment を指定する。承認が無ければ prod の plan は走らない)
5. PR を作り、`plan` ジョブが緑になり Job Summary に変更件数(`Plan: x to add...`)が出ることを確認する。詳細な plan 本文は公開リポジトリのため CI には出さない。必要な場合はローカルで `terraform plan` を実行する

### plan ジョブのセキュリティ上の制限(重要)

- **同一リポジトリの PR のコードは plan 用 SA の権限で実行される**。PR が `infra/**` の Terraform(`external` data source、provider の差し替え等)や workflow 自体を書き換えれば、任意コードが OIDC トークン経由で plan 用 SA として動く。fork PR は `id-token` が得られず対象外だが、リポジトリに書き込める人は誰でもこの経路を使える
- 対策(併用する)
  - WIF プロバイダの `attribute_condition` を **リポジトリだけでなく ref / environment まで絞る**。例: `assertion.repository == "<owner>/<repo>" && (assertion.environment == "terraform-plan-prod" || assertion.ref == "refs/heads/main" || assertion.event_name == "pull_request")`。prod 用 SA の `workloadIdentityUser` バインドは `assertion.environment == "terraform-plan-prod"` の主体のみに限定し、承認なしの PR から prod 用 SA を取れないようにする(dev 用 SA と prod 用 SA は分ける。attribute のマッピングに `environment` / `ref` を追加する必要あり)
  - 書き込み権限者の制限、`.github/workflows/**` と `infra/**` への CODEOWNERS とブランチ保護(レビュー必須)
  - plan 用 SA に付与するロールを最小にする(下記)
- **公開リポジトリでは plan 本文を出さない**。本 workflow は Job Summary を変更件数のみにし、ログにも件数行以外を出さず、`plan.txt` / `ci.tfvars` はジョブ末尾で削除する(リソース名・IP・メール等の漏えい防止)。tfvars は Secrets 前提(Variables は不可)

### plan 用 SA の state 読み取り = 機密読み取り権限(クライアント承認事項)

state バケットの `roles/storage.objectViewer` は、state に平文で入っている生成済み secret(DB パスワード等。`iac-plan.md` §9)を読めることと**実質同じ**。したがって plan 用 SA は「機密を読める主体」として扱う必要がある。クライアントの承認が必要な事項:

1. CI(GitHub Actions)に state 読み取り権限を与えてよいか(与えない場合 plan ジョブは無効のまま)
2. 与える場合、上記のとおり WIF の ref/environment 絞り込みと prod の Environment 承認を必須とするか
3. state 内の secret を減らす/state バケットを分離する方針(env 別バケット・prefix 単位の IAM 条件)

fork からの PR では `id-token` が得られないため、plan は同一リポジトリの PR のみで実行される。

## 3. 未確定・要判断

- クライアント環境で GitHub Actions + WIF を使ってよいか(使えない場合 plan は無効のまま、または別の仕組み)
- 予算額・通知先・しきい値、dev/prod で予算を分けるか(§1)
- リポジトリがクライアント環境に移管される場合、WIF のリポジトリ条件(`attribute.repository`)を移管後の名前にする
- plan 用 SA の state 読み取りと WIF 条件(§2)のクライアント承認

## 4. 補足

- workflow の actions(`checkout` / `setup-terraform` / `google-github-actions/auth`)はコミット SHA 固定(コメントに元タグ)。更新時は SHA を取り直す
- `pull-requests: write` は未使用のため付与していない
