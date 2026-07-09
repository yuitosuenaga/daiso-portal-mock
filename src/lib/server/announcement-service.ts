import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  mapAnnouncement,
  mapRecipientStatusView,
  targetingToColumns,
} from "@/lib/server/announcement-mapper";
import type {
  Announcement,
  CreateAnnouncementInput,
} from "@/types/announcement";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementTrackingSummary,
} from "@/types/announcement-recipient";

export class AnnouncementNotFoundError extends Error {
  constructor(announcementId: string) {
    super(`Announcement not found: ${announcementId}`);
    this.name = "AnnouncementNotFoundError";
  }
}

const ORDER_BY_PUBLISHED_AT_DESC = { publishedAt: "desc" } as const;

function visibleToCountryWhere(country: string): Prisma.AnnouncementWhereInput {
  return {
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
    ],
  };
}

/** 配信対象（`targeting`）でスコープされた担当者を、所属会社込みで取得する。 */
function targetRecipientsWhere(
  announcement: Pick<Announcement, "targeting">
): Prisma.AnnouncementRecipientWhereInput {
  if (announcement.targeting.scope === "countries") {
    return { company: { country: { in: announcement.targeting.countries } } };
  }
  return {};
}

/** 自社の国が配信対象に含まれるお知らせのみを公開日の降順で取得する。 */
export async function listAnnouncementsVisibleToCountry(
  country: string
): Promise<Announcement[]> {
  const records = await prisma.announcement.findMany({
    where: visibleToCountryWhere(country),
    orderBy: ORDER_BY_PUBLISHED_AT_DESC,
  });

  return records.map(mapAnnouncement);
}

/**
 * 指定したIDのお知らせを1件取得する。自社の国が配信対象に含まれない、
 * または該当データが存在しない場合はnullを返す。
 */
export async function findAnnouncementVisibleToCountry(
  id: string,
  country: string
): Promise<Announcement | null> {
  const record = await prisma.announcement.findFirst({
    where: { id, ...visibleToCountryWhere(country) },
  });

  return record ? mapAnnouncement(record) : null;
}

/** 配信対象による絞り込みを行わず、お知らせ全件を公開日の降順で取得する。 */
export async function listAllAnnouncements(): Promise<Announcement[]> {
  const records = await prisma.announcement.findMany({
    orderBy: ORDER_BY_PUBLISHED_AT_DESC,
  });

  return records.map(mapAnnouncement);
}

/** 配信対象による絞り込みを行わず、指定したIDのお知らせを1件取得する。 */
export async function findAnnouncementById(id: string): Promise<Announcement | null> {
  const record = await prisma.announcement.findUnique({ where: { id } });

  return record ? mapAnnouncement(record) : null;
}

/** お知らせを新規作成する。公開日時は保存操作を行った時刻とする。 */
export async function createAnnouncementRecord(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const record = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      actionRequired: input.actionRequired,
      ...targetingToColumns(input.targeting),
    },
  });

  return mapAnnouncement(record);
}

/** 既存お知らせの内容を更新する。存在しない場合は`AnnouncementNotFoundError`を送出する。 */
export async function updateAnnouncementRecord(
  id: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  try {
    const record = await prisma.announcement.update({
      where: { id },
      data: {
        title: input.title,
        body: input.body,
        category: input.category,
        actionRequired: input.actionRequired,
        ...targetingToColumns(input.targeting),
      },
    });

    return mapAnnouncement(record);
  } catch {
    throw new AnnouncementNotFoundError(id);
  }
}

/** お知らせを削除する。存在しない場合は`AnnouncementNotFoundError`を送出する。 */
export async function deleteAnnouncementRecord(id: string): Promise<void> {
  try {
    await prisma.announcement.delete({ where: { id } });
  } catch {
    throw new AnnouncementNotFoundError(id);
  }
}

/**
 * 指定したお知らせの配信対象でスコープされた担当者について、確認済み・実施済み・
 * リマインド送信状態を結合した一覧を返す。該当お知らせが存在しない場合は空配列を返す。
 */
export async function getAnnouncementRecipientStatuses(
  announcementId: string
): Promise<AnnouncementRecipientStatusView[]> {
  const announcement = await findAnnouncementById(announcementId);
  if (!announcement) {
    return [];
  }

  const recipients = await prisma.announcementRecipient.findMany({
    where: targetRecipientsWhere(announcement),
    include: {
      company: true,
      statuses: { where: { announcementId } },
    },
  });

  return recipients.map((recipient) =>
    mapRecipientStatusView(recipient, recipient.statuses[0])
  );
}

/**
 * 指定したお知らせの確認済み・実施済み人数を集計する。
 * `actionRequired`が偽のお知らせでは`completedCount`は`null`を返す。
 */
export async function getAnnouncementTrackingSummary(
  announcementId: string
): Promise<AnnouncementTrackingSummary> {
  const announcement = await findAnnouncementById(announcementId);
  if (!announcement) {
    return { totalRecipients: 0, confirmedCount: 0, completedCount: null };
  }

  const statuses = await getAnnouncementRecipientStatuses(announcementId);
  const confirmedCount = statuses.filter((status) => status.confirmedAt !== null).length;
  const completedCount = announcement.actionRequired
    ? statuses.filter((status) => status.completedAt !== null).length
    : null;

  return { totalRecipients: statuses.length, confirmedCount, completedCount };
}

/**
 * 指定した会社コードに属する担当者について、未対応のまま
 * リマインドが送信されている担当者が1名以上存在するかを判定する。
 */
export async function isReminderPendingForCompany(
  announcementId: string,
  companyCode: string
): Promise<boolean> {
  const announcement = await findAnnouncementById(announcementId);
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
 * 対象担当者へリマインドを送信したことを記録する。既存のステータスレコードがない
 * 担当者については新規作成する。
 */
export async function sendAnnouncementReminders(
  announcementId: string,
  recipientIds: string[]
): Promise<void> {
  const sentAt = new Date();

  await Promise.all(
    recipientIds.map((recipientId) =>
      prisma.announcementRecipientStatus.upsert({
        where: { announcementId_recipientId: { announcementId, recipientId } },
        update: { reminderSentAt: sentAt },
        create: { announcementId, recipientId, reminderSentAt: sentAt },
      })
    )
  );
}
