-- CreateEnum
CREATE TYPE "TranslationSource" AS ENUM ('manual', 'machine');

-- CreateEnum
CREATE TYPE "InquiryTranslationStatus" AS ENUM ('pending', 'completed', 'failed');

-- AlterTable
ALTER TABLE "AnnouncementTranslation" ADD COLUMN     "source" "TranslationSource" NOT NULL DEFAULT 'manual',
ADD COLUMN     "sourceHash" TEXT;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "translationStatus" "InquiryTranslationStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "InquiryTranslation" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "source" "TranslationSource" NOT NULL DEFAULT 'machine',
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InquiryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquiryTranslation_inquiryId_idx" ON "InquiryTranslation"("inquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "InquiryTranslation_inquiryId_locale_key" ON "InquiryTranslation"("inquiryId", "locale");

-- AddForeignKey
ALTER TABLE "InquiryTranslation" ADD CONSTRAINT "InquiryTranslation_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
