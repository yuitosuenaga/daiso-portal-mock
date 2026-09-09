-- CreateEnum
CREATE TYPE "ManualCategory" AS ENUM ('storeOperations', 'registerPayment', 'inventoryOrdering', 'salesFloorDisplay', 'promotion', 'safetyHygiene', 'hrTraining', 'systemOperation', 'accounting', 'other');

-- CreateEnum
CREATE TYPE "ManualSourceType" AS ENUM ('upload', 'google');

-- CreateEnum
CREATE TYPE "ManualTargetingScope" AS ENUM ('all', 'countries', 'companies');

-- CreateTable
CREATE TABLE "Manual" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ManualCategory" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sourceType" "ManualSourceType" NOT NULL DEFAULT 'upload',
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "dataUrl" TEXT,
    "googleUrl" TEXT,
    "googleEmbedUrl" TEXT,
    "targetingScope" "ManualTargetingScope" NOT NULL DEFAULT 'all',
    "targetingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetingCompanyCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualTranslation" (
    "id" TEXT NOT NULL,
    "manualId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ManualTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Manual_category_year_month_idx" ON "Manual"("category", "year", "month");

-- CreateIndex
CREATE INDEX "Manual_category_idx" ON "Manual"("category");

-- CreateIndex
CREATE INDEX "ManualTranslation_manualId_idx" ON "ManualTranslation"("manualId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualTranslation_manualId_locale_key" ON "ManualTranslation"("manualId", "locale");

-- AddForeignKey
ALTER TABLE "ManualTranslation" ADD CONSTRAINT "ManualTranslation_manualId_fkey" FOREIGN KEY ("manualId") REFERENCES "Manual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
