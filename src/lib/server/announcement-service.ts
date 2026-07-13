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
const ORDER_BY_CREATED_AT_DESC = { createdAt: "desc" } as const;

function visibleToCountryWhere(country: string): Prisma.AnnouncementWhereInput {
  return {
    status: "published",
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
    ],
  };
}

function parseDateOnlyStartOfDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseDateOnlyEndOfDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/** 公開開始日・終了日を基準に、現在時刻が公開期間内かどうかを判定する。 */
function isWithinPublishPeriod(announcement: Announcement, referenceDate: Date): boolean {
  if (announcement.publishStartDate) {
    if (referenceDate < parseDateOnlyStartOfDay(announcement.publishStartDate)) {
      return false;
    }
  }
  if (announcement.publishEndDate) {
    if (referenceDate > parseDateOnlyEndOfDay(announcement.publishEndDate)) {
      return false;
    }
  }
  return true;
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

  const now = new Date();
  return records.map(mapAnnouncement).filter((item) => isWithinPublishPeriod(item, now));
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
  if (!record) {
    return null;
  }

  const announcement = mapAnnouncement(record);
  return isWithinPublishPeriod(announcement, new Date()) ? announcement : null;
}

/**
 * 配信対象による絞り込みを行わず、お知らせ全件を作成日時の降順で取得する。
 * 下書きは`publishedAt`が未設定のため、公開日ではなく作成日時を並び順の基準とする。
 */
export async function listAllAnnouncements(): Promise<Announcement[]> {
  const records = await prisma.announcement.findMany({
    orderBy: ORDER_BY_CREATED_AT_DESC,
  });

  return records.map(mapAnnouncement);
}

/** 配信対象による絞り込みを行わず、指定したIDのお知らせを1件取得する。 */
export async function findAnnouncementById(id: string): Promise<Announcement | null> {
  const record = await prisma.announcement.findUnique({ where: { id } });

  return record ? mapAnnouncement(record) : null;
}

function dateOnlyToColumn(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * お知らせを新規作成する。公開状態が「公開」の場合、公開日時は保存操作を行った時刻とする。
 * 「下書き」の場合、公開日時は未設定のまま保存する。
 */
export async function createAnnouncementRecord(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const record = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      status: input.status,
      publishedAt: input.status === "published" ? new Date() : null,
      actionRequired: input.actionRequired,
      ...targetingToColumns(input.targeting),
      publishStartDate: dateOnlyToColumn(input.publishStartDate),
      publishEndDate: dateOnlyToColumn(input.publishEndDate),
      dueDate: dateOnlyToColumn(input.dueDate),
    },
  });

  return mapAnnouncement(record);
}

/**
 * 既存お知らせの内容を更新する。存在しない場合は`AnnouncementNotFoundError`を送出する。
 * 公開状態が「下書き」から「公開」へ変わったときのみ、公開日時を保存操作を行った時刻で
 * 上書きする。それ以外（公開のまま、または公開から下書きへの差し戻し）では公開日時を変更しない。
 */
export async function updateAnnouncementRecord(
  id: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const current = await prisma.announcement.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) {
    throw new AnnouncementNotFoundError(id);
  }

  const shouldStampPublishedAt = current.status !== "published" && input.status === "published";

  try {
    const record = await prisma.announcement.update({
      where: { id },
      data: {
        title: input.title,
        body: input.body,
        category: input.category,
        status: input.status,
        ...(shouldStampPublishedAt ? { publishedAt: new Date() } : {}),
        actionRequired: input.actionRequired,
        ...targetingToColumns(input.targeting),
        publishStartDate: dateOnlyToColumn(input.publishStartDate),
        publishEndDate: dateOnlyToColumn(input.publishEndDate),
        dueDate: dateOnlyToColumn(input.dueDate),
      },
    });

    return mapAnnouncement(record);
  } catch {
    throw new AnnouncementNotFoundError(id);
  }
}

/**
 * お知らせを削除する。存在しない場合は`AnnouncementNotFoundError`を送出する。
 * 確認済み・実施済み・リマインド送信状態（`AnnouncementRecipientStatus`）は
 * `onDelete: Restrict`のため、削除前に関連レコードを同一トランザクションで先に削除する。
 */
export async function deleteAnnouncementRecord(id: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.announcementRecipientStatus.deleteMany({ where: { announcementId: id } }),
      prisma.announcement.delete({ where: { id } }),
    ]);
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
