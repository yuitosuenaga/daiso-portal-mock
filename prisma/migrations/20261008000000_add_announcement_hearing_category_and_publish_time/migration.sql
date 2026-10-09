-- AlterEnum
ALTER TYPE "AnnouncementCategory" ADD VALUE 'hearing';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "publishEndTime" TEXT,
ADD COLUMN     "publishStartTime" TEXT;
