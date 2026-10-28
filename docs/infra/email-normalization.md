# メール正規化(段階2): 小文字化 + CHECK 制約の適用手順

`ApplicantUser.email` / `HelpdeskStaff.email` の保存値を `lower(btrim(email))` に揃え、DB の CHECK 制約で保証する。マイグレーション名は `20261029000001_normalize_email_lowercase`。既存の `@unique` と組み合わせると、実質的に大文字小文字を区別しない一意制約になる。

## 適用順(重要)

**推奨: 段階1(#217)を先に単独でデプロイし、本番で反映を確認してから、本 PR(段階2)をマージして適用する。**

1. #217(アプリ側。登録時の小文字化、大文字小文字を無視する照合)は既にマージ済みで、次の通常デプロイで本番に出る。これを先にデプロイする(本 PR は含めない)。
2. 本番に #217 が反映されたことを確認する(下記「#217 が本番に反映済みかの確認」)。
3. 本 PR をマージし、本書の手順で段階2のマイグレーションを適用する。

### 同一デプロイで両方を出す場合の窓

`.claude/commands/deploy-main.md` の手順3は「`migrate deploy` → Cloud Run デプロイ」を1回の流れで行う。#217 が本番に出る前に本 PR がマージされ、main をそのままデプロイすると、migrate が先に走り、Cloud Run のデプロイが完了するまでの数分間は旧コードが動く。この間は次の影響が出る。

- 旧コードの申請者作成は email を小文字化せずに保存するため、大文字入りのメールでの登録は CHECK 違反になり 500 になる。
- 既存行は migrate で小文字化済みのため、旧コードのログイン照合(大文字小文字を区別)は、大文字を含む入力だと失敗する。

この窓を許容するか、メンテナンス窓で行うかを事前に決める。許容して同一デプロイで出す場合は、窓を最短にするため、migrate の直後に Cloud Run デプロイまで続ける(間に確認作業などを挟まない)。migrate Job か Proxy かの手順は `deploy-main.md` と `runbook.md` §1.3 に従う。

段階2のマイグレーションは追加のみ(新カラムなし)で、段階1のコードとは互換。`schema.prisma` は変更しないため、Prisma Client の再生成は不要。

### #217 が本番に反映済みかの確認(読み取りのみ)

Cloud Run のソースデプロイはイメージにコミットハッシュを持たないため、時刻で照合する。本番への書き込みや機密値の参照は伴わない。

1. 稼働中のリビジョンの作成日時を確認する(`gcloud run revisions list` の DEPLOYED 列、または `runbook.md` §1.6 のリリース記録にあるコミット)。

   ```bash
   gcloud run revisions list --service portal-mock --region asia-northeast1 --project rvp-ai-proto-camp --limit 3
   ```
2. リリース記録にコミットがあれば、`git merge-base --is-ancestor f2428c5 <記録のコミット> && echo 含まれる` で #217 のマージコミット(f2428c5)が含まれるか照合する。
3. 記録が無い場合は、f2428c5 のコミット日時(`git log -1 --format=%cI f2428c5`)より、稼働中リビジョンの作成日時が後であることを確認する(後なら、そのデプロイは #217 取り込み後の `origin/main` から作られている)。迷う場合は、次のデプロイで #217 を単独で出す。

## 1. デプロイ前の確認(読み取り専用)

本番(または確認対象の DB)で、**マイグレーション適用の前に**実行する。次の 1・2 のクエリは**メールアドレスを出力する**(PII)。結果は実行者の端末にだけ出し、チケット・チャット・リポジトリに貼らない。

```sql
-- 1) 各テーブルの、大文字小文字・前後空白を無視した重複一覧(メールを出力する)
SELECT id, email, "createdAt", "isActive" FROM "ApplicantUser"
WHERE lower(btrim(email)) IN (
  SELECT lower(btrim(email)) FROM "ApplicantUser" GROUP BY 1 HAVING count(*) > 1)
ORDER BY lower(btrim(email)), "createdAt";

SELECT id, email, "createdAt", "isActive" FROM "HelpdeskStaff"
WHERE lower(btrim(email)) IN (
  SELECT lower(btrim(email)) FROM "HelpdeskStaff" GROUP BY 1 HAVING count(*) > 1)
ORDER BY lower(btrim(email)), "createdAt";

-- 2) 申請者とスタッフにまたがる重複(メールを出力する)
SELECT 'applicant' AS kind, a.id, a.email, a."createdAt", a."isActive"
FROM "ApplicantUser" a JOIN "HelpdeskStaff" s ON lower(btrim(a.email)) = lower(btrim(s.email))
UNION ALL
SELECT 'staff', s.id, s.email, s."createdAt", s."isActive"
FROM "HelpdeskStaff" s JOIN "ApplicantUser" a ON lower(btrim(a.email)) = lower(btrim(s.email))
ORDER BY 3, 1;

-- 3) 正規化されていない行の件数(これらはマイグレーションが小文字化する。メールは出ない)
SELECT 'ApplicantUser' AS t, count(*) FROM "ApplicantUser" WHERE email <> lower(btrim(email))
UNION ALL
SELECT 'HelpdeskStaff', count(*) FROM "HelpdeskStaff" WHERE email <> lower(btrim(email));

-- 4) スペース以外の空白類(タブ・改行・NBSP など)を含むメールの件数(メールは出ない)
SELECT 'ApplicantUser' AS t, count(*) FROM "ApplicantUser" WHERE email ~ '[[:space:]]'
UNION ALL
SELECT 'HelpdeskStaff', count(*) FROM "HelpdeskStaff" WHERE email ~ '[[:space:]]';
```

1 と 2 が 0 行であることを確認する。1 件でもあれば、マイグレーションの事前検査(`DO` ブロック)が中止する。

4 は 0 件であることを確認する。JavaScript の `trim()` は改行・タブ・NBSP も除去するが、PostgreSQL の `btrim` は半角スペースしか除去しない。前後にスペース以外の空白類を含むメールは、マイグレーションと CHECK は通るが、アプリ側の `normalizeEmail`(`trim` 済み)の結果と一致せず、ログインできなくなる。0 件でなければ、管理画面(販社のアカウント管理・スタッフ管理)でそのメールを修正する。

### 重複が見つかった場合

管理画面(販社のアカウント管理・スタッフ管理)から、重複のどちらかを無効化・整理してからデプロイする。アカウントを残す側は、最終ログインや紐付く問い合わせ・既読を確認して決める。ログイン照合は重複時に完全一致を優先し、無ければ拒否する(段階1)。

## 2. マイグレーションの適用

手順は `.claude/commands/deploy-main.md` の手順3(Cloud SQL Auth Proxy 経由の `prisma migrate deploy`。マニュアルモードで実施)と `runbook.md` §1.3 に従う。

1. **事前にオンデマンドバックアップを取得する**(runbook §2.2)。

   ```bash
   gcloud sql backups create --instance portal-mock-backend-db --project rvp-ai-proto-camp --description "before-email-normalization"
   gcloud sql backups list --instance portal-mock-backend-db --project rvp-ai-proto-camp   # SUCCESSFUL を確認
   ```
2. `prisma migrate status` → `prisma migrate deploy` → `prisma migrate status` が `Database schema is up to date!` になることを確認する。
3. 適用後に確認する(読み取り専用。メールは出ない):

   ```sql
   SELECT conname FROM pg_constraint WHERE conname LIKE '%email_lowercase_check';  -- 2 行
   SELECT count(*) FROM "ApplicantUser" WHERE email <> lower(btrim(email));        -- 0
   SELECT count(*) FROM "HelpdeskStaff" WHERE email <> lower(btrim(email));        -- 0
   ```

マイグレーションは次の順に1トランザクションで実行する。(1) 事前検査: 正規化後に重複する行(申請者内・スタッフ内・両者にまたがる)があれば `RAISE EXCEPTION` で中止する。メッセージには**件数のみ**を出し、メールは含めない。(2) `UPDATE` で `lower(btrim(email))` に正規化。(3) `ADD CONSTRAINT ... CHECK (email = lower(btrim(email)))`。

### ロックの影響

`UPDATE` と `ADD CONSTRAINT` は対象テーブルに ACCESS EXCLUSIVE ロックを取る。行数が少なく数ミリ秒で終わる見込み。行数が大きい環境に適用する場合は `ADD CONSTRAINT ... NOT VALID` → `VALIDATE CONSTRAINT` に分ける。

## 3. 失敗時(事前検査で中止した場合)

トランザクション内のため、データ・制約は部分適用されない(`UPDATE` もロールバックされる)。ただし Prisma の `_prisma_migrations` に失敗の履歴が残り、そのままでは次のマイグレーションを適用できない。

1. 中止メッセージの件数を確認し、上記「重複が見つかった場合」の手順で重複を解消する。
2. 失敗履歴を解消する: `npx prisma migrate resolve --rolled-back 20261029000001_normalize_email_lowercase`
3. `npx prisma migrate deploy` を再実行し、`migrate status` で整合を確認する。

## 4. ロールバック

CHECK 制約だけを外す(Prisma の履歴は適用済みのまま。アプリは段階1のコードで動く)。

```sql
ALTER TABLE "ApplicantUser" DROP CONSTRAINT "ApplicantUser_email_lowercase_check";
ALTER TABLE "HelpdeskStaff" DROP CONSTRAINT "HelpdeskStaff_email_lowercase_check";
```

小文字化したデータは元に戻らない(元の大文字小文字が必要な場合はバックアップから復元する。runbook §2.3)。

## 5. 残る制約

- 申請者とスタッフにまたがるメールの一意性は、段階2の後もアプリ側(`isApplicantUserEmailTaken` / `isStaffEmailTaken`)でしか保証されない。DB の一意制約は各テーブル内のみ。
- 将来、メールを書き込む経路を追加するときは、必ず `normalizeEmail`(`src/lib/auth/google-login-policy.ts`)または `emailSchema` を通す。通さないと CHECK 違反になる。
- `schema.prisma` は CHECK 制約を表現しない。`prisma migrate dev` の差分には現れない(検証済み)。
