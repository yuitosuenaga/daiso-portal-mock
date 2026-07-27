-- CreateTable
CREATE TABLE "AnnouncementReadReceipt" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "readReminderSentAt" TIMESTAMP(3),

    CONSTRAINT "AnnouncementReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementReadReceipt_announcementId_idx" ON "AnnouncementReadReceipt"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementReadReceipt_applicantUserId_idx" ON "AnnouncementReadReceipt"("applicantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementReadReceipt_announcementId_applicantUserId_key" ON "AnnouncementReadReceipt"("announcementId", "applicantUserId");

-- AddForeignKey
ALTER TABLE "AnnouncementReadReceipt" ADD CONSTRAINT "AnnouncementReadReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReadReceipt" ADD CONSTRAINT "AnnouncementReadReceipt_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "ApplicantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
