-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementDocumentLink" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "AnnouncementDocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementDocumentLink_announcementId_idx" ON "AnnouncementDocumentLink"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementDocumentLink_documentId_idx" ON "AnnouncementDocumentLink"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementDocumentLink_announcementId_documentId_key" ON "AnnouncementDocumentLink"("announcementId", "documentId");

-- AddForeignKey
ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementDocumentLink" ADD CONSTRAINT "AnnouncementDocumentLink_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementDocumentLink" ADD CONSTRAINT "AnnouncementDocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
