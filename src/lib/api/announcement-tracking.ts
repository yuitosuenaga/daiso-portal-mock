import { getGlobalMockStore } from "@/lib/mock-store";
import { ANNOUNCEMENT_RECIPIENTS } from "@/lib/constants/announcement-recipients";
import { getAnnouncementByIdForHelpdesk } from "@/lib/api/announcements";
import type { Announcement } from "@/types/announcement";
import type {
  AnnouncementRecipient,
  AnnouncementRecipientStatus,
  AnnouncementRecipientStatusView,
  AnnouncementTrackingSummary,
} from "@/types/announcement-recipient";

/**
 * お知らせ×担当者の確認済み・実施済み・リマインド送信状態。
 * レコードが存在しない組み合わせは「未確認・未実施・リマインド未送信」を意味する
 * （スパースな保持方式。`lib/mock-store.ts`参照）。
 */
const MOCK_ANNOUNCEMENT_RECIPIENT_STATUSES: AnnouncementRecipientStatus[] =
  getGlobalMockStore("announcement-recipient-statuses", createInitialStatuses);

function createInitialStatuses(): AnnouncementRecipientStatus[] {
  const CONFIRMED_AT = "2026-07-02T03:00:00Z";
  const COMPLETED_AT = "2026-07-02T05:00:00Z";
  const REMINDER_SENT_AT = "2026-07-05T00:00:00Z";

  const seeds: {
    announcementId: string;
    confirmed: string[];
    completed: string[];
    reminded: string[];
  }[] = [
    {
      announcementId: "1",
      confirmed: [
        "jp-daiso-japan-trading-1",
        "us-daiso-usa-1",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
        "vn-daiso-vietnam-1",
        "id-daiso-indonesia-1",
        "tw-daiso-taiwan-1",
        "sg-daiso-singapore-1",
        "jp-daiso-japan-trading-2",
        "us-daiso-usa-2",
      ],
      completed: [
        "jp-daiso-japan-trading-1",
        "us-daiso-usa-1",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
        "jp-daiso-japan-trading-2",
        "us-daiso-usa-2",
      ],
      reminded: [],
    },
    {
      announcementId: "2",
      confirmed: [
        "jp-daiso-japan-trading-1",
        "jp-daiso-japan-trading-2",
        "us-daiso-usa-1",
        "us-daiso-usa-2",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
        "th-daiso-thailand-2",
        "vn-daiso-vietnam-1",
        "vn-daiso-vietnam-2",
        "id-daiso-indonesia-1",
        "tw-daiso-taiwan-1",
        "sg-daiso-singapore-1",
      ],
      completed: [],
      reminded: [],
    },
    {
      announcementId: "3",
      confirmed: [
        "jp-daiso-japan-trading-1",
        "us-daiso-usa-1",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
        "vn-daiso-vietnam-1",
        "id-daiso-indonesia-1",
        "tw-daiso-taiwan-1",
        "sg-daiso-singapore-1",
      ],
      completed: ["jp-daiso-japan-trading-1", "us-daiso-usa-1", "kr-daiso-korea-1"],
      reminded: [],
    },
    {
      announcementId: "4",
      confirmed: [
        "jp-daiso-japan-trading-1",
        "us-daiso-usa-1",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
        "vn-daiso-vietnam-1",
        "id-daiso-indonesia-1",
        "id-daiso-indonesia-2",
        "tw-daiso-taiwan-1",
        "sg-daiso-singapore-1",
      ],
      completed: [],
      reminded: [],
    },
    {
      announcementId: "5",
      confirmed: [
        "jp-daiso-japan-trading-1",
        "us-daiso-usa-1",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
        "vn-daiso-vietnam-1",
        "id-daiso-indonesia-1",
        "tw-daiso-taiwan-1",
        "sg-daiso-singapore-1",
      ],
      completed: [
        "jp-daiso-japan-trading-1",
        "us-daiso-usa-1",
        "kr-daiso-korea-1",
        "th-daiso-thailand-1",
      ],
      // 対応要否ありだが未実施のまま、リマインドを送信済みのケース（デモ用シード）。
      reminded: ["vn-daiso-vietnam-1", "id-daiso-indonesia-1"],
    },
  ];

  return seeds.flatMap((seed) => {
    const recipientIds = new Set([
      ...seed.confirmed,
      ...seed.completed,
      ...seed.reminded,
    ]);

    return Array.from(recipientIds).map((recipientId) => ({
      announcementId: seed.announcementId,
      recipientId,
      confirmedAt: seed.confirmed.includes(recipientId) ? CONFIRMED_AT : null,
      completedAt: seed.completed.includes(recipientId) ? COMPLETED_AT : null,
      reminderSentAt: seed.reminded.includes(recipientId) ? REMINDER_SENT_AT : null,
    }));
  });
}

function getTargetRecipients(announcement: Announcement): AnnouncementRecipient[] {
  if (announcement.targeting.scope === "all") {
    return ANNOUNCEMENT_RECIPIENTS;
  }

  return ANNOUNCEMENT_RECIPIENTS.filter((recipient) =>
    announcement.targeting.scope === "countries" &&
    announcement.targeting.countries.includes(recipient.country)
  );
}

function findStatus(
  announcementId: string,
  recipientId: string
): AnnouncementRecipientStatus | undefined {
  return MOCK_ANNOUNCEMENT_RECIPIENT_STATUSES.find(
    (status) =>
      status.announcementId === announcementId && status.recipientId === recipientId
  );
}

function toStatusView(
  recipient: AnnouncementRecipient,
  status: AnnouncementRecipientStatus | undefined
): AnnouncementRecipientStatusView {
  return {
    recipientId: recipient.id,
    companyCode: recipient.companyCode,
    companyName: recipient.companyName,
    country: recipient.country,
    contactName: recipient.contactName,
    confirmedAt: status?.confirmedAt ?? null,
    completedAt: status?.completedAt ?? null,
    reminderSentAt: status?.reminderSentAt ?? null,
  };
}

/**
 * 指定したお知らせの配信対象（`targeting`）でスコープされた担当者について、
 * 確認済み・実施済み・リマインド送信状態を結合した一覧を返す。
 * 該当お知らせが存在しない場合は空配列を返す。
 */
export async function getAnnouncementRecipientStatuses(
  announcementId: string
): Promise<AnnouncementRecipientStatusView[]> {
  const announcement = await getAnnouncementByIdForHelpdesk(announcementId);
  if (!announcement) {
    return [];
  }

  const recipients = getTargetRecipients(announcement);

  return recipients.map((recipient) =>
    toStatusView(recipient, findStatus(announcementId, recipient.id))
  );
}

/**
 * 指定したお知らせの確認済み・実施済み人数を集計する。
 * `actionRequired`が偽のお知らせでは`completedCount`は`null`を返す。
 * 該当お知らせが存在しない場合は全て0（`completedCount`は`null`）を返す。
 */
export async function getAnnouncementTrackingSummary(
  announcementId: string
): Promise<AnnouncementTrackingSummary> {
  const announcement = await getAnnouncementByIdForHelpdesk(announcementId);
  if (!announcement) {
    return { totalRecipients: 0, confirmedCount: 0, completedCount: null };
  }

  const statuses = await getAnnouncementRecipientStatuses(announcementId);
  const confirmedCount = statuses.filter((status) => status.confirmedAt !== null).length;
  const completedCount = announcement.actionRequired
    ? statuses.filter((status) => status.completedAt !== null).length
    : null;

  return {
    totalRecipients: statuses.length,
    confirmedCount,
    completedCount,
  };
}

/**
 * 指定した会社コードに属する担当者について、未対応（`completedAt`が`null`）のまま
 * リマインドが送信されている（`reminderSentAt`が設定されている）担当者が
 * 1名以上存在するかを判定する。海外販社側のリマインド受信表示が参照する。
 */
export async function isReminderPendingForCompany(
  announcementId: string,
  companyCode: string
): Promise<boolean> {
  const announcement = await getAnnouncementByIdForHelpdesk(announcementId);
  if (!announcement?.actionRequired) {
    return false;
  }

  const statuses = await getAnnouncementRecipientStatuses(announcementId);

  return statuses.some(
    (status) =>
      status.companyCode === companyCode &&
      status.reminderSentAt !== null &&
      status.completedAt === null
  );
}

/**
 * 対象担当者へリマインドを送信したことをモックデータ上に記録する。
 * 実際の通知配信は行わない。既存のステータスレコードがない担当者については新規作成する。
 */
export async function sendAnnouncementReminders(
  announcementId: string,
  recipientIds: string[]
): Promise<void> {
  const sentAt = new Date().toISOString();

  for (const recipientId of recipientIds) {
    const existing = findStatus(announcementId, recipientId);
    if (existing) {
      existing.reminderSentAt = sentAt;
    } else {
      MOCK_ANNOUNCEMENT_RECIPIENT_STATUSES.push({
        announcementId,
        recipientId,
        confirmedAt: null,
        completedAt: null,
        reminderSentAt: sentAt,
      });
    }
  }

  return Promise.resolve();
}
