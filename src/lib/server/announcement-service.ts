import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  addedTargetApplicantUsersWhere,
  ANNOUNCEMENT_INCLUDE,
  DEFAULT_ANNOUNCEMENT_LOCALE,
  mapAnnouncement,
  mapRecipientStatusView,
  mapUserReadStatusView,
  resolveAnnouncementContent,
  targetApplicantUsersWhere,
  targetingToColumns,
} from "@/lib/server/announcement-mapper";
import {
  notifyAnnouncementPublished,
  notifyAnnouncementReminder,
  notifyAnnouncementTargetExpanded,
  notifyAnnouncementUserReadReminder,
} from "@/lib/server/announcement-notifications";
import type {
  Announcement,
  AnnouncementTargeting,
  CreateAnnouncementInput,
} from "@/types/announcement";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementTrackingSummary,
  AnnouncementUserReadStatusView,
} from "@/types/announcement-recipient";

// `resolveAnnouncementContent`・`targetApplicantUsersWhere`は`announcement-mapper.ts`
// （サービス層に依存しないleafモジュール）に定義されている（`announcement-notifications.ts`
// との循環importを避けるため）。本モジュールの公開APIとしては引き続きここから再エクスポートする。
export { resolveAnnouncementContent, targetApplicantUsersWhere };

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

/**
 * `translations`配列（`en`必須＋任意追加言語）をPrismaのネスト書き込み形状に変換する。
 * `en`行を必ず1件含み、それ以外の行は渡された内容で全置換する方針のため、常に
 * `deleteMany`（既存の全翻訳行を削除）＋`create`（渡された内容を作り直す）で表現する。
 */
function translationsToNestedWrite(translations: Announcement["translations"]) {
  return {
    deleteMany: {},
    create: translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      body: translation.body,
    })),
  };
}

/**
 * 自社の国が配信対象に含まれるお知らせのみを公開日の降順で取得する。`locale`に対応する
 * タイトル・本文（要件16、未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function listAnnouncementsVisibleToCountry(
  country: string,
  locale: string = DEFAULT_ANNOUNCEMENT_LOCALE
): Promise<Announcement[]> {
  const records = await prisma.announcement.findMany({
    where: visibleToCountryWhere(country),
    orderBy: ORDER_BY_PUBLISHED_AT_DESC,
    include: ANNOUNCEMENT_INCLUDE,
  });

  const now = new Date();
  return records
    .map(mapAnnouncement)
    .filter((item) => isWithinPublishPeriod(item, now))
    .map((item) => ({ ...item, ...resolveAnnouncementContent(item, locale) }));
}

/**
 * 指定したIDのお知らせを1件取得する。自社の国が配信対象に含まれない、
 * または該当データが存在しない場合はnullを返す。`locale`に対応するタイトル・本文
 * （要件16、未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function findAnnouncementVisibleToCountry(
  id: string,
  country: string,
  locale: string = DEFAULT_ANNOUNCEMENT_LOCALE
): Promise<Announcement | null> {
  const record = await prisma.announcement.findFirst({
    where: { id, ...visibleToCountryWhere(country) },
    include: ANNOUNCEMENT_INCLUDE,
  });
  if (!record) {
    return null;
  }

  const announcement = mapAnnouncement(record);
  if (!isWithinPublishPeriod(announcement, new Date())) {
    return null;
  }

  return { ...announcement, ...resolveAnnouncementContent(announcement, locale) };
}

/**
 * 配信対象による絞り込みを行わず、お知らせ全件を作成日時の降順で取得する。
 * 下書きは`publishedAt`が未設定のため、公開日ではなく作成日時を並び順の基準とする。
 */
export async function listAllAnnouncements(): Promise<Announcement[]> {
  const records = await prisma.announcement.findMany({
    orderBy: ORDER_BY_CREATED_AT_DESC,
    include: ANNOUNCEMENT_INCLUDE,
  });

  return records.map(mapAnnouncement);
}

/** 配信対象による絞り込みを行わず、指定したIDのお知らせを1件取得する。 */
export async function findAnnouncementById(id: string): Promise<Announcement | null> {
  const record = await prisma.announcement.findUnique({
    where: { id },
    include: ANNOUNCEMENT_INCLUDE,
  });

  return record ? mapAnnouncement(record) : null;
}

/**
 * 指定したIDのうち、実在する`Document`のIDのみを返す。存在しない・削除済みのIDは
 * 無言で除外する（ドキュメント紐づけの保存時にFK違反を防ぐための事前確認）。
 */
async function filterExistingDocumentIds(documentIds: string[]): Promise<string[]> {
  if (documentIds.length === 0) {
    return [];
  }
  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: { id: true },
  });
  const existingIds = new Set(documents.map((document) => document.id));
  return documentIds.filter((id) => existingIds.has(id));
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
  const linkedDocumentIds = await filterExistingDocumentIds(input.linkedDocumentIds);

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
      attachments: {
        create: input.attachments.map((attachment) => ({
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
          dataUrl: attachment.dataUrl,
        })),
      },
      linkedDocuments: {
        create: linkedDocumentIds.map((documentId) => ({ documentId })),
      },
      translations: {
        create: input.translations.map((translation) => ({
          locale: translation.locale,
          title: translation.title,
          body: translation.body,
        })),
      },
    },
    include: ANNOUNCEMENT_INCLUDE,
  });

  const announcement = mapAnnouncement(record);
  if (announcement.status === "published") {
    await notifyAnnouncementPublished(announcement.id);
  }

  return announcement;
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
    select: { status: true, targetingScope: true, targetingCountries: true },
  });
  if (!current) {
    throw new AnnouncementNotFoundError(id);
  }

  const previousTargeting: AnnouncementTargeting =
    current.targetingScope === "countries"
      ? { scope: "countries", countries: current.targetingCountries }
      : { scope: "all" };

  const shouldStampPublishedAt = current.status !== "published" && input.status === "published";
  const linkedDocumentIds = await filterExistingDocumentIds(input.linkedDocumentIds);

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
        attachments: {
          deleteMany: {},
          create: input.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            dataUrl: attachment.dataUrl,
          })),
        },
        linkedDocuments: {
          deleteMany: {},
          create: linkedDocumentIds.map((documentId) => ({ documentId })),
        },
        translations: translationsToNestedWrite(input.translations),
      },
      include: ANNOUNCEMENT_INCLUDE,
    });

    const announcement = mapAnnouncement(record);
    if (shouldStampPublishedAt) {
      // 下書き→公開への遷移では、既存の公開通知が全対象者へ通知するため、
      // 配信対象拡大の追加通知は行わない（要件35.6、二重送信防止）。
      await notifyAnnouncementPublished(announcement.id);
    } else if (announcement.status === "published") {
      // 公開のまま保存された場合のみ、配信対象の拡大差分を検出し、
      // 新規追加分の対象者にのみ追加通知を送る（要件35.1, 35.2, 35.7）。
      const addedWhere = addedTargetApplicantUsersWhere(
        { targeting: previousTargeting },
        { targeting: announcement.targeting }
      );
      if (addedWhere) {
        await notifyAnnouncementTargetExpanded(announcement.id, addedWhere);
      }
    }

    return announcement;
  } catch (error) {
    if (error instanceof AnnouncementNotFoundError) {
      throw error;
    }
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
 * あるお知らせの確認済みトラッキング対象母集団（配信対象の国に属し`isActive: true`の
 * `ApplicantUser`。`targetApplicantUsersWhere`と同一の対象定義、要件39.2）を、
 * 個人受信レシート（`AnnouncementReadReceipt`）と左外部結合した一覧を返す（要件39.4）。
 * 該当お知らせが存在しない場合は空配列を返す。無効化された`ApplicantUser`は含まれない。
 */
export async function getAnnouncementUserReadStatuses(
  announcementId: string
): Promise<AnnouncementUserReadStatusView[]> {
  const announcement = await findAnnouncementById(announcementId);
  if (!announcement) {
    return [];
  }

  const applicantUsers = await prisma.applicantUser.findMany({
    where: targetApplicantUsersWhere(announcement),
    include: {
      company: true,
      announcementReadReceipts: { where: { announcementId } },
    },
  });

  return applicantUsers.map((applicantUser) =>
    mapUserReadStatusView(applicantUser, applicantUser.announcementReadReceipts[0])
  );
}

/**
 * 指定した`ApplicantUser`本人の、あるお知らせに対する確認済み（既読）日時を返す。
 * 受信レシートが存在しない場合は`null`（未確認）を返す。
 */
export async function getUserSelfConfirmation(
  announcementId: string,
  applicantUserId: string
): Promise<string | null> {
  const receipt = await prisma.announcementReadReceipt.findUnique({
    where: { announcementId_applicantUserId: { announcementId, applicantUserId } },
  });

  return receipt?.confirmedAt ? receipt.confirmedAt.toISOString() : null;
}

/**
 * 指定した`ApplicantUser`本人の受信レシートにのみ確認済み日時を記録する。
 * 同一会社の他の`ApplicantUser`の既読状態は変更しない（要件39.3）。既に確認済みの場合、
 * 記録時刻は上書きしない。
 */
export async function recordUserConfirmation(
  announcementId: string,
  applicantUserId: string
): Promise<void> {
  const existing = await prisma.announcementReadReceipt.findUnique({
    where: { announcementId_applicantUserId: { announcementId, applicantUserId } },
  });
  if (existing?.confirmedAt) {
    return;
  }

  await prisma.announcementReadReceipt.upsert({
    where: { announcementId_applicantUserId: { announcementId, applicantUserId } },
    update: { confirmedAt: new Date() },
    create: { announcementId, applicantUserId, confirmedAt: new Date() },
  });
}

/**
 * 対象の`ApplicantUser`のうち未確認の者へ、個人単位の既読リマインドを送信したことを
 * 受信レシートに記録し（`readReminderSentAt`）、対象者のメール宛にリマインドを送信する
 * （要件39.6）。受信レシートが未生成の場合は`confirmedAt: null`のまま新規作成する。
 * 既に確認済み（`confirmedAt`非`null`）の`ApplicantUser`はリマインド対象・記録の両方から
 * 除外する（要件39.6, 42.2）。空配列を渡した場合は何もしない。
 */
export async function sendUserReadReminders(
  announcementId: string,
  applicantUserIds: string[]
): Promise<void> {
  if (applicantUserIds.length === 0) {
    return;
  }

  const applicantUsers = await prisma.applicantUser.findMany({
    where: { id: { in: applicantUserIds } },
    include: { announcementReadReceipts: { where: { announcementId } } },
  });

  const targets = applicantUsers.filter(
    (applicantUser) => !applicantUser.announcementReadReceipts[0]?.confirmedAt
  );
  if (targets.length === 0) {
    return;
  }

  const sentAt = new Date();
  await Promise.all(
    targets.map((applicantUser) =>
      prisma.announcementReadReceipt.upsert({
        where: {
          announcementId_applicantUserId: {
            announcementId,
            applicantUserId: applicantUser.id,
          },
        },
        update: { readReminderSentAt: sentAt },
        create: {
          announcementId,
          applicantUserId: applicantUser.id,
          readReminderSentAt: sentAt,
        },
      })
    )
  );

  await notifyAnnouncementUserReadReminder(
    announcementId,
    targets.map((applicantUser) => ({
      email: applicantUser.email,
      preferredLocale: applicantUser.preferredLocale,
    }))
  );
}

/**
 * 指定したお知らせの確認済み（人数ベース）・実施済み（会社ベース）人数を集計する。
 * 確認済みの分母は対象`ApplicantUser`数、実施済みの分母は対象会社数であり、単位・分母が
 * 異なる（要件39.2, 40.2）。`actionRequired`が偽のお知らせでは`completedCount`は`null`を返す。
 */
export async function getAnnouncementTrackingSummary(
  announcementId: string
): Promise<AnnouncementTrackingSummary> {
  const announcement = await findAnnouncementById(announcementId);
  if (!announcement) {
    return { totalRecipientUsers: 0, confirmedCount: 0, totalCompanies: 0, completedCount: null };
  }

  const [userReadStatuses, companyStatuses] = await Promise.all([
    getAnnouncementUserReadStatuses(announcementId),
    getAnnouncementRecipientStatuses(announcementId),
  ]);

  const confirmedCount = userReadStatuses.filter((status) => status.confirmedAt !== null).length;
  const completedCount = announcement.actionRequired
    ? companyStatuses.filter((status) => status.completedAt !== null).length
    : null;

  return {
    totalRecipientUsers: userReadStatuses.length,
    confirmedCount,
    totalCompanies: companyStatuses.length,
    completedCount,
  };
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
  if (recipientIds.length === 0) {
    return;
  }

  const sentAt = new Date();

  const [recipients] = await Promise.all([
    prisma.announcementRecipient.findMany({
      where: { id: { in: recipientIds } },
      include: { company: true },
    }),
    Promise.all(
      recipientIds.map((recipientId) =>
        prisma.announcementRecipientStatus.upsert({
          where: { announcementId_recipientId: { announcementId, recipientId } },
          update: { reminderSentAt: sentAt },
          create: { announcementId, recipientId, reminderSentAt: sentAt },
        })
      )
    ),
  ]);

  const companyCodes = Array.from(
    new Set(recipients.map((recipient) => recipient.company.companyCode))
  );
  await notifyAnnouncementReminder(announcementId, companyCodes);
}

/**
 * 指定した会社かつ、お知らせの配信対象（`targeting`）に含まれる担当者のみを取得する。
 * 該当お知らせが存在しない場合は空配列を返す。
 */
async function findTargetRecipientsForCompany(
  announcement: Pick<Announcement, "targeting">,
  announcementId: string,
  companyCode: string
) {
  return prisma.announcementRecipient.findMany({
    where: {
      AND: [targetRecipientsWhere(announcement), { company: { companyCode } }],
    },
    include: {
      statuses: { where: { announcementId } },
    },
  });
}

/**
 * 対応要否（`actionRequired`）が真のお知らせについてのみ、指定した会社かつ配信対象に
 * 含まれる担当者全員の実施済み日時を記録する。対応要否が偽のお知らせに対しては
 * 何も記録しない。既に実施済みの担当者の記録時刻は上書きしない。実施済み（対応完了）は
 * 引き続き会社単位のまま（要件40.4、確認済みの個人単位化の対象外）。
 */
export async function recordCompanyCompletion(
  announcementId: string,
  companyCode: string
): Promise<void> {
  const announcement = await findAnnouncementById(announcementId);
  if (!announcement?.actionRequired) {
    return;
  }

  const recipients = await findTargetRecipientsForCompany(
    announcement,
    announcementId,
    companyCode
  );
  const unrecorded = recipients.filter((recipient) => !recipient.statuses[0]?.completedAt);

  const recordedAt = new Date();
  await Promise.all(
    unrecorded.map((recipient) =>
      prisma.announcementRecipientStatus.upsert({
        where: {
          announcementId_recipientId: { announcementId, recipientId: recipient.id },
        },
        update: { completedAt: recordedAt },
        create: { announcementId, recipientId: recipient.id, completedAt: recordedAt },
      })
    )
  );
}

/**
 * 指定した会社かつ配信対象に含まれる担当者全員が実施済みのときのみ、対応完了日時を返す。
 * 1人でも未記録の担当者がいる場合、または対象担当者が1人も存在しない場合は`null`を返す。
 * 確認済み（既読）は個人単位化されたため本関数では扱わない（`getUserSelfConfirmation`が担う。
 * 要件18.3）。
 */
export async function getAnnouncementSelfStatusForCompany(
  announcementId: string,
  companyCode: string
): Promise<{ completedAt: string | null }> {
  const announcement = await findAnnouncementById(announcementId);
  if (!announcement) {
    return { completedAt: null };
  }

  const recipients = await findTargetRecipientsForCompany(
    announcement,
    announcementId,
    companyCode
  );
  if (recipients.length === 0) {
    return { completedAt: null };
  }

  const statuses = recipients.map((recipient) => recipient.statuses[0]);
  const allCompleted = statuses.every((status) => status?.completedAt);

  return {
    completedAt: allCompleted ? statuses[0]!.completedAt!.toISOString() : null,
  };
}
