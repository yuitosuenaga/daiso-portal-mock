-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('upload', 'google');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "googleEmbedUrl" TEXT,
ADD COLUMN     "googleUrl" TEXT,
ADD COLUMN     "sourceType" "DocumentSourceType" NOT NULL DEFAULT 'upload',
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "fileType" DROP NOT NULL,
ALTER COLUMN "fileType" DROP DEFAULT,
ALTER COLUMN "fileSize" DROP NOT NULL,
ALTER COLUMN "dataUrl" DROP NOT NULL;
