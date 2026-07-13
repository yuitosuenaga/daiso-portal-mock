"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  completeAnnouncementAction,
  confirmAnnouncementAction,
} from "@/lib/actions/announcement-tracking";
import {
  CompletedStatusBadge,
  ConfirmedStatusBadge,
} from "@/components/features/announcements/SelfReportStatusBadges";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

export interface AnnouncementSelfReportPanelProps {
  announcementId: string;
  /** 対象お知らせの対応要否（`Announcement.actionRequired`） */
  actionRequired: boolean;
  /** サーバー側で取得済みの、当該お知らせに対する自社の最新状態 */
  initialStatus: AnnouncementSelfStatus;
}

/**
 * お知らせ詳細画面で、確認済み状態の自動記録・「対応完了にする」ボタン操作・
 * 現在の状態バッジ表示を行うクライアントコンポーネント。
 *
 * マウント時（`useEffect`、依存配列は空）に`initialStatus.confirmedAt`が`null`の
 * ときのみ確認済み記録アクションを呼び出す（要件15.1, 15.3）。一覧画面には配置しない
 * （自動記録のトリガーを詳細画面表示に限定するため。要件15.2）。
 */
export function AnnouncementSelfReportPanel({
  announcementId,
  actionRequired,
  initialStatus,
}: AnnouncementSelfReportPanelProps) {
  const t = useTranslations("announcements.selfReport");
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialStatus.confirmedAt !== null) {
      return;
    }

    confirmAnnouncementAction(announcementId)
      .then(setStatus)
      .catch(() => {
        // 記録に失敗しても詳細画面の閲覧自体には影響させない（要件15.1関連のエラー処理）
      });
    // マウント時に1回のみ実行する（要件15.1, 15.3）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCompleteClick() {
    setIsSubmitting(true);
    try {
      const result = await completeAnnouncementAction(announcementId);
      setStatus(result);
    } catch {
      // 記録に失敗しても詳細画面の閲覧自体には影響させない
    } finally {
      setIsSubmitting(false);
    }
  }

  const showCompleteButton = actionRequired && status.completedAt === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmedStatusBadge isConfirmed={status.confirmedAt !== null} />
      {actionRequired && (
        <CompletedStatusBadge isCompleted={status.completedAt !== null} />
      )}
      {showCompleteButton && (
        <Button
          type="button"
          size="sm"
          onClick={handleCompleteClick}
          disabled={isSubmitting}
        >
          {t("completeButton")}
        </Button>
      )}
    </div>
  );
}
