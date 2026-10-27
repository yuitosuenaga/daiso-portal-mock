# バックアップ復元訓練

関連: `docs/infra/runbook.md` §2(バックアップと復旧)

Cloud SQL のバックアップを**別インスタンスへ復元**し、中身が元と一致することを確認する訓練。本番を壊さない。クライアント環境でも同じ手順で実施する(下の「環境ごとの読み替え」)。

## 実績

| 項目 | 内容 |
|---|---|
| 実施日 | 2026-10-27 |
| 環境 | `rvp-ai-proto-camp`(現行環境)。`db-f1-micro` / POSTGRES_16 / 10GB。DB は小規模 |
| 結果 | **成功**。全 34 テーブルの行数が元と一致。復元先に元と同じ DB ユーザー・パスワードで接続できた。DB は `portal_mock` / `postgres` が存在 |
| オンデマンドバックアップ作成 | 1分37秒 |
| 復元先インスタンス作成 | 約17分(07:07〜07:24 UTC) |
| 復元 | 約15分(07:29〜07:44 UTC)。gcloud の待機は約10分で時間切れになるが、操作は GCP 側で続行する(`gcloud sql operations list` で確認) |
| 合計 | 約32分(作成 + 復元) |

### 分かったこと
- **復元先の設定はバックアップから引き継がれず、作成時の設定になる。** 復元先は `sslMode=ALLOW_UNENCRYPTED_AND_ENCRYPTED`、自動バックアップ無効、削除保護無効だった(元は `ENCRYPTED_ONLY` / 有効 / 有効)。DB のデータ、ユーザー、パスワードは復元される。本番として使う場合は、復元後に TLS 必須・バックアップ・削除保護を設定し直す。Terraform で復元先を作る前提にすれば漏れない。
- **復元先インスタンスの作成が時間の大半を占める**(db-f1-micro の場合)。RTO を短くするには、復元先を事前に用意しておく、またはティアを上げる案がある。
- 検証用に取ったオンデマンドバックアップ(`restore-drill`)は元インスタンスに残る。不要なら削除する。

### まだ確認していないこと
- 同一インスタンスへの復元(runbook §2.3 方法A)
- PITR による時点指定のクローン(現行環境は PITR 無効)
- 復元先へアプリの接続先を切り替える手順(Terraform の state 整合を含む)
- 大きな DB での所要時間(上記は小規模 DB の値)
- private IP のみの環境での手順

## 手順

以降の変数は環境に合わせて読み替える。

```bash
PROJECT=rvp-ai-proto-camp
REGION=asia-northeast1
SRC=portal-mock-backend-db            # 元インスタンス
DST=portal-mock-restore-test          # 復元先(訓練用。終了後に削除)
```

共用プロジェクトでは、書き込みを伴う操作(バックアップ作成・インスタンス作成・復元・削除)は担当者が実行する。

### 1. 元DBの行数を記録し、訓練用バックアップを取る

```bash
PROJECT=$PROJECT ./infra/scripts/db-table-counts.sh $PROJECT:$REGION:$SRC > counts-src.txt
time gcloud sql backups create --instance $SRC --project $PROJECT --description restore-drill
```

`db-table-counts.sh` は Auth Proxy 経由で全テーブルの行数を出す(SELECT のみ。`DATABASE_URL` は画面に出ない)。

### 2. 復元先インスタンスを作る

元と同じバージョン・エディション・ティア・ディスクで作る(復元先は同等以上が必要)。

```bash
time gcloud sql instances create $DST --project $PROJECT --region $REGION \
  --database-version POSTGRES_16 --edition ENTERPRISE --tier db-f1-micro \
  --storage-size 10 --storage-type SSD --no-backup
```

### 3. 復元する

```bash
BID=$(gcloud sql backups list --instance $SRC --project $PROJECT \
  --filter='description=restore-drill' --format='value(id)' --limit 1)
time gcloud sql backups restore $BID --restore-instance $DST --backup-instance $SRC --project $PROJECT
```

`gcloud` が「taking longer than expected」で終了しても、失敗ではない。操作の状態を見る。

```bash
gcloud sql operations list --instance $DST --project $PROJECT --limit 3 \
  --format='table(operationType,status,startTime,endTime)'
```

`RESTORE_VOLUME` が `DONE` になるまで待つ。

### 4. 検証する

```bash
PROJECT=$PROJECT ./infra/scripts/db-table-counts.sh $PROJECT:$REGION:$DST > counts-dst.txt
diff counts-src.txt counts-dst.txt && echo COUNTS-IDENTICAL
gcloud sql databases list --instance $DST --project $PROJECT --format='value(name)'
gcloud sql users list --instance $DST --project $PROJECT --format='value(name)'
gcloud sql instances describe $DST --project $PROJECT \
  --format='yaml(settings.activationPolicy,settings.ipConfiguration.sslMode,settings.backupConfiguration.enabled,settings.deletionProtectionEnabled)'
```

- `diff` が空(行数一致)であること。元DBに稼働中のアクセスがあると、バックアップ取得後の差分が出ることがある。その場合は差分が更新由来か確認する。
- 復元先に元と同じ DB ユーザー・パスワードで入れること(入れなければ `db-table-counts.sh` が認証エラーで止まる)。
- 復元先の設定が元と違うこと(上記「分かったこと」)を確認し、本番として使う場合の設定漏れを防ぐ。

### 5. 後片付け

```bash
gcloud sql instances delete $DST --project $PROJECT --quiet
rm -f counts-src.txt counts-dst.txt
```

訓練用バックアップ(`restore-drill`)が不要なら、`gcloud sql backups delete <BACKUP_ID> --instance $SRC --project $PROJECT` で削除する。

## 環境ごとの読み替え(クライアント環境で再確認が要る点)

手順の骨子と検証の型は他環境でも使える。次は環境で変わるので、クライアント環境で初回を改めて実施する。

- **名前・プロジェクトID**: 上の変数を読み替える。
- **ネットワーク**: private IP のみ(public IP 無効)の環境では、ローカルからの Auth Proxy 接続や復元先のネットワーク設定が変わる。復元先にも同じネットワーク設定が要る。
- **権限・組織ポリシー**: Editor 相当で足りる見込みだが、`sql.restrictPublicIp` などの組織ポリシーで復元先の作成が止まることがある。
- **HA・PITR**: 有効な環境では、PITR のクローン(`--point-in-time`)も訓練対象に加える。復元先の構成も変わる。
- **所要時間**: DB サイズ・ティアで変わる。上記の実績は参考値にとどめ、クライアント環境で実測して RPO / RTO を確定する。
