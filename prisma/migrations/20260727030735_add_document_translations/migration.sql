-- CreateTable
CREATE TABLE "DocumentTranslation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "DocumentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTranslation_documentId_idx" ON "DocumentTranslation"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTranslation_documentId_locale_key" ON "DocumentTranslation"("documentId", "locale");

-- AddForeignKey
ALTER TABLE "DocumentTranslation" ADD CONSTRAINT "DocumentTranslation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
