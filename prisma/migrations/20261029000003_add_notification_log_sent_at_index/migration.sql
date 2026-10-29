-- AnnouncementNotificationLog.sentAt にインデックスを追加する（保持期間超過分の定期削除 /api/cron/log-retention の範囲検索用）。
-- インデックス追加のみで、既存のテーブル・列・アプリの挙動には影響しない（旧コードとも後方互換）。
-- 作成中は対象テーブルへの書き込みが待たされる（読み取りは可能）。手順: docs/infra/runbook.md §1.3

-- CreateIndex
CREATE INDEX "AnnouncementNotificationLog_sentAt_idx" ON "AnnouncementNotificationLog"("sentAt");
