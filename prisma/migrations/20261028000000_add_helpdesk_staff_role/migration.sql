-- CreateEnum
CREATE TYPE "HelpdeskStaffRole" AS ENUM ('admin', 'member');

-- AlterTable
ALTER TABLE "HelpdeskStaff" ADD COLUMN     "role" "HelpdeskStaffRole" NOT NULL DEFAULT 'member';

-- seed担当者のみadminにする（他の既存行はmember。本番の初期adminはデプロイ後に手動UPDATEで指定する）
UPDATE "HelpdeskStaff" SET "role" = 'admin' WHERE "email" = 'staff@helpdesk.example.com';
