-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('maintenance', 'policy', 'incident', 'other');

-- CreateEnum
CREATE TYPE "AnnouncementTargetingScope" AS ENUM ('all', 'countries');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "targetingScope" "AnnouncementTargetingScope" NOT NULL DEFAULT 'all',
    "targetingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRecipient" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,

    CONSTRAINT "AnnouncementRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRecipientStatus" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),

    CONSTRAINT "AnnouncementRecipientStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementRecipient_companyId_idx" ON "AnnouncementRecipient"("companyId");

-- CreateIndex
CREATE INDEX "AnnouncementRecipientStatus_announcementId_idx" ON "AnnouncementRecipientStatus"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRecipientStatus_announcementId_recipientId_key" ON "AnnouncementRecipientStatus"("announcementId", "recipientId");

-- AddForeignKey
ALTER TABLE "AnnouncementRecipient" ADD CONSTRAINT "AnnouncementRecipient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRecipientStatus" ADD CONSTRAINT "AnnouncementRecipientStatus_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRecipientStatus" ADD CONSTRAINT "AnnouncementRecipientStatus_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "AnnouncementRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
