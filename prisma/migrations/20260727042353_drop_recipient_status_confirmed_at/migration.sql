-- AlterTable
-- 会社単位の確認済み（confirmedAt）を廃止する。実行前に、本カラムの非nullな値は
-- `AnnouncementReadReceipt`（個人単位の受信レシート）へキャリーフォワードするバックフィル
-- スクリプト（prisma/backfill-announcement-read-receipts.ts）を必ず実行しておくこと
-- （announcements-management spec 要件41.2, 41.5）。
ALTER TABLE "AnnouncementRecipientStatus" DROP COLUMN "confirmedAt";
