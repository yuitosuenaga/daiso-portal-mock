import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  Announcement,
  AnnouncementTargeting,
} from "@/types/announcement";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";
import type { DocumentCompanyCode } from "@/lib/constants/document-company-options";

/** 添付ファイル・ドキュメント紐づけ・言語別翻訳を含むAnnouncementレコードの読み取り時のinclude句。 */
export const ANNOUNCEMENT_INCLUDE = {
  attachments: true,
  linkedDocuments: true,
  translations: true,
} as const satisfies Prisma.AnnouncementInclude;

export type PrismaAnnouncement = Prisma.AnnouncementGetPayload<{
  include: typeof ANNOUNCEMENT_INCLUDE;
}>;

type PrismaRecipientWithCompany = Prisma.AnnouncementRecipientGetPayload<{
  include: { company: true };
}>;

type PrismaRecipientStatus = {
  confirmedAt: Date | null;
  completedAt: Date | null;
  reminderSentAt: Date | null;
};

export function mapTargeting(record: PrismaAnnouncement): AnnouncementTargeting {
  if (record.targetingScope === "countries") {
    return { scope: "countries", countries: record.targetingCountries };
  }
  return { scope: "all" };
}

export function targetingToColumns(targeting: AnnouncementTargeting): {
  targetingScope: "all" | "countries";
  targetingCountries: string[];
} {
  if (targeting.scope === "countries") {
    return { targetingScope: "countries", targetingCountries: targeting.countries };
  }
  return { targetingScope: "all", targetingCountries: [] };
}

function mapDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function mapAnnouncement(record: PrismaAnnouncement): Announcement {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    category: record.category,
    body: record.body,
    targeting: mapTargeting(record),
    actionRequired: record.actionRequired,
    publishStartDate: mapDateOnly(record.publishStartDate),
    publishEndDate: mapDateOnly(record.publishEndDate),
    dueDate: mapDateOnly(record.dueDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    attachments: record.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      dataUrl: attachment.dataUrl,
    })),
    linkedDocumentIds: record.linkedDocuments.map((link) => link.documentId),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      body: translation.body,
    })),
  };
}

export function mapRecipientStatusView(
  recipient: PrismaRecipientWithCompany,
  status: PrismaRecipientStatus | undefined
): AnnouncementRecipientStatusView {
  return {
    recipientId: recipient.id,
    companyCode: recipient.company.companyCode as DocumentCompanyCode,
    companyName: recipient.company.name,
    country: recipient.company.country,
    contactName: recipient.contactName,
    confirmedAt: status?.confirmedAt?.toISOString() ?? null,
    completedAt: status?.completedAt?.toISOString() ?? null,
    reminderSentAt: status?.reminderSentAt?.toISOString() ?? null,
  };
}

/**
 * お知らせの既定言語。翻訳データが見つからない場合、常にこの言語にフォールバックする。
 * `announcement-service.ts`・`announcement-notifications.ts`双方から参照されるため、
 * どちらにも依存しない本モジュール（mapper）に定義し、循環importを避ける。
 */
export const DEFAULT_ANNOUNCEMENT_LOCALE = "ja";

/**
 * 指定した言語に対応するお知らせのタイトル・本文を解決する。`locale`が既定言語（`ja`）の
 * ときは`announcement.title`/`body`を返す。それ以外は`announcement.translations`から
 * `locale`が一致する行を探し、見つかればその内容を、見つからなければ既定言語（`ja`）の
 * 内容にフォールバックして返す（要件31.4・33.2）。
 */
export function resolveAnnouncementContent(
  announcement: Pick<Announcement, "title" | "body" | "translations">,
  locale: string
): { title: string; body: string } {
  if (locale === DEFAULT_ANNOUNCEMENT_LOCALE) {
    return { title: announcement.title, body: announcement.body };
  }

  const translation = announcement.translations.find((item) => item.locale === locale);
  if (translation) {
    return { title: translation.title, body: translation.body };
  }

  return { title: announcement.title, body: announcement.body };
}

/**
 * 配信対象（`targeting`）でスコープされた`ApplicantUser`（通知メールの実際の宛先）を
 * 取得するための`where`条件。`announcement-service.ts`の`targetRecipientsWhere`
 * （`AnnouncementRecipient`向け）と同型のロジックを、`ApplicantUser`
 * （`company.country`経由）向けに提供する。
 */
export function targetApplicantUsersWhere(
  announcement: Pick<Announcement, "targeting">
): Prisma.ApplicantUserWhereInput {
  if (announcement.targeting.scope === "countries") {
    return { company: { country: { in: announcement.targeting.countries } } };
  }
  return {};
}
