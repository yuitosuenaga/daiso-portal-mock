-- AlterTable
ALTER TABLE "Link" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "subCategoryId" TEXT;

-- DropEnum
DROP TYPE "LinkCategory";

-- CreateTable
CREATE TABLE "LinkCategory" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkCategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LinkCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkCategory_parentId_displayOrder_idx" ON "LinkCategory"("parentId", "displayOrder");

-- CreateIndex
CREATE INDEX "LinkCategoryTranslation_categoryId_idx" ON "LinkCategoryTranslation"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkCategoryTranslation_categoryId_locale_key" ON "LinkCategoryTranslation"("categoryId", "locale");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LinkCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "LinkCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkCategory" ADD CONSTRAINT "LinkCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LinkCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkCategoryTranslation" ADD CONSTRAINT "LinkCategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LinkCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

