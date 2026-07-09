-- CreateEnum
CREATE TYPE "DocumentTargetingScope" AS ENUM ('all', 'countries', 'companies');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetingScope" "DocumentTargetingScope" NOT NULL DEFAULT 'all',
    "targetingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetingCompanyCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
