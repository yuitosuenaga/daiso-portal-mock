-- CreateEnum
CREATE TYPE "StaffRegistrationSource" AS ENUM ('seed', 'manual', 'google_auto');

-- AlterEnum
ALTER TYPE "AuthEventType" ADD VALUE 'account_provisioned';

-- AlterTable
ALTER TABLE "HelpdeskStaff" ADD COLUMN     "registrationSource" "StaffRegistrationSource" NOT NULL DEFAULT 'manual',
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- 既存のseed担当者のみ登録経路をseedにする（他の既存行はmanual）
UPDATE "HelpdeskStaff" SET "registrationSource" = 'seed' WHERE "email" = 'staff@helpdesk.example.com';
