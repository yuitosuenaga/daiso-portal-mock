-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "targetingCompanyIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
