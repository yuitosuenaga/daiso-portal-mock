-- CreateEnum
CREATE TYPE "HelpdeskStaffRole" AS ENUM ('admin', 'member');

-- AlterTable
ALTER TABLE "HelpdeskStaff" ADD COLUMN     "role" "HelpdeskStaffRole" NOT NULL DEFAULT 'member';
