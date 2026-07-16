-- CreateEnum
CREATE TYPE "AnnouncementNotificationKind" AS ENUM ('publish', 'reminder');

-- CreateEnum
CREATE TYPE "AnnouncementNotificationStatus" AS ENUM ('sent', 'failed', 'skipped');

-- AlterTable
ALTER TABLE "ApplicantUser" ADD COLUMN     "preferredLocale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "AnnouncementTranslation" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "AnnouncementTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementNotificationLog" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "kind" "AnnouncementNotificationKind" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" "AnnouncementNotificationStatus" NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementTranslation_announcementId_idx" ON "AnnouncementTranslation"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementTranslation_announcementId_locale_key" ON "AnnouncementTranslation"("announcementId", "locale");

-- CreateIndex
CREATE INDEX "AnnouncementNotificationLog_announcementId_idx" ON "AnnouncementNotificationLog"("announcementId");

-- AddForeignKey
ALTER TABLE "AnnouncementTranslation" ADD CONSTRAINT "AnnouncementTranslation_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementNotificationLog" ADD CONSTRAINT "AnnouncementNotificationLog_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
