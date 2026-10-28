# portal-mock 運用手順書

作成日: 2026-10-26
対象: クライアントへの引き渡し、および運用担当者向け。

関連文書: `iac-plan.md`(全体計画)、`current-state.md`(現行環境の実測値)、`import-current.md`(現行環境の Terraform 取り込み手順)、`container-build.md`(コンテナビルドと migrate Job)、`pre-client-env-work.md`(作業の進捗と決定事項)。

## 0. この手順書の位置づけ

- 機密値の実値は一切記載しない。`<...>` で示した箇所は、実行者が環境に合わせて置き換える。
- コマンドの例は、現行環境(プロジェクト `rvp-ai-proto-camp`、リージョン `asia-northeast1`、サービス `portal-mock`、Cloud SQL `portal-mock-backend-db`)の値で書いている。クライアント環境では、Terraform の `name_prefix` とプロジェクトIDに読み替える。
- **「未検証」と明記した手順は、実環境で実行して確認していない。** 初めて実行する際は、事前にバックアップを取り、影響範囲を確認してから行う。
- 現行環境は、自社が用意した共用の検証プロジェクト上にある。クライアントの新規プロジェクトでの運用は、構築完了後に本書を見直す。

### 0.1 環境の前提

| 項目 | 現行環境の状態 |
|---|---|
| 公開URL / `AUTH_URL` | `https://portal-mock-700069905019.asia-northeast1.run.app`(ログイン確認はこのホストで行う) |
| Cloud Run | `portal-mock`。メモリは Terraform の設定値が 1Gi(§3.1.1。`terraform apply` するまで稼働中の revision は 512Mi のまま)。イメージは `--source` デプロイで Artifact Registry `cloud-run-source-deploy/portal-mock` に保存される |
| Cloud SQL | `portal-mock-backend-db`(PostgreSQL 16、`db-f1-micro`、ZONAL)。自動バックアップ(PITR は無効)と削除保護は適用済み(段階4a)。TLS 必須化(`sslMode=ENCRYPTED_ONLY`)も適用済み(段階4b)で、適用後に Cloud Run の正常稼働を確認済み。確認コマンドと期待値は §5.6 |
| Secret Manager | `portal-mock-database-url` / `portal-mock-auth-secret`(ローテーション対象)、`anthropic-api-key-suenaga-daiso-portal`(手動登録) |
| Terraform state | GCS バケット `rvp-ai-proto-camp-portal-iac-tfstate`(prefix `dev`) |
| Cloud Scheduler | 現行環境にはジョブなし。エスカレーションの定期実行は未稼働(アクセス時トリガーのみ)。導入時の注意は「Scheduler の attempt_deadline」参照 |
| Cloud SQL の起動 | 現行は手動で起動・停止している(`db-start` / `db-end`)。停止中は `portal-mock` も DB 接続エラーになる。クライアント環境で常時稼働にする場合、`db-end` は不要 |

---

## 1. リリース手順

> **警告: マイグレーションはデプロイより先に適用する。** 追加のみのマイグレーションは旧コードと後方互換のため、先に適用しても稼働中のサービスを壊さない。順序を逆にすると、新しいテーブルやカラムを参照する機能がエラーまたは0件表示になる(過去に複数回発生している)。
> 具体例: PR #158(認証ハードニング)のマイグレーション `20261026000000_add_auth_throttle_and_audit` を先に適用せずにデプロイすると、**Credentials(メール+パスワード)ログインが不能になる**(Google ログインは動く)。

流れは次のとおり。

1. 対象コミットの確定(`main` の最新)
2. 事前確認(Cloud SQL の起動、新規マイグレーションの有無、バックアップ)
3. イメージの build / push
4. マイグレーションの適用
5. Cloud Run へのデプロイ
6. 動作確認
7. 問題があればロールバック(§1.7)

### 1.1 事前確認

```bash
# Cloud SQL が起動しているか(RUNNABLE かつ ALWAYS であること)
gcloud sql instances describe portal-mock-backend-db --project rvp-ai-proto-camp \
  --format="value(settings.activationPolicy,state)"

# 停止中なら起動する(現行の手動運用の場合)
gcloud sql instances patch portal-mock-backend-db --project rvp-ai-proto-camp --activation-policy=ALWAYS --quiet

# 今回のデプロイ範囲に新規マイグレーションがあるか(先に最新の origin/main を取得する)
git fetch origin
git log --oneline <前回デプロイ済みコミット>..origin/main -- prisma/migrations
```

「前回デプロイ済みコミット」は、前回のリリース記録(§1.6)に残したコミットを使う。記録が無い場合は、稼働中の revision の作成日時(`gcloud run revisions list` の DEPLOYED 列)より前の `origin/main` のコミットを `git log --before=<日時>` で辿る。迷う場合は、適用済みマイグレーションを `npx prisma migrate status`(§1.3 の接続方法)で確認するのが確実である。

新規マイグレーションがある場合、またはデータを書き換える作業(バックフィル等)がある場合は、**デプロイ前にオンデマンドバックアップを取る**(§2.2)。

### 1.2 イメージの build / push

現行環境で実績のある方法は、`gcloud run deploy --source .` によるソースデプロイ(Cloud Build が build と push、デプロイまでをまとめて行う)である。`deploy-main` スキル(`.claude/commands/deploy-main.md`)はこの方法を使い、`origin/main` を独立した一時 worktree にチェックアウトして実行する。

`Dockerfile`(runner / migrate の2ターゲット)は `main` にマージ済みである。Artifact Registry へ明示的に build / push して、タグ付きイメージをデプロイする方法は `container-build.md` にある。クライアント環境では、この方法でイメージにコミットハッシュのタグを付ける運用を推奨する(ロールバック時に、どのコードか特定しやすい)。

```bash
PROJECT=<project-id>; REGION=asia-northeast1; REPO=portal-mock
IMAGE=$REGION-docker.pkg.dev/$PROJECT/$REPO
gcloud builds submit --project $PROJECT --tag $IMAGE/app:$(git rev-parse --short HEAD) .
```

migrate イメージは、リポジトリ直下の `cloudbuild.migrate.yaml` で build する(`gcloud builds submit --config cloudbuild.migrate.yaml --substitutions _IMAGE=$IMAGE,_TAG=<tag> .`。詳細は `container-build.md`)。

検証済み(2026-10-26): migrate イメージを `cloudbuild.migrate.yaml` で build した(タグは `main` の短縮コミットハッシュ `a216d00`、所要 5分21秒)。アプリイメージのタグ付き build / push(上記の `gcloud builds submit --tag`)は、現行環境では実行していない(**未検証**)。

注意: Artifact Registry のリポジトリ(`portal-mock`)が未作成の環境では、**事前の作成が必要**である(未作成だと push に失敗する)。

```bash
gcloud artifacts repositories create $REPO --project $PROJECT --location $REGION --repository-format=docker
```

### 1.3 マイグレーションの適用(`prisma migrate deploy`)

`migrate` ターゲットの Cloud Run Job(`portal-mock-migrate`)による適用が目標の形である。

- **現状**: Job は Terraform 定義済み(`enable_migrate_job=true` で作成)。**2026-10-26 に現行環境で Job の作成・実行を検証済み**(下記)。
  - 事前に `gcloud sql backups create`(オンデマンドバックアップ。ID 1793005128274)を取得した。
  - `cloudbuild.migrate.yaml` で migrate イメージを build(タグ=`main` の短縮ハッシュ `a216d00`、5分21秒)→ `gcloud run jobs update --image` → `gcloud run jobs execute --wait`。実行は19秒で成功した。
  - 38 件の migration を検出し、1 件を適用した(`20261026000000_add_auth_throttle_and_audit`)。ログに接続文字列は出なかった。初回実行でも問題はなかった。
  - Terraform 側は Job の image を `ignore_changes` にしているため、image 更新による plan の差分は出ない。
- **現状の運用(実績あり)**: `deploy-main` スキルの手順3に従い、Cloud SQL Auth Proxy 経由でローカルから `prisma migrate deploy` を実行する。本番 `DATABASE_URL` を扱うため、手順は次の注意を守る。
  - `DATABASE_URL` を含むファイルを作ったり、作業ディレクトリに残したりしない。画面に出さない(`echo` しない)。作業後にソケットディレクトリを削除し、シェル変数を `unset` する。
  - `gcloud run services describe ... --format=json` の全体出力は、環境変数(平文の場合は機密値)を含むため、画面に出さない。**現行環境では `DATABASE_URL` は Secret 参照のため、`describe` の env から `.value` を取る旧手順(`jq .value`)では空になる。** Secret Manager から直接読む。
  - `DATABASE_URL` の取得(シェル変数に直接代入する。ファイルに書かない、`echo` しない):

    ```bash
    DB_URL=$(gcloud secrets versions access latest --secret portal-mock-database-url --project rvp-ai-proto-camp)
    ```

    値は `postgresql://user:pass@localhost/db?host=/cloudsql/<connection-name>` というUnixソケット形式。`?host=/cloudsql/...` の部分を、Cloud SQL Auth Proxy のソケットディレクトリ(`--unix-socket <一時ディレクトリ>` で起動した場合は `<一時ディレクトリ>/<connection-name>`)に置換した値を `DATABASE_URL` として `npx prisma ...` に渡す(例: `DATABASE_URL="${DB_URL%%\?host=*}?host=<一時ディレクトリ>/<connection-name>" npx prisma migrate status`。置換後の値も画面に出さない)。
  - 手順: Cloud SQL Auth Proxy を起動 → `npx prisma migrate status` で未適用を確認 → 未適用があれば `npx prisma migrate deploy` → 再度 `migrate status` で `Database schema is up to date!` を確認 → Proxy を停止してソケットディレクトリを削除し、`unset DB_URL`。

Job が整備された後の運用(`container-build.md` に基づく):

```bash
# migrate イメージを build / push した後、Job のイメージを更新して実行(完了まで待つ)
gcloud run jobs update portal-mock-migrate --project $PROJECT --region $REGION --image $IMAGE/migrate:<tag>
gcloud run jobs execute portal-mock-migrate --project $PROJECT --region $REGION --wait
```

実行結果は Cloud Run Job の実行履歴とログで確認する(§3.5)。失敗した場合は、サービスのデプロイに進まない。マイグレーションが失敗状態で止まった場合は、原因を解消したうえで `prisma migrate resolve`(`--applied` / `--rolled-back`)で状態を解決してから再実行する。

### 1.4 Cloud Run へのデプロイ

`deploy-main` スキルを使う場合(現行環境):

```bash
# 独立した一時 worktree で origin/main を detached HEAD にし、そのディレクトリで実行する
gcloud run deploy portal-mock --source . --clear-base-image --project rvp-ai-proto-camp --region asia-northeast1 --quiet
```

**`Dockerfile` 導入後は `--clear-base-image` が必須**(2026-10-26 に確認)。付けないと `Missing required argument [--clear-base-image]` で即エラーになり、revision は作られない。付けても env / Secret / Cloud SQL の設定は変わらない(デプロイ前後で annotations は同一。増えたのは `client-name` / `client-version` のみ)。ビルドを含めて 120 秒を超える(正確な所要時間は未計測)。

実績(2026-10-26): 新 revision `portal-mock-00033-dcr`(digest 先頭 `sha256:de17840d03a8`)、トラフィック 100%、起動 6.6 秒、8080 の待受を確認、ERROR ログ 0 件。認証プロバイダ API、`/ja/login`、`/ja/helpdesk/login` は 200、静的アセットも 200、セキュリティヘッダ 6 種を確認した(HSTS は `max-age=31536000` のみで `includeSubDomains` は無し)。画面での正常表示もユーザーが確認した。

デプロイ前に設定を控える場合は、env を出力せずに次で確認できる(`--format=json` の全体出力は避ける)。

```bash
gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp \
  --format="value(spec.template.metadata.annotations)"
```

タグ付きイメージを使う場合(`container-build.md`):

```bash
gcloud run deploy portal-mock --project $PROJECT --region $REGION \
  --image $IMAGE/app:<tag> \
  --add-cloudsql-instances <project>:<region>:<instance>
```

注意点:

- 環境変数と Cloud SQL 接続設定は前 revision から引き継がれる。変更が不要な限り `--set-env-vars` 等は付けない(env を付けると Secret 参照が上書きされる恐れがある)。
- Terraform は Cloud Run の `image` を `lifecycle.ignore_changes` にしているため、イメージ更新によって Terraform の plan に差分は出ない。アプリのデプロイと Terraform は分離している。
- `release` ブランチは、このデプロイ手順とは無関係である。`main` から直接デプロイする。
- 本番サービスへの反映のため、対象コミットを関係者に確認してから実行する。

### 1.5 動作確認

1. 反映された revision と URL を確認する。

   ```bash
   gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp \
     --format="value(status.latestReadyRevisionName,status.url)"
   ```

2. **`AUTH_URL` に固定されているホスト**でログインして確認する(`describe` が表示する別ホストでログインすると、リダイレクトでセッションが引き継がれずログイン画面に戻される)。現行環境は `https://portal-mock-700069905019.asia-northeast1.run.app`。
3. 主要画面(お知らせ、問い合わせ)が表示されること。
4. 認証プロバイダ一覧が JSON で返ること: `curl -s <AUTH_URL>/api/auth/providers`
5. ログにエラーがないこと(§3.5 のクエリ)。
6. 環境変数の Secret 参照状態を、**値を表示せずに**確認する場合は、名前と「Secret 参照か」のみを出力する(`import-current.md` 段階3-3 の `jq` を参照。`--format=json` の全体出力は画面に出さない)。

翻訳対象のテーブルを追加したデプロイでは、既存データの翻訳が空になる。`deploy-main` スキル手順7(バックフィル)に従う。バックフィルは本番DBへの書き込みを伴うため、**実行前にオンデマンドバックアップを取る**。

### 1.6 リリース記録

実施日時、対象コミット、適用したマイグレーション名、デプロイ後の revision 名を記録する(§6 のチェックリストに含める)。次回の「前回デプロイ済みコミット」(§1.1)の起点になる。記録例:

| 日時 | 対象コミット | 適用したマイグレーション | revision 名 | 実施者 |
|---|---|---|---|---|
| 2026-MM-DD HH:MM | `<短縮ハッシュ>` | `20261026000000_add_auth_throttle_and_audit`(なければ「なし」) | `portal-mock-000NN-xxx` | `<氏名>` |

### 1.7 ロールバック

現行環境で保持している revision は **`portal-mock-00030` / `00031` / `00032-mcg` / `00033-dcr` / `00034-fgg` / `00035-2qh` / `00036-86k`**(旧 revision は削除済み。2026-10-28 のデプロイ以降は `00036-86k` が 100% を受けている)。ロールバック先はこの範囲に限られ、直前の正常な revision は `00035-2qh` である。ただしロールバック先の revision が、適用済みのマイグレーション(新カラムの追加と `passwordHash` の NULL 許容化)と互換かは、戻す前に確認する(§1.3)。ロールバックの実行自体は**未検証**(コマンドは下記)。

**重要: `00030` / `00031` は Secret 参照への切替前の revision で、平文 env の旧値(DB パスワード、`AUTH_SECRET`)を持つ。これらの旧値はローテーション済みで無効のため、`00030` / `00031` へトラフィックを戻しても、DB 接続も `AUTH_SECRET` も合わず動かない。** 実質、安全に戻せる先は Secret 参照後の `00032-mcg` 以降(`00032-mcg` 〜 `00035-2qh`)と考える。現在の revision は 2026-10-28 に gcloud で `00036-86k` が 100% であることを確認済み。

したがって、ロールバックの実質的な手段は次のどちらかである。

1. **現行イメージ・設定の再デプロイ**: 新 revision を作り直して、起動時の一時的な不具合(Secret の読み込み失敗など)を解消する(§3.3 末尾の手順)。
2. **修正版の前進デプロイ(forward fix)**: 問題のコミットを `main` で修正または revert し、§1 の手順で再度デプロイする。コードの問題はこちらが基本である。

今後、Secret 参照後の revision が複数できた場合(新しいデプロイを重ねた後)は、Secret 参照後の直前の revision へ、次のコマンドでトラフィックを戻せる。

```bash
# revision の一覧(新しい順)
gcloud run revisions list --service portal-mock --region asia-northeast1 --project rvp-ai-proto-camp

# Secret 参照後の、直前の正常な revision へトラフィックを 100% 戻す
gcloud run services update-traffic portal-mock --region asia-northeast1 --project rvp-ai-proto-camp \
  --to-revisions <正常だった revision 名>=100
```

Cloud Run の画面(リビジョン > トラフィックの管理)からも同じ操作ができる。切替は数十秒から数分で完了する見込みだが、**実測していない(未検証)**。

ロールバックできない、または注意が必要なケース:

- **マイグレーションは戻らない。** revision を戻しても DB スキーマは新しいまま。追加のみのマイグレーション(カラム・テーブルの追加)であれば旧コードは動く。カラム削除や型変更を含むマイグレーションは、旧コードが動かなくなる可能性がある。その場合は、修正版をデプロイして前に進める(forward fix)か、バックアップから復元する(§2.3。データ損失を伴う)。
- **DBパスワードまたは `AUTH_SECRET` をローテーションした後は、ローテーション前の revision へ戻しても動かない。** 平文 env を持っていた旧 revision(現行では `00030` / `00031`)は、旧パスワードを使うため DB に接続できない。戻す先は、Secret 参照に切り替えた後の revision に限る。
- Secret 参照の revision は、`latest` を **revision の起動時に**解決する。ローテーション後に revision を戻した場合、戻した先の revision が起動時点の最新 secret を読む(新しいインスタンスは新しい値になる)。逆に、ローテーションの途中で失敗し secret と DB のパスワードが不一致の状態では、どの revision も DB に接続できない(§4)。
- `AUTH_SECRET` を変更すると、既存のログインセッションはすべて無効になる(再ログインが必要)。
- 旧 revision を削除していると、その revision へは戻せない。revision を整理する場合も、直近の正常な revision は最低1つ残す。

---

## 2. バックアップと復旧

### 2.1 自動バックアップ

- Terraform の変数 `db_backup_enabled` で制御する。`dev.tfvars.example` は `false`(費用削減)、`prod.tfvars.example` は `true` で、`db_point_in_time_recovery`(PITR、既定 `false`)も `prod.tfvars.example` で `true`。
- 現行環境は、段階4a で自動バックアップと削除保護を有効化済み。PITR は無効。段階4b の TLS 必須化(`sslMode=ENCRYPTED_ONLY`)も適用済み。
- バックアップの時刻は、Cloud SQL の既定(自動割当)を使っている。保持件数は Cloud SQL の既定(7件)。変更する場合は Terraform の変更(PR)として扱う。

```bash
gcloud sql backups list --instance portal-mock-backend-db --project rvp-ai-proto-camp
gcloud sql instances describe portal-mock-backend-db --project rvp-ai-proto-camp \
  --format="value(settings.backupConfiguration.enabled,settings.backupConfiguration.pointInTimeRecoveryEnabled,settings.deletionProtectionEnabled)"
```

### 2.2 オンデマンドバックアップ

次の作業の前に必ず取る: マイグレーション、バックフィル、機密値のローテーション、Cloud SQL 設定の変更。

```bash
gcloud sql backups create --instance portal-mock-backend-db --project rvp-ai-proto-camp --description "before-<作業名>"
gcloud sql backups list --instance portal-mock-backend-db --project rvp-ai-proto-camp   # SUCCESSFUL を確認
```

現行環境では、`before-secret-rotation` のバックアップを作成済み(`pre-client-env-work.md`)。作成そのものは実績があるが、作成したバックアップからの復元は実施していない。

### 2.3 復元手順(方法B は 2026-10-27 に別インスタンスへの復元を検証済み。方法A は未検証)

**復元の前に、必ず現状のオンデマンドバックアップを取る。** 復元は復元先のデータを完全に置き換える。

**方法A: 同じインスタンスへ復元する(既存データはバックアップ時点に置き換わる)**

```bash
gcloud sql backups list --instance portal-mock-backend-db --project rvp-ai-proto-camp   # BACKUP_ID を確認
gcloud sql backups restore <BACKUP_ID> --restore-instance portal-mock-backend-db --project rvp-ai-proto-camp
```

- 復元中、インスタンスは利用できない。完了後に §1.5 の動作確認を行う。
- **未検証。** 復元後に DB のユーザーとパスワード、`activationPolicy` などの設定が維持されるかを、初回実施時に確認する。復元後に secret と DB のパスワードが不一致になった場合は、§4 の再ローテーションで一致させる。

**方法B: 新しいインスタンスへクローンする(推奨。本番を壊さずに内容を確認できる)**

```bash
# 時点を指定するクローン(PITR 有効時のみ)
gcloud sql instances clone portal-mock-backend-db portal-mock-restore-test \
  --point-in-time '2026-10-26T01:00:00Z' --project rvp-ai-proto-camp

# 特定のバックアップから別インスタンスへ復元する場合は、新インスタンスを作成してから restore する
# (検証済み。手順・実測・結果は restore-drill.md)
gcloud sql instances create <新インスタンス名> --project rvp-ai-proto-camp --region asia-northeast1 \
  --database-version POSTGRES_16 --edition ENTERPRISE --tier db-f1-micro --storage-size 10 --storage-type SSD --no-backup
gcloud sql backups restore <BACKUP_ID> --restore-instance <新インスタンス名> \
  --backup-instance portal-mock-backend-db --project rvp-ai-proto-camp
```

- **別インスタンスへの復元は検証済み**(2026-10-27、`restore-drill.md`)。全テーブルの行数が一致し、元と同じ DB ユーザー・パスワードで接続できた。**復元先の設定(TLS 必須・自動バックアップ・削除保護)は復元されず、作成時の設定になる。** 本番として使う場合は復元後に設定し直す(Terraform で作成する前提にすれば漏れない)。
- **アプリの接続先を切り替える手順は未検証。** クローン後は、新インスタンスで内容を確認し、問題がなければアプリの接続先を切り替える(Cloud Run の Cloud SQL 接続と `DATABASE_URL` の接続名の差し替え。Terraform の state は旧インスタンスを指しているため、切替後に state を整合させる作業が必要になり、手順は未整備)。
- クローンしたインスタンスは費用が発生する。確認後に削除する(削除は `deletion_protection` 設定を意識する)。
- PITR によるクローンは、PITR が有効な環境でのみ可能。現行環境は PITR が無効のため、時点指定の復元はできない。

### 2.4 RPO / RTO の目安

| 設定 | RPO(失う可能性のあるデータ量の目安) | RTO(復旧にかかる時間の目安) |
|---|---|---|
| 自動バックアップのみ(現行環境、dev 例) | 最大でおよそ24時間(日次バックアップ。直近のバックアップ時刻以降の更新は失われる) | 別インスタンスへの復元は**実測 約32分**(インスタンス作成 約17分 + 復元 約15分。db-f1-micro、DB は小規模。2026-10-27、`restore-drill.md`)。同一インスタンスへの復元(方法A)は未検証 |
| 自動バックアップ + PITR(prod 例) | 数分程度(ログの保持範囲内で時点を指定できる) | PITR のクローンは**未検証** |
| オンデマンドバックアップ | 取得時点まで | 同上(別インスタンスへの復元の実測を参照) |

上記はあくまで目安であり、クライアントの要件(許容できるデータ損失・停止時間)を確認して確定する。要件が厳しい場合は、PITR、HA(`db_high_availability`、費用は約2倍)、定期エクスポート(GCS への `gcloud sql export`)を検討する。定期エクスポートは Terraform(`infra/modules/cloudsql`、PR #168)で実装済みだが、既定は無効(`db_export_enabled = false`)で、現行環境では有効にしていない(prod の tfvars 例は `true`)。

### 2.5 注意点

- Cloud SQL を**インスタンスごと削除すると、自動バックアップも削除される**(オンデマンドバックアップは残るが、これも削除操作の対象になりうる)。削除保護(`deletion_protection`)は有効にしておく。
- バックアップはインスタンスと同じリージョンに保存される。リージョン障害への備えとしては、別途エクスポートを別リージョンの GCS へ保存する運用が必要。モジュール(`export_location`)は別リージョン出力に対応しているが、`infra/envs` からは渡していないため未対応である。
- バックアップには、機密情報を含む業務データがすべて含まれる。取得・復元・エクスポートの権限は最小限にする。
- 現行環境では、DB を停止しても(`activationPolicy=NEVER`)バックアップ自体は削除されない。ただし停止中は新規の自動バックアップが取れない。

---

## 3. 障害対応

まず次を確認する。多くの障害は、DB の停止、デプロイ直後の設定ミス、Secret の不一致のいずれかである。

```bash
# 1. サービスの状態と最新 revision
gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp \
  --format="value(status.latestReadyRevisionName,status.latestCreatedRevisionName)"
# 2. DB の状態
gcloud sql instances describe portal-mock-backend-db --project rvp-ai-proto-camp --format="value(state,settings.activationPolicy)"
# 3. 直近のログ(§3.5)
```

### 3.1 画面が出ない(502 / 503 / タイムアウト)

| 確認 | 見るもの | 対処 |
|---|---|---|
| `latestReadyRevisionName` と `latestCreatedRevisionName` が異なる | 最新 revision の起動失敗(起動時に Secret を読めない、ポート不一致、起動時エラー) | 起動ログを確認(§3.5)。直前の正常な revision へトラフィックを戻す(§1.7)。 |
| 認可エラー(403) | `allUsers` の `roles/run.invoker` が外れていないか。組織ポリシーで `allUsers` が禁止されていないか | `terraform plan` の差分で IAM の変更を確認。`allow_public_access` を確認。 |
| DB が停止している | `state` が `RUNNABLE` でない、または `activationPolicy=NEVER` | `gcloud sql instances patch ... --activation-policy=ALWAYS`(`db-start`)。起動後、接続の確立に数十秒かかることがある。 |
| コールドスタートで遅い | `min_instances=0` の場合、初回アクセスが遅い | 想定内。気になる場合は `min_instances` を 1 にする(Terraform 変更)。 |
| 429 / 同時接続数不足 | `max_instances`(現行は 1)を超えるアクセス | `max_instances` の引き上げ(Terraform 変更)。 |

### 3.1.1 ファイル配信のメモリ要件

資料のファイル配信(`/api/*/file`)は、同時2件のセマフォで同時にデコードする。20MiB の PDF を GET 50並列にしたとき、サーバーの RSS は約 1.15GB になった(PR #201 のレビューでの実測。同時2件分の base64 文字列と Buffer が残るため)。このため `cloudrun_memory` は 1Gi にしている。**1GiB 未満には戻さない**(512Mi では OOM で revision が再起動し、502 / 503 になりうる)。ファイルを GCS に移行した後に再検討する。

- 設定場所: `infra/envs/*/variables.tf` の既定値(`1Gi`)、現行環境は `infra/envs/dev/current.tfvars` で明示。`cloudrun_cpu`(1)は変更していない。
- 反映は `terraform apply` で行う(§5.2)。plan の差分が Cloud Run のメモリ変更(新リビジョンの作成)のみであることを確認してから apply する。
- ロールバックは `cloudrun_memory = "512Mi"` に戻して apply する。
- コスト: Cloud Run のメモリ課金は使用時間に比例する。`min_instances=0` の現行環境では、リクエストを処理している間だけ課金されるため、大きな増加にはならない見込み。料金の数値は GCP の公式料金ページで確認する。

### 3.2 ログインできない

- **ログイン画面に戻される**: アクセスしているホストが `AUTH_URL` と一致しているか。`describe` が表示する別ホストではなく、`AUTH_URL` のホストで開く。`AUTH_SECRET` を変更した直後は、既存セッションが無効になるため再ログインが必要。
- **メール+パスワードで入れない**: ユーザーが DB に登録されているか、アカウントが無効化されていないか、パスワードが正しいか。まず DB 接続エラー(§3.3)がないかをログで確認する。次の2点も確認する(PR #158 の認証ハードニング導入後)。
  - **ロックアウト**: パスワードを5回失敗すると15分間ログインできなくなる。正しいパスワードでも、待ち時間が過ぎるまで入れない。利用者には15分待つよう案内する。(同じメールへ並列に試行しても、照合は5回まで。試行の前に枠を原子的に予約する。)
  - **マイグレーション未適用**: `20261026000000_add_auth_throttle_and_audit` が本番DBに未適用のままデプロイすると、Credentials ログインが全員不能になる(Google ログインは動く)。ログにテーブル/カラム不存在のエラーが出ていれば、§1.3 の手順でマイグレーションを適用する。
  - **AuthEvent による監査ログ確認**: 認証の成否・ロックアウトは `AuthEvent` テーブルに記録される。ログイン試行の履歴は、DB へ読み取りで接続して `AuthEvent` を確認する(列名や値の種類は `prisma/schema.prisma` を参照。確認結果を共有する前に、メールアドレスや IP など個人情報が含まれていないか確認する)。なお、AuthEvent の保持期間・削除の運用は未整備(付録参照)。
- **Google ログインで入れない**(Google ログイン導入後): 画面に表示されるエラーは「未登録 / 無効化済み / ドメイン不許可 / その他」の4種類に区別されている。
  - 未登録: DB にそのメールのユーザーが無い(既定では自動作成しない。ヘルプデスク担当者のみ、環境変数で自動作成を有効にできる。末尾の「ヘルプデスク担当者の Google 自動作成」参照)。ユーザーを登録する。
  - 無効化済み: アカウントが無効化されている。
  - ドメイン不許可: `allowed_email_domains`(環境変数 `ALLOWED_EMAIL_DOMAINS`)に含まれていないドメイン。dev は複数ドメイン、prod はクライアントのみの方針。
  - その他: OAuth クライアントの承認済みリダイレクトURI(`<AUTH_URL>/api/auth/callback/google`)の不一致、OAuth クライアントの client id / secret の誤り、同意画面の設定を確認する。
  - Google ログインの OAuth 往復は、2026-10-27 に現行環境のヘルプデスク側ログインで検証済み(同意画面は Internal、許可ドメイン `revamp.co.jp`)。DB 未登録のアカウントで「未登録」の表示を確認し、担当者を登録した後に、そのアカウントでログインできた。「無効化済み」「ドメイン不許可」の画面表示と、申請者側ログインでの往復は未検証(付録)。

### 3.3 DB 接続エラー

ログに `password authentication failed` / `connection refused` / `Can't reach database server` などが出る場合。

| 原因 | 見分け方 | 対処 |
|---|---|---|
| Cloud SQL が停止中 | `state` / `activationPolicy` | 起動する。 |
| パスワード不一致(ローテーションの途中失敗、復元後) | `password authentication failed` | `rotate-secrets.sh` を再実行し、secret と DB を一致させる(§4)。その後、新 revision を作って最新の secret を読ませる(下記)。 |
| Cloud Run に Cloud SQL 接続が設定されていない | `run.googleapis.com/cloudsql-instances` 注釈の欠落 | Terraform の plan で差分を確認する。または `--add-cloudsql-instances` で再設定。 |
| TLS 必須化(`ENCRYPTED_ONLY`)に非対応の接続 | TLS 無しで接続するクライアントだけが接続エラーになる | 現行環境は適用済みで、Cloud Run(Cloud SQL コネクタ経由)は適用後も正常稼働を確認済み。ローカルからの接続は Cloud SQL Auth Proxy を使う。 |
| 接続数の上限 | `too many connections` | `db-f1-micro` は接続数に余裕がない。インスタンスサイズの見直し、`max_instances` の見直し。 |
| ディスク満杯 | Cloud SQL のメトリクス | 自動拡張は有効。上限や費用を確認する。 |
| 接続プール枯渇(督促 cron で `P2024`) | cron が 500 を返し、ログに `PrismaClientKnownRequestError P2024` | `DATABASE_URL` の `connection_limit` を **1 にしてはならない(最低 2、推奨 3 以上)**。督促 cron(`/api/cron/announcement-escalation`)は同時実行防止の advisory lock のため、実行中に 1 接続をトランザクションで占有し、内側のクエリが別の接続を使う。未指定(既定)なら問題ない。 |

#### 督促 cron(`/api/cron/announcement-escalation`)の処理時間と打ち切り

- 送信は並列 5(`ESCALATION_SEND_CONCURRENCY`)、SMTP のタイムアウトは接続 10s・greeting 10s・socket 30s。処理の締切は 240s(トランザクション上限 290s − 余裕 50s)で、到達後は新規の送信を始めずに打ち切る。
- 合計時間の見積り: `宛先数 × 1通の所要時間 ÷ 5`。1通 2 秒なら、240s で約 600 宛先。宛先数がこれを超える見込みのときは、1回で終わらず複数日に分けて処理される。
- **打ち切りは翌日まで持ち越される**(Scheduler は 1 日 1 回で、打ち切りは 200 で返るため再試行されない)。打ち切り時はログに `Run aborted by deadline`(warn)と、レスポンスに `abortedByDeadline: true` が出る。検知はログベースのアラート(monitoring、infra 側の別 PR の範囲)で行う。
- 宛先が極端に多い場合や SMTP 接続直後の初回は、先に `?dryRun=1` で対象件数(`notifiedRecipients`)を確認する。

secret を更新した後に Cloud Run に反映するには、新しい revision を作る(`latest` は revision の起動時にのみ読まれる)。**テンプレートが変わらない更新(同一設定の再適用、ラベルのみの変更など)では、新 revision が作られない可能性がある(未検証)。** 実行後は必ず `gcloud run revisions list` で新 revision ができたこと、`latestReadyRevisionName` が変わったことを確認する。

```bash
# 方法1(推奨): 現行イメージを指定して再デプロイする(コードも設定も変えない)
IMG=$(gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp \
  --format="value(spec.template.spec.containers[0].image)")
gcloud run deploy portal-mock --project rvp-ai-proto-camp --region asia-northeast1 --image "$IMG" --quiet
```

- 新 revision ができない場合の代替は、`gcloud run services update portal-mock ... --update-env-vars=<NAME>=<値>` で非機密の env を1つ変更すること。ただし**この env は Terraform の管理外になり、次の plan でドリフト(差分)として表示される**。使った場合は、Terraform のコードに取り込むか、後で `--remove-env-vars` で外す。機密値を env で渡さない。
- `--update-labels` によるラベル変更は、Terraform でもドリフトになるうえ、新 revision が作られる保証がないため使わない。
### 3.4 Secret 参照エラー

revision が起動しない、ログに Secret Manager のエラー(`Permission denied on secret` / `Secret ... not found` / version が無効)が出る場合。

- 実行SA(現行は compute SA。クライアント環境は専用SA)に `roles/secretmanager.secretAccessor` が付いているか。IAM の変更は §5.7 のとおり権限が必要。
- 参照している secret 名と version が存在し、`ENABLED` か(`gcloud secrets versions list <secret名> --project <project>`。**値は読まない**)。
- 手動登録の secret(`anthropic-api-key-suenaga-daiso-portal`、`<prefix>-auth-google-id` など)に値が入っているか。枠だけで version が無いと、参照している revision は起動に失敗する。トグル(`enable_translation` / `enable_google_login`)は、値を登録してから `true` にする。
- 旧 version を無効化・削除していないか。`latest` が無効な version を指すと失敗する。

### 3.5 ログの見方

```bash
# 直近のアプリログ(簡易)
gcloud run services logs read portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --limit 50
```

Cloud Logging(ログ エクスプローラ、または `gcloud logging read`)のクエリ例:

```
# エラー以上
resource.type="cloud_run_revision"
resource.labels.service_name="portal-mock"
severity>=ERROR

# DB 接続エラー(アプリログは JSON 1行で jsonPayload に入る。エラーは errorName / errorCode / errorMessage / stack_trace(スタック)/ cause 連鎖を出す。Prisma エラーは meta も出る。翻訳 API の失敗は cause に SDK 側のエラーを保持するため、cause.status / cause.errorProps.request_id / cause.stack_trace で追える。API の 400/401/403/404/409 は応答本文が固定文言のため、原因は message が `[api-errors]` で始まる WARNING ログ(元メッセージ・例外プロパティの ID。Zod の検証失敗は issues の path/code/message のみで、リクエスト本文は出さない)で確認する。例外クラスの独自プロパティ(inquiryId 等)は errorProps に出る)
# P1000: 認証失敗 / P1001: 接続不可 / P1017: サーバーが接続を閉じた
resource.type="cloud_run_revision"
resource.labels.service_name="portal-mock"
severity>=ERROR
jsonPayload.errorCode=("P1000" OR "P1001" OR "P1017")

# 認証監査ログ(message は固定で "auth"、種別は jsonPayload.type)
resource.type="cloud_run_revision"
resource.labels.service_name="portal-mock"
jsonPayload.message="auth"
jsonPayload.type="<種別>"

# 特定 revision の起動失敗
resource.type="cloud_run_revision"
resource.labels.service_name="portal-mock"
resource.labels.revision_name="<revision名>"

# migrate Job の実行ログ(Job 作成後)
resource.type="cloud_run_job"
resource.labels.job_name="portal-mock-migrate"
```

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="portal-mock" AND severity>=ERROR' \
  --project rvp-ai-proto-camp --limit 30 --freshness=1h --format="value(timestamp,severity,jsonPayload.message,jsonPayload.errorName,jsonPayload.errorCode)"
```

機密値が出ないようにするための注意:

- **`gcloud run services describe ... --format=json` や `gcloud ... --format=json` の全体出力は使わない。** サービス定義の環境変数が含まれる(現行環境は Secret 参照に移行済みだが、平文の env が残る環境や過去の revision では値が出る)。必要な項目だけを `--format="value(...)"` で指定する。
- アプリログのエラー詳細(errorMessage / stack_trace / Prisma の meta)は全情報を出す方針で、**メールアドレスや DB の値などの個人情報が入りうる**。Cloud Logging の閲覧権限と保持期間を管理すること。資格情報だけは伏字にする。対象は、Bearer・`sk-ant-`・`Authorization:`・`Cookie:`/`Set-Cookie:`、`password`/`passwd`/`pwd`/`token`/`secret`/`api_key`(`x-api-key`・`client_secret` 含む)を名前に持つ `key=value`/`key: value`、`scheme://user:pass@host` 形式の接続文字列(postgres/mongodb/redis/amqp 等)、およびオブジェクトのキー名(meta・errorProps・errorValue の `password`/`token`/`secret`/`apiKey`/`authorization`/`cookie` 等。大文字小文字・区切り違いを許容)。**限界**: 上記以外の形式の秘密値(キー名を伴わない値、独自形式のトークン)は残りうる。逆に `Invalid token: expired` のように「token」の直後に `:`/`=` が続く文は値部分が伏字になりうる。
- **宛先メールがエラー文経由でログに出うる**: アナウンス通知のメール送信失敗ログ(`[announcement-notifications] Failed to send mail`)は、宛先を `fields` には入れないが、SMTP エラー文に宛先が含まれる場合は errorMessage / stack_trace / errorProps 経由でそのまま出る(全情報を出す方針どおり)。閲覧権限と保持期間で管理すること。
- **伏字の限界(未対応の形式)**: 伏字は「最低限」の方針で、正規表現の計算量(ReDoS)を悪化させないため次は対象外。JSON 内でエスケープされたキー(`\"password\":\"...\"`)、`"Authorization":"Basic ..."` のような JSON 形式のヘッダ、空白を含む値、AWS キー(`AKIA...`)・GitHub トークン(`ghp_...`)・JWT などの独自形式、`sig=` / `code=` などのクエリパラメータ、base64 文字列。なお正規表現の可変長部分は有界(キー名 64 文字、値 1024 文字など)で、各文字列は 8192 文字(+256 文字の余白)に先に切ってから伏字にする。
- 想定内エラー(400/401/403/404/409 の WARNING)は `stack_trace` を出さない。ZodError は errorMessage を `N validation issue(s)` に要約し、issues は path/code/message のみ(最大 20 件)を出す。500 の想定外例外は従来どおり全情報。
- ログ 1 行は 200KB(`MAX_LINE_BYTES`)を上限とする。超えた場合は fields を捨て、`logError: "line too large"`・`originalBytes`・errorName/errorCode/errorMessage(先頭 4KB)だけを出す(Cloud Logging の 1 エントリ上限 256KB 未満に収めるため)。個々の文字列は 8KB、cause は 3 段、配列は 20 件、オブジェクトキーは 30 個までで切り詰める。
- ログの共有・貼り付けの前に、`DATABASE_URL`(パスワードを含む)、`Authorization` ヘッダ、Cookie、トークン、`CRON_SECRET`、API キーが含まれていないか確認する。接続エラーのメッセージには接続先のホスト名やユーザー名が出ることがある。
- `terraform plan` の出力と state は、機密値(DB パスワード、`AUTH_SECRET`、`CRON_SECRET`)を含みうる。出力をファイルに保存して確認する場合は、確認後に削除する(§5)。

### 3.6 切り分けで解決しない場合

1. 直近の変更(デプロイ、Terraform の apply、機密値のローテーション、Cloud SQL の設定変更)を時系列で確認する。
2. 直近の変更がアプリのデプロイなら §1.7 のロールバック。
3. データの破損が疑われる場合は、**書き込みを止めた上で**、まずオンデマンドバックアップを取り、その後に §2.3 の復元を検討する。

---

## 4. 機密値のローテーション

対象: `AUTH_SECRET`、DB パスワード、`DATABASE_URL`(DB パスワードを含む)。スクリプトは `infra/scripts/rotate-secrets.sh`。

### 4.1 実行前の確認

- **旧値には戻せない。** ローテーション後、DB パスワードを変更するため、旧 revision(旧パスワードを使うもの)は DB に接続できない。
- `AUTH_SECRET` を変更すると、全ユーザーのログインセッションが無効になる(再ログインが必要)。
- Cloud Run が secret の `latest` を読むのは **revision の起動時のみ**。スクリプト完了後に、新しい revision を作る(現行イメージ指定の再デプロイ。§3.3 末尾)までは、稼働中のインスタンスは旧 `DATABASE_URL` のまま動いている。DB パスワードは変更済みのため、**新規のインスタンスが起動(スケールアウト等)した時点で接続失敗**が起きうる。スクリプト実行後は速やかに新 revision を作る。
- 利用者の少ない時間帯に実施する。メンテナンスの周知を行う。
- 事前にオンデマンドバックアップを取る(§2.2)。
- secret の枠(`portal-mock-auth-secret` / `portal-mock-database-url`)が存在すること(`terraform apply -target=module.secrets`)。
- 実行するホストは、個人の端末(WSL 等)にする。共有ホストでは実行しない。`gcloud sql users set-password --password=...` は、パスワードをコマンドライン引数で渡す仕様のため、実行中の数秒間、同一ホストの `ps` などで見える。

### 4.2 実行

```bash
PROJECT=<project-id> REGION=asia-northeast1 INSTANCE=<Cloud SQL インスタンス名> \
DB_USER=<DB ユーザー> DB_NAME=<DB 名> \
CONNECTION_NAME=<project>:<region>:<instance> \
./infra/scripts/rotate-secrets.sh
```

(`--project` などの引数でも指定可。既定の secret 名は `portal-mock-auth-secret` と `portal-mock-database-url`。別名なら環境変数 `AUTH_SECRET_ID` / `DATABASE_URL_SECRET_ID` で変更する。)

確認プロンプトで `YES` と入力すると、次の順に処理される。この順序は重要である(secret を先に登録し、最後に DB パスワードを変更する)。

| 手順 | 内容 | 表示 |
|---|---|---|
| (a) | `AUTH_SECRET` を生成し、Secret Manager に新 version として登録 | `[a] ...` |
| (b) | DB パスワードを生成(英数字32桁) | (表示なし) |
| (c) | 新しい `DATABASE_URL` を組み立て、Secret Manager に新 version として登録 | `[c] ...` |
| (d) | Cloud SQL ユーザーのパスワードを変更 | `[d] ...` |

値は画面にもログにも出力されない(標準入力経由で登録)。

### 4.3 実行後

1. `[a]` `[c]` `[d]` の3行が出て、「完了」と表示されたことを確認する。**スクリプトが正常終了するまで、Cloud Run の反映(新 revision の作成)に進まない。**
2. 新しい revision を作り、最新の secret を読ませる。手順と注意(新 revision が作られない可能性、Terraform のドリフト)は §3.3 末尾の「現行イメージを指定して再デプロイ」を使う。新 revision ができたことを `gcloud run revisions list` で確認する。

   Terraform で secret 参照に切り替える初回のみ、`terraform apply`(`import-current.md` 段階3-2)で revision が作られる。
3. §1.5 の動作確認を行う。ログに `password authentication failed` が無いこと。
4. 古い secret version を無効化する(`gcloud secrets versions disable <version> --secret <名> --project <project>`)。**新 revision の動作確認が済んでから**行う。無効化した version は `enable` で戻せる。

### 4.4 失敗時

- スクリプトは**何度でも再実行してよい**(毎回新しい値を生成し、最後に secret と DB が一致する)。(c) の後に (d) が失敗した場合、secret の最新 version と DB のパスワードが不一致になるが、再実行で解消する。
- 失敗の間は、新規に起動するインスタンスが DB に接続できない場合がある。早く再実行する。

### 4.5 手動登録の secret(API キー、Google OAuth など)

`anthropic-api-key-suenaga-daiso-portal` や `<prefix>-auth-google-secret` は、このスクリプトの対象外である。新しい値を、標準入力経由で新 version として登録する。

```bash
gcloud secrets versions add <secret名> --project <project> --data-file=-
```

登録後、新 revision を作って反映する。コマンドのヒストリや共有画面に値を残さない。ローテーションの頻度は、クライアントのセキュリティ要件で決める(§6 の目安は暫定)。

---

## 5. Terraform 運用

コードは `infra/`(`bootstrap/`、`modules/`、`envs/dev`、`envs/prod`)。`apply` は自社担当者がローカルから実施する。クライアント側から付与される権限は Editor 相当を想定している。

### 5.1 基本方針

- アプリのデプロイ(イメージの更新)と Terraform は分離する(Cloud Run の `image` は `ignore_changes`)。
- 機密値は state に載せない方針だが、DB パスワード・`AUTH_SECRET`・`CRON_SECRET` を Terraform で生成する構成の場合は state に平文が残る(`iac-plan.md` の「既知の制約」)。state バケットへのアクセスは限定する。現行環境は `use_existing_secrets=true` で、値は `rotate-secrets.sh` が登録する。
- `plan` / `state show` / `terraform show` の生出力は画面に出さない(Cloud Run の env などが含まれうる)。確認が必要な場合はファイルに保存して `grep` で必要な行だけを見て、確認後に削除する。
- `*.tfvars` と tfstate は git 管理外(`infra/.gitignore`)。tfvars には機密値を書かない。
- provider のバージョンは `.terraform.lock.hcl` で固定している。更新する場合はコミットする。

### 5.2 通常の変更フロー(plan → 保存 plan → apply)

```bash
E=infra/envs/dev    # prod は infra/envs/prod

# 初回のみ(backend は GCS)
terraform -chdir=$E init -input=false -backend-config="bucket=<state バケット名>" -backend-config="prefix=<dev|prod>"

# plan を保存し、要約だけ確認する
terraform -chdir=$E plan -var-file=<env>.tfvars -input=false -no-color -out=<作業用ディレクトリ>/<env>.tfplan > <作業用ディレクトリ>/plan.txt
grep -E '^Plan:|will be (created|updated|destroyed|replaced)' <作業用ディレクトリ>/plan.txt

# 確認した plan そのものを apply する(plan と apply の間で差分が変わらない)
terraform -chdir=$E apply -input=false <作業用ディレクトリ>/<env>.tfplan

# 作業用ファイルを削除する
```

- **destroy / replace(`must be replaced`)が出たら apply しない。** 原因(変数の変更、`ignore_changes` 漏れ、リソース名の変更)を確認してから進める。Cloud SQL・Cloud Run・secret に対する replace は、データや接続に影響する。
- 保存した plan は、plan 取得時の state と一致している場合のみ apply できる。別の人の apply が間に入った場合は、plan を取り直す。
- 一部だけを適用する場合は `-target='module.cloudsql'` などを使う(段階的な適用で実績あり)。通常の変更では `-target` に頼らず、全体の plan で差分を確認する。
- 自動実行の `apply`(CI)は未導入。plan の結果は、PR に要約を貼って相互確認する運用を推奨する。

### 5.3 state

- 場所: GCS バケット(現行は `rvp-ai-proto-camp-portal-iac-tfstate`、prefix `dev`)。バケットは `bootstrap/` で作成し、バージョニング有効・公開禁止。旧世代は新しい世代が30件を超えると削除される。
- bootstrap の state だけは、ローカル(git 管理外)にある。このファイルを失わないよう、担当者は保管する(機密値は含まれない)。
- ロック: GCS backend の標準のロックが働く。`apply` が異常終了して残った場合は、実行中の人がいないことを確認してから `terraform force-unlock <ID>` を使う。
- 巻き戻し: state の誤操作は、バケットの旧世代から復元できる(`gcloud storage ls --all-versions`)。復元の手順は**未検証**。

### 5.4 import(既存資源を Terraform の管理下に置く)

現行環境の取り込みは完了している。手順の実例は `import-current.md`(段階0 の import コマンド一覧)。

```bash
terraform -chdir=$E import -var-file=<env>.tfvars '<リソースアドレス>' '<リソースID>'
```

- import は GCP に書き込まず、state にのみ書き込む。取り込み後は必ず `plan` を取り、期待した差分(想定外の destroy / replace が無いこと)を確認する。
- 取り込みを取り消す場合は `terraform state rm <アドレス>`(GCP 資源は無傷)。
- 既存資源の設定に合わせるため、モジュールには変数(例: `db_instance_name`、`manage_db_password`、`use_existing_secrets`)を用意している。値は `import-current.md` の tfvars 例を参照。

### 5.5 dev / prod

- `envs/dev` と `envs/prod` は、同じ構成(main / variables / outputs)で、差分は tfvars(`*.tfvars.example` を元に作成)のみ。state は同じバケットの別 prefix(`dev` / `prod`)。
- dev と prod を同一プロジェクトに置くか、プロジェクトを分けるかは、クライアントとの確認事項(未確定。`iac-plan.md` の TODO)。同一プロジェクトに置く場合、リソース名の衝突を避けるため `name_prefix` を分ける(`portal-mock-dev` / `portal-mock-prod`)。
- prod の初期値(例): 削除保護・バックアップ・PITR 有効、`db-g1-small`、`min_instances=1`。dev は費用を抑える設定。
- 同じコードの変更は、dev で plan / apply して確認してから prod に適用する。
- `deletion_protection` が有効な資源を削除・置換する必要がある場合は、Terraform のコードを変更する前に、**一時的に保護を外す変更を別 apply として行う**。通常は行わない。

### 5.6 設定の確認コマンド(読み取りのみ)

```bash
gcloud sql instances describe portal-mock-backend-db --project rvp-ai-proto-camp \
  --format="value(settings.backupConfiguration.enabled,settings.deletionProtectionEnabled,settings.ipConfiguration.sslMode)"
# 現行環境の期待値: True / True / ENCRYPTED_ONLY(自動バックアップ有効 / 削除保護 有効 / TLS 必須)
gcloud run services describe portal-mock --region asia-northeast1 --project rvp-ai-proto-camp \
  --format="value(status.latestReadyRevisionName)"
```

### 5.7 権限(Editor 相当と IAM)

- 想定する権限は Editor 相当。Editor は IAM ポリシーを変更できない(`resourcemanager.projects.setIamPolicy` を含まない)ため、次の操作は Editor では失敗する場合がある。
  - プロジェクトレベルのロール付与(アプリ専用SA、Cloud Scheduler 用SAなど)
  - Cloud Run の `allUsers` への invoker 付与(組織ポリシーで制限される場合もある)
  - Workload Identity Federation 関連のバインディング
- 運用方針: **IAM の変更は初回(bootstrap)のみ**、クライアントの管理者に一時的な権限付与(Project IAM Admin 等)を依頼して作成する。作成後は権限を戻してもらう。以降の通常運用(Cloud Run / Cloud SQL / secret 枠の更新)は Editor 相当で行う。
- 権限が得られない場合は、`manage_iam=false` とし、SA とロール付与は管理者が事前に作成する(`iac-plan.md` §3.1 の案2、3)。
- 次はクライアント管理者の作業で、Terraform では作成できない: OAuth 同意画面と OAuth クライアント(Web)の作成、承認済みリダイレクトURI(`<AUTH_URL>/api/auth/callback/google`)の登録、組織ポリシーの確認・例外設定。作成後の client id / secret を、`<prefix>-auth-google-id` / `<prefix>-auth-google-secret` に登録してもらう(§4.5 の方法)。

---

## 6. 定期作業チェックリスト

頻度は目安である。クライアントの要件確定後に調整する。

### 毎日 / 稼働日

- [ ] 画面が表示され、ログインできる(`AUTH_URL` のホストで確認)
- [ ] (現行の手動運用の場合)Cloud SQL が起動している。停止運用なら、停止前に利用者へ周知しているか
- [ ] Cloud Logging で `severity>=ERROR` の件数に異常な増加がない(§3.5)

### 毎週

- [ ] 自動バックアップが成功している(`gcloud sql backups list`)。停止運用(`db-end`)の日は、停止中に自動バックアップが取れない(バックアップの時間帯に DB が停止していれば、その日分は欠ける)ため、必要なら起動中にオンデマンドバックアップを取る(§2.2)
- [ ] 費用(請求のレポート)に想定外の増加がない。`min_instances`、Cloud SQL のサイズ、ログ量を確認
- [ ] 定期実行(Cloud Scheduler)を導入した後は、ジョブの実行結果の確認

### 毎月

- [ ] ログイン可能なユーザーの棚卸し(退職者・不要なアカウントの無効化)
- [ ] 手動登録した secret の version を確認(不要な旧 version の無効化)
- [ ] Terraform の `plan` で差分がないこと(手動変更のドリフト検出。差分があれば原因を確認し、コードか実環境のどちらかに合わせる)
- [ ] ディスク使用量と接続数の傾向(`db-f1-micro` で不足しないか)
- [ ] 依存パッケージ(npm)と Docker ベースイメージのセキュリティ更新の確認と、必要ならリリース

### 四半期 / 半年 / 随時

- [ ] **バックアップからの復元訓練**(`restore-drill.md` の手順。初回は 2026-10-27 に現行環境で実施済み。クライアント環境では初回を改めて実施し、結果と所要時間を記録して RPO / RTO を更新する)
- [ ] 機密値のローテーション(§4。頻度はクライアントのセキュリティ要件で決定。暫定で半年に1回、および担当者の交代・漏えいの疑いがあるとき)
- [ ] GCP の権限(IAM)の棚卸し。不要になった担当者の権限を外す
- [ ] state バケットのアクセス権限の確認
- [ ] Terraform の provider と Cloud SQL のバージョン更新の検討(PostgreSQL のメジャーバージョンの更新は別途計画)
- [ ] OAuth クライアントの設定(リダイレクトURI、許可ドメイン)の確認
- [ ] 本書の見直し(「未検証」の項目を、実施した結果で更新する)

### 作業前後(リリース、設定変更)

- [ ] オンデマンドバックアップを取得した(§2.2)
- [ ] マイグレーションの適用が、デプロイより先に完了した(§1.3)
- [ ] 動作確認を完了し、リリース記録(日時、コミット、マイグレーション名、revision 名)を残した
- [ ] 作業用ファイル(`*.tfplan`、`plan.txt`、`DATABASE_URL` を書き込んだ一時ファイル)を削除した

---

## 付録: 未検証の項目一覧

2026-10-26 に検証済みとなった項目(本表から除外): migrate Cloud Run Job の作成と実行(§1.3)、migrate イメージの build(§1.2)、`--clear-base-image` を付けたソースデプロイ(§1.4)。

| 項目 | 節 |
|---|---|
| Artifact Registry へのアプリ用タグ付きイメージの build / push とデプロイ(migrate イメージの build は 2026-10-26 に検証済み) | §1.2 |
| Cloud Run の revision 切替によるロールバックの実行と所要時間(`00032-mcg` は保持中だが、実際には戻していない) | §1.7 |
| バックアップからの復元(同一インスタンス、クローン)、PITR クローン | §2.3 |
| 復元・クローン後の接続先切替と Terraform state の整合 | §2.3 |
| RPO / RTO の実測値 | §2.4 |
| state の旧世代からの復元 | §5.3 |
| Google ログインのエラー分類のうち「無効化済み」「ドメイン不許可」「その他」の画面での確認(「未登録」は 2026-10-27 に確認済み)と、申請者側ログインでの OAuth 往復 | §3.2 |
| AuthEvent の保持期間・削除ポリシー(PR #158 で未整備) | §3.2 |
| `secrets versions disable` → `enable` による旧 version の復旧 | §4.3 |
| 「DB を停止してもバックアップは削除されない」の根拠(公式ドキュメント等での裏取り) | §2.5 |
| `gcloud sql instances clone --point-in-time` / `gcloud sql backups restore --backup-instance` のコマンド単位の動作(オプション・前提条件) | §2.3 |
| 新 revision を作る再デプロイ(現行イメージ指定の `gcloud run deploy`、`--update-env-vars`)で、実際に新 revision ができること | §3.3 |
| `terraform force-unlock` の運用(ロック残存時の判断と実行) | §5.3 |
| `00030` / `00031` へ戻した場合の挙動(旧値の無効化による接続失敗は想定であり、実機では試していない) | §1.7 |

## Scheduler の attempt_deadline

督促 cron 用 Scheduler ジョブは `retry_count = 1`。HTTP ターゲットの `attempt_deadline` 既定は 180s(許容 15s〜30m)で、超えると Scheduler 側で DEADLINE_EXCEEDED の失敗扱いになり再試行(2回目の POST)が飛ぶ。2回目は advisory lock で skippedByLock の 200 になり二重送信はしないが、失敗アラートの誤検知になる。

- `modules/scheduler` の `attempt_deadline`(既定 `300s`)を、envs から `min(cloudrun_timeout_seconds, 1800)` で渡し Cloud Run timeout(300s)と揃えている。督促 cron の処理締切は 240s なので、通常は打切りに達せず 200 で返る
- 処理が 240s で打切られた場合も 200 で返るため再試行されない(締切超過の失敗とは別経路)
- `cloudrun_timeout_seconds` を変えると attempt_deadline も追従する(上限 1800s)

## ヘルプデスク担当者の Google 自動作成

Google ログイン時に未登録のヘルプデスク担当者(HelpdeskStaff)を自動作成する機能。既定は無効(従来仕様=未登録は `not_registered` で拒否)。申請者(ApplicantUser)は自動作成しない。

- **リリース順**: 「マイグレーション(`prisma migrate deploy`)→ アプリのデプロイ」の順。新カラム・enum 値(`registrationSource` / `account_provisioned`)を先に入れる。この変更自体は既定 OFF のため、デプロイしただけでは挙動は変わらない
- **有効化**: tfvars で `enable_google_login = true` かつ `enable_helpdesk_auto_provision = true`、`helpdesk_auto_provision_domains = ["<自社ドメイン>"]`(`allowed_email_domains` の部分集合)を指定して `terraform apply`。アプリ側の環境変数は `GOOGLE_HELPDESK_AUTO_PROVISION` / `GOOGLE_HELPDESK_AUTO_PROVISION_DOMAINS`。Google の `hd`(Workspace ドメイン)がメールのドメインと一致しない場合は自動作成されない
- **無効化**: `enable_helpdesk_auto_provision = false`(既定)に戻して apply。作成済みの担当者は残り、Google ログイン自体は引き続き可能(既存担当者として照合される)
- **確認 SQL**: `SELECT id, email, "displayName", "createdAt" FROM "HelpdeskStaff" WHERE "registrationSource" = 'google_auto' ORDER BY "createdAt" DESC;`。監査は `AuthEvent` の `type = 'account_provisioned'`
- **取り消し**: `/helpdesk/staff`(admin)から対象の担当者を無効化(`isActive=false`)する。ログイン拒否とセッションの即時失効が行われ、行の削除は不要(PR #185・#186)。あわせて、対象ドメインを外して新規作成を止める。自動作成された担当者はパスワード未設定でメール+パスワードではログインできない
