import "server-only";

import { prisma } from "@/lib/db/prisma";
import { isAnnouncementDueDateOverdue } from "@/lib/announcement-overdue";
import {
  ANNOUNCEMENT_INCLUDE,
  mapAnnouncement,
  targetApplicantUsersWhere,
} from "@/lib/server/announcement-mapper";
import { notifyAnnouncementEscalation } from "@/lib/server/announcement-notifications";
import { getAnnouncementRecipientStatuses } from "@/lib/server/announcement-service";
import type { Announcement } from "@/types/announcement";

/**
 * 当日重複判定（要件38.5・38.7）の対象とする通知種別。自動督促（`escalation`）と
 * 手動リマインド（`reminder`）の両方を、同一お知らせ×同一宛先メールの当日実績として扱う。
 */
const DEDUP_KINDS = ["escalation", "reminder"] as const;

/** `runAnnouncementAutoEscalation`の実行結果サマリ（要件38.8）。 */
export interface EscalationRunResult {
  /** 期限超過・対象（`actionRequired`真・`published`・`dueDate`超過）だったお知らせ数。 */
  overdueAnnouncements: number;
  /** 当日重複を除外したうえで送信を試みた宛先数（sent/skipped/failedの合計）。 */
  notifiedRecipients: number;
  /** 当日重複（既に`escalation`/`reminder`送信済み）により除外した宛先数。 */
  skippedByDedup: number;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * 対象お知らせ1件分のエスカレーション処理。未対応（`completedAt`未記録）の会社を検出し、
 * 当日まだ督促を受け取っていない有効な`ApplicantUser`へのみ送信を委ね、送信対象が
 * 生じた未対応会社の担当者（`AnnouncementRecipient`）の`reminderSentAt`を更新する。
 * 1件のお知らせの処理失敗が他のお知らせの処理を妨げないよう、この関数単位で
 * 例外を捕捉する（ベストエフォート）。
 */
async function processOverdueAnnouncement(
  announcement: Announcement,
  now: Date,
  result: EscalationRunResult
): Promise<void> {
  try {
    const statuses = await getAnnouncementRecipientStatuses(announcement.id);
    const unresolved = statuses.filter((status) => status.completedAt === null);
    if (unresolved.length === 0) {
      return;
    }

    const companyCodes = Array.from(new Set(unresolved.map((status) => status.companyCode)));

    const todayLogs = await prisma.announcementNotificationLog.findMany({
      where: {
        announcementId: announcement.id,
        kind: { in: [...DEDUP_KINDS] },
        sentAt: { gte: startOfLocalDay(now) },
      },
      select: { recipientEmail: true },
    });
    const alreadyNotifiedEmails = new Set(todayLogs.map((log) => log.recipientEmail));

    // 送信対象が生じた（＝当日まだ通知していない宛先を持つ）未対応会社を特定するため、
    // 通知対象となる有効ApplicantUserを先に解決しておく。実際の送信・履歴記録自体は
    // `notifyAnnouncementEscalation`（announcement-notifications.ts）に委ね、判定ロジックを
    // 二重実装しない。
    const applicantRecipients = await prisma.applicantUser.findMany({
      where: {
        AND: [
          targetApplicantUsersWhere(announcement),
          { company: { companyCode: { in: companyCodes } } },
        ],
      },
      select: { email: true, company: { select: { companyCode: true } } },
    });

    const newlyNotifiedCompanyCodes = new Set<string>();
    let skippedByDedup = 0;
    for (const recipient of applicantRecipients) {
      if (alreadyNotifiedEmails.has(recipient.email)) {
        skippedByDedup += 1;
      } else {
        newlyNotifiedCompanyCodes.add(recipient.company.companyCode);
      }
    }

    result.notifiedRecipients += applicantRecipients.length - skippedByDedup;
    result.skippedByDedup += skippedByDedup;

    await notifyAnnouncementEscalation(announcement.id, companyCodes, alreadyNotifiedEmails);

    // 送信対象が生じた（当日重複で全除外されなかった）未対応会社の担当者についてのみ、
    // 既存の手動リマインド（`sendAnnouncementReminders`）と同一パターンでreminderSentAtを
    // upsertする（要件38.6）。
    const recipientIdsToStamp = unresolved
      .filter((status) => newlyNotifiedCompanyCodes.has(status.companyCode))
      .map((status) => status.recipientId);

    await Promise.all(
      recipientIdsToStamp.map((recipientId) =>
        prisma.announcementRecipientStatus.upsert({
          where: {
            announcementId_recipientId: { announcementId: announcement.id, recipientId },
          },
          update: { reminderSentAt: now },
          create: { announcementId: announcement.id, recipientId, reminderSentAt: now },
        })
      )
    );
  } catch (error) {
    console.error(
      `[announcement-escalation] Failed to process escalation for announcement ${announcement.id}:`,
      error
    );
  }
}

/**
 * 対応期限を超過した公開済みお知らせ（`actionRequired`真・`published`・`dueDate`超過）に
 * ついて、未対応（`AnnouncementRecipientStatus.completedAt`未記録）の会社に属する
 * 有効な`ApplicantUser`へ自動的に督促メールを送る（要件38）。
 *
 * トリガー元（アクセス時トリガー・将来のCloud Scheduler向けAPI）に依存しない独立関数。
 * 何度呼び出しても、当日重複判定（同一お知らせ×同一宛先メールへの`escalation`/`reminder`
 * 送信が当日既にあれば除外）により追加のメールを送らない冪等な振る舞いをする
 * （要件38.5, 38.7, 38.8）。全体をベストエフォートで処理し、内部の例外はログに記録する
 * のみでthrowしない（要件38.8）。
 */
export async function runAnnouncementAutoEscalation(
  now: Date = new Date()
): Promise<EscalationRunResult> {
  const result: EscalationRunResult = {
    overdueAnnouncements: 0,
    notifiedRecipients: 0,
    skippedByDedup: 0,
  };

  try {
    const records = await prisma.announcement.findMany({
      where: { status: "published", actionRequired: true, dueDate: { not: null } },
      include: ANNOUNCEMENT_INCLUDE,
    });

    const overdueAnnouncements = records
      .map(mapAnnouncement)
      .filter((announcement) => isAnnouncementDueDateOverdue(announcement.dueDate, now));

    result.overdueAnnouncements = overdueAnnouncements.length;

    for (const announcement of overdueAnnouncements) {
      await processOverdueAnnouncement(announcement, now, result);
    }
  } catch (error) {
    console.error("[announcement-escalation] runAnnouncementAutoEscalation failed:", error);
  }

  return result;
}

/**
 * プロセス内メモリで保持する、アクセス時トリガーの最終実行暦日（スロットリング用）。
 * サーバーレス環境ではインスタンスごとに独立し、コールドスタートで揮発する前提。
 * その場合でも要件38.5の当日ログ重複判定が二重送信を防ぐ耐久ガードとして機能する。
 */
let lastTriggeredLocalDateKey: string | null = null;

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * ヘルプデスク側お知らせ管理一覧のアクセス時トリガー用の薄いラッパ（要件38.9）。
 * プロセス内メモリの「最終実行暦日」でスロットリングし、当日既に実行済みなら中核関数の
 * スキャン自体を省略する。例外は内部で握りつぶし、呼び出し元（一覧描画）を妨げない
 * （要件38.8）。
 */
export async function triggerAutoEscalationBestEffort(now: Date = new Date()): Promise<void> {
  const todayKey = localDateKey(now);
  if (lastTriggeredLocalDateKey === todayKey) {
    return;
  }

  try {
    await runAnnouncementAutoEscalation(now);
  } catch (error) {
    console.error("[announcement-escalation] triggerAutoEscalationBestEffort failed:", error);
  } finally {
    lastTriggeredLocalDateKey = todayKey;
  }
}
