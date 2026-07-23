-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'published';
