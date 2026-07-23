-- AlterTable
-- 既存行への `updatedAt` バックフィル: 一旦 NULL 許容で列を追加し、既存行は `createdAt` の値で埋めたうえで
-- NOT NULL 制約を付与する（新規行以降は Prisma の `@updatedAt` がアプリケーション側で自動設定する）。
ALTER TABLE "Faq" ADD COLUMN     "updatedAt" TIMESTAMP(3);

UPDATE "Faq" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "Faq" ALTER COLUMN "updatedAt" SET NOT NULL;
