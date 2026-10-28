-- 外部キー列にインデックスが無かった10列にインデックスを追加する（親の削除・更新や JOIN の全表走査を避ける）。
-- インデックス追加のみで、既存のテーブル・列・アプリの挙動には影響しない（旧コードとも後方互換）。
-- 作成中は対象テーブルへの書き込みが待たされる（読み取りは可能）。手順: docs/infra/runbook.md §1.3

-- CreateIndex
CREATE INDEX "ApplicantUser_companyId_idx" ON "ApplicantUser"("companyId");

-- CreateIndex
CREATE INDEX "Inquiry_claimedByStaffId_idx" ON "Inquiry"("claimedByStaffId");

-- CreateIndex
CREATE INDEX "InquiryAttachment_inquiryId_idx" ON "InquiryAttachment"("inquiryId");

-- CreateIndex
CREATE INDEX "InquiryAttachment_historyEntryId_idx" ON "InquiryAttachment"("historyEntryId");

-- CreateIndex
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");

-- CreateIndex
CREATE INDEX "AnnouncementRecipientStatus_recipientId_idx" ON "AnnouncementRecipientStatus"("recipientId");

-- CreateIndex
CREATE INDEX "Document_categoryId_idx" ON "Document"("categoryId");

-- CreateIndex
CREATE INDEX "Document_subCategoryId_idx" ON "Document"("subCategoryId");

-- CreateIndex
CREATE INDEX "Link_categoryId_idx" ON "Link"("categoryId");

-- CreateIndex
CREATE INDEX "Link_subCategoryId_idx" ON "Link"("subCategoryId");
