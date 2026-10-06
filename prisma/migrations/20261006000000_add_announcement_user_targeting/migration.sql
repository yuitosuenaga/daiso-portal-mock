-- AlterEnum
ALTER TYPE "AnnouncementTargetingScope" ADD VALUE 'users';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "targetingUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
