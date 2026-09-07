-- CreateEnum
CREATE TYPE "MonthlyMaterialCategory" AS ENUM ('salesFloorMeeting', 'pop');

-- CreateEnum
CREATE TYPE "MonthlyMaterialSourceType" AS ENUM ('upload', 'google');

-- CreateEnum
CREATE TYPE "MonthlyMaterialTargetingScope" AS ENUM ('all', 'countries', 'companies');

-- CreateTable
CREATE TABLE "MonthlyMaterial" (
    "id" TEXT NOT NULL,
    "category" "MonthlyMaterialCategory" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sourceType" "MonthlyMaterialSourceType" NOT NULL DEFAULT 'upload',
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "dataUrl" TEXT,
    "googleUrl" TEXT,
    "googleEmbedUrl" TEXT,
    "targetingScope" "MonthlyMaterialTargetingScope" NOT NULL DEFAULT 'all',
    "targetingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetingCompanyCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyMaterial_category_idx" ON "MonthlyMaterial"("category");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyMaterial_category_year_month_key" ON "MonthlyMaterial"("category", "year", "month");
