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
 * `locale`が一致する行を探し、見つかればその内容を返す。一致する翻訳が無い場合、
 * 20か国以上へ発信する本ポータルの共通語である`en`翻訳を優先してフォールバックし、
 * `en`翻訳も無い場合にのみ既定言語（`ja`）の内容にフォールバックする
 * （要件31.4・33.2を要件36で上書き。フォールバック順序: `locale`一致 → `en` → `ja`）。
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

  const enTranslation = announcement.translations.find((item) => item.locale === "en");
  if (enTranslation) {
    return { title: enTranslation.title, body: enTranslation.body };
  }

  return { title: announcement.title, body: announcement.body };
}

/**
 * 配信対象（`targeting`）でスコープされた`ApplicantUser`（通知メールの実際の宛先）を
 * 取得するための`where`条件。`announcement-service.ts`の`targetRecipientsWhere`
 * （`AnnouncementRecipient`向け）と同型のロジックを、`ApplicantUser`
 * （`company.country`経由）向けに提供する。
 *
 * ヘルプデスクが無効化した申請者アカウント（`isActive: false`、`helpdesk-account-management`
 * specで追加）は、配信対象の国・会社に関わらず常に通知メール送信対象から除外する
 * （既知バグ修正: 無効化済みアカウントへ誤って通知が送信されないようにするため）。
 */
export function targetApplicantUsersWhere(
  announcement: Pick<Announcement, "targeting">
): Prisma.ApplicantUserWhereInput {
  if (announcement.targeting.scope === "countries") {
    return {
      isActive: true,
      company: { country: { in: announcement.targeting.countries } },
    };
  }
  return { isActive: true };
}

/**
 * 公開済みお知らせの編集前後の`targeting`を比較し、「新たに配信対象へ含まれることに
 * なった国」に属する有効な`ApplicantUser`を表す`where`を算出する（要件35）。
 * 新規追加が生じないケース（編集前が既に`all`、縮小、同一）では`null`を返し、
 * 呼び出し元（`updateAnnouncementRecord`）が追加通知の送信自体をスキップできるようにする。
 *
 * `announcement-service.ts`・`announcement-notifications.ts`双方から参照されうるため、
 * 循環importを避けるべく本モジュール（leafモジュール）に置く。
 */
export function addedTargetApplicantUsersWhere(
  previous: Pick<Announcement, "targeting">,
  next: Pick<Announcement, "targeting">
): Prisma.ApplicantUserWhereInput | null {
  const previousTargeting = previous.targeting;
  const nextTargeting = next.targeting;

  // 編集前から全体一律（all）だった場合、既に全受信者が対象であり新規追加は生じ得ない（要件35.3）。
  if (previousTargeting.scope === "all") {
    return null;
  }

  // 編集前が特定国（countries）、編集後が全体一律（all）へ変更された場合、
  // 編集前の対象国に含まれていなかった国が新規追加分となる（要件35.4）。
  if (nextTargeting.scope === "all") {
    return {
      isActive: true,
      company: { country: { notIn: previousTargeting.countries } },
    };
  }

  // 両者とも特定国（countries）の場合、差集合（編集後にのみ含まれる国）が新規追加分となる。
  // 差集合が空（縮小・同一）であれば新規追加は生じない（要件35.5）。
  const addedCountries = nextTargeting.countries.filter(
    (country) => !previousTargeting.countries.includes(country)
  );
  if (addedCountries.length === 0) {
    return null;
  }
  return {
    isActive: true,
    company: { country: { in: addedCountries } },
  };
}
