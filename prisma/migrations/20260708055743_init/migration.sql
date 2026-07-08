-- CreateEnum
CREATE TYPE "InquiryCategory" AS ENUM ('defect', 'order', 'system', 'other');

-- CreateEnum
CREATE TYPE "InquiryUrgency" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('new', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "InquiryHistoryEntryType" AS ENUM ('claimed', 'released', 'status_changed', 'reply_sent', 'requester_message');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpdeskStaff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpdeskStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "category" "InquiryCategory" NOT NULL,
    "urgency" "InquiryUrgency" NOT NULL,
    "storeRegion" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "originalLanguage" TEXT NOT NULL,
    "translatedText" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "submittedByCompanyName" TEXT NOT NULL,
    "submittedByCountry" TEXT NOT NULL,
    "claimedByStaffId" TEXT,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryHistoryEntry" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "type" "InquiryHistoryEntryType" NOT NULL,
    "actorName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "detail" TEXT,

    CONSTRAINT "InquiryHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "inquiryId" TEXT,
    "historyEntryId" TEXT,

    CONSTRAINT "InquiryAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyCode_key" ON "Company"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantUser_email_key" ON "ApplicantUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HelpdeskStaff_email_key" ON "HelpdeskStaff"("email");

-- CreateIndex
CREATE INDEX "Inquiry_companyId_idx" ON "Inquiry"("companyId");

-- CreateIndex
CREATE INDEX "InquiryHistoryEntry_inquiryId_idx" ON "InquiryHistoryEntry"("inquiryId");

-- AddForeignKey
ALTER TABLE "ApplicantUser" ADD CONSTRAINT "ApplicantUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_claimedByStaffId_fkey" FOREIGN KEY ("claimedByStaffId") REFERENCES "HelpdeskStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryHistoryEntry" ADD CONSTRAINT "InquiryHistoryEntry_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryAttachment" ADD CONSTRAINT "InquiryAttachment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryAttachment" ADD CONSTRAINT "InquiryAttachment_historyEntryId_fkey" FOREIGN KEY ("historyEntryId") REFERENCES "InquiryHistoryEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
