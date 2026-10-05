-- CreateTable
CREATE TABLE "LinkTranslation" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "LinkTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyTemplateTranslation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ReplyTemplateTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkTranslation_linkId_idx" ON "LinkTranslation"("linkId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTranslation_linkId_locale_key" ON "LinkTranslation"("linkId", "locale");

-- CreateIndex
CREATE INDEX "ReplyTemplateTranslation_templateId_idx" ON "ReplyTemplateTranslation"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplyTemplateTranslation_templateId_locale_key" ON "ReplyTemplateTranslation"("templateId", "locale");

-- AddForeignKey
ALTER TABLE "LinkTranslation" ADD CONSTRAINT "LinkTranslation_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyTemplateTranslation" ADD CONSTRAINT "ReplyTemplateTranslation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReplyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
