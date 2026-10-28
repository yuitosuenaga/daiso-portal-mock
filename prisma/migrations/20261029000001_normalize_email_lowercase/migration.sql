-- メールの保存値を lower(btrim(email)) に揃え、DBでも保証する（段階2）。
-- 前提: 段階1（アプリ側の小文字化・大文字小文字無視の照合）を本番にデプロイ済みであること。
-- 段階1より先に適用すると、大文字入りのメールの保存が CHECK 違反（500）になる。
-- 確認用クエリ・手順・ロールバック: docs/infra/email-normalization.md
--
-- 1) 事前検査: 正規化後に重複する行があれば中止する（トランザクション内のため部分適用は残らない）。
--    PII を Prisma やログに出さないため、例外メッセージにメールアドレスは含めず件数のみ出す。
DO $$
DECLARE
  dup_applicant integer;
  dup_staff integer;
  dup_cross integer;
BEGIN
  SELECT count(*) INTO dup_applicant FROM (
    SELECT 1 FROM "ApplicantUser" GROUP BY lower(btrim(email)) HAVING count(*) > 1
  ) t;
  SELECT count(*) INTO dup_staff FROM (
    SELECT 1 FROM "HelpdeskStaff" GROUP BY lower(btrim(email)) HAVING count(*) > 1
  ) t;
  SELECT count(*) INTO dup_cross FROM (
    SELECT DISTINCT lower(btrim(a.email))
    FROM "ApplicantUser" a
    JOIN "HelpdeskStaff" s ON lower(btrim(a.email)) = lower(btrim(s.email))
  ) t;

  IF dup_applicant > 0 OR dup_staff > 0 OR dup_cross > 0 THEN
    RAISE EXCEPTION
      'email normalization aborted: duplicate normalized emails (ApplicantUser groups=%, HelpdeskStaff groups=%, applicant/staff overlaps=%). Resolve them first; see docs/infra/email-normalization.md',
      dup_applicant, dup_staff, dup_cross;
  END IF;
END $$;

-- 2) 既存データの正規化（前後の空白除去 + 小文字化）
UPDATE "ApplicantUser" SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));
UPDATE "HelpdeskStaff" SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));

-- 3) 以後、正規化されていない値の保存をDBが拒否する（@unique と合わせて大文字小文字非区別の一意になる）
ALTER TABLE "ApplicantUser"
  ADD CONSTRAINT "ApplicantUser_email_lowercase_check" CHECK (email = lower(btrim(email)));
ALTER TABLE "HelpdeskStaff"
  ADD CONSTRAINT "HelpdeskStaff_email_lowercase_check" CHECK (email = lower(btrim(email)));
