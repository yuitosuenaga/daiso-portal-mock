-- CreateTable
CREATE TABLE "AnnouncementConfirmer" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementConfirmer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementConfirmer_receiptId_idx" ON "AnnouncementConfirmer"("receiptId");

-- AddForeignKey
ALTER TABLE "AnnouncementConfirmer" ADD CONSTRAINT "AnnouncementConfirmer_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "AnnouncementReadReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "HelpdeskStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
