import "server-only";

import { COUNTRY_CONTENT_LANGUAGE } from "@/lib/constants/translation-languages";

import type { Prisma } from "@prisma/client";

import type {
  Announcement,
  AnnouncementSummary,
  AnnouncementTargeting,
} from "@/types/announcement";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementUserReadStatusView,
} from "@/types/announcement-recipient";
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

/**
 * 一覧用のinclude句。添付は本体（`dataUrl`、Base64で最大数MB）を読み込まず、メタデータ
 * だけを`select`する。一覧画面は添付本体を使わないため、行数に比例するDB転送量を避ける。
 */
export const ANNOUNCEMENT_LIST_INCLUDE = {
  attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true } },
  linkedDocuments: true,
  translations: true,
} as const satisfies Prisma.AnnouncementInclude;

export type PrismaAnnouncementSummary = Prisma.AnnouncementGetPayload<{
  include: typeof ANNOUNCEMENT_LIST_INCLUDE;
}>;

/**
 * 配信対象・対応要否の判定だけが必要な処理（トラッキング集計など）用のselect句。
 * 添付・翻訳・本文を読み込まない。
 */
export const ANNOUNCEMENT_TARGETING_SELECT = {
  id: true,
  actionRequired: true,
  targetingScope: true,
  targetingCountries: true,
  targetingUserIds: true,
  targetingCompanyIds: true,
} as const satisfies Prisma.AnnouncementSelect;

export type PrismaAnnouncementTargeting = Prisma.AnnouncementGetPayload<{
  select: typeof ANNOUNCEMENT_TARGETING_SELECT;
}>;

type PrismaRecipientWithCompany = Prisma.AnnouncementRecipientGetPayload<{
  include: { company: true };
}>;

type PrismaRecipientStatus = {
  completedAt: Date | null;
  reminderSentAt: Date | null;
};

type PrismaApplicantUserWithCompany = {
  id: string;
  displayName: string;
  email: string;
  company: { companyCode: string; name: string; country: string };
};

type PrismaReadReceipt = {
  confirmedAt: Date | null;
  readReminderSentAt: Date | null;
  confirmers?: { name: string; confirmedAt: Date }[];
};

export function mapTargeting(
  record: Pick<
    PrismaAnnouncement,
    "targetingScope" | "targetingCountries" | "targetingUserIds" | "targetingCompanyIds"
  >
): AnnouncementTargeting {
  if (record.targetingScope === "countries") {
    return { scope: "countries", countries: record.targetingCountries };
  }
  if (record.targetingScope === "users") {
    return {
      scope: "users",
      userIds: record.targetingUserIds,
      companyIds: record.targetingCompanyIds,
    };
  }
  return { scope: "all" };
}

export function targetingToColumns(targeting: AnnouncementTargeting): {
  targetingScope: "all" | "countries" | "users";
  targetingCountries: string[];
  targetingUserIds: string[];
  targetingCompanyIds: string[];
} {
  if (targeting.scope === "countries") {
    return {
      targetingScope: "countries",
      targetingCountries: targeting.countries,
      targetingUserIds: [],
      targetingCompanyIds: [],
    };
  }
  if (targeting.scope === "users") {
    return {
      targetingScope: "users",
      targetingCountries: [],
      targetingUserIds: targeting.userIds,
      targetingCompanyIds: targeting.companyIds,
    };
  }
  return {
    targetingScope: "all",
    targetingCountries: [],
    targetingUserIds: [],
    targetingCompanyIds: [],
  };
}

function mapDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function mapAnnouncementBase(
  record: Omit<PrismaAnnouncementSummary, "attachments">
): Omit<Announcement, "attachments"> {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    category: record.category,
    body: record.body,
    targeting: mapTargeting(record),
    actionRequired: record.actionRequired,
    sendEmailNotification: record.sendEmailNotification,
    publishStartDate: mapDateOnly(record.publishStartDate),
    publishEndDate: mapDateOnly(record.publishEndDate),
    publishStartTime: record.publishStartTime,
    publishEndTime: record.publishEndTime,
    dueDate: mapDateOnly(record.dueDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    linkedDocumentIds: record.linkedDocuments.map((link) => link.documentId),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      body: translation.body,
      source: translation.source,
      sourceHash: translation.sourceHash ?? undefined,
    })),
  };
}

export function mapAnnouncement(record: PrismaAnnouncement): Announcement {
  return {
    ...mapAnnouncementBase(record),
    attachments: record.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      dataUrl: attachment.dataUrl,
    })),
  };
}

/** 一覧用。添付はメタデータのみ（`dataUrl`を読み込まず、出力にも含めない）。 */
export function mapAnnouncementSummary(record: PrismaAnnouncementSummary): AnnouncementSummary {
  return {
    ...mapAnnouncementBase(record),
    attachments: record.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
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
    completedAt: status?.completedAt?.toISOString() ?? null,
    reminderSentAt: status?.reminderSentAt?.toISOString() ?? null,
  };
}

/**
 * 確認済みトラッキング対象母集団の`ApplicantUser`1名分と、その個人受信レシート
 * （`AnnouncementReadReceipt`）を結合したビューへ変換する（要件39.4）。
 * レシートが未生成（`status`が`undefined`）の場合は「未確認・既読リマインド未送信」を表す。
 */
export function mapUserReadStatusView(
  applicantUser: PrismaApplicantUserWithCompany,
  status: PrismaReadReceipt | undefined
): AnnouncementUserReadStatusView {
  return {
    applicantUserId: applicantUser.id,
    displayName: applicantUser.displayName,
    email: applicantUser.email,
    companyCode: applicantUser.company.companyCode as DocumentCompanyCode,
    companyName: applicantUser.company.name,
    country: applicantUser.company.country,
    confirmedAt: status?.confirmedAt?.toISOString() ?? null,
    readReminderSentAt: status?.readReminderSentAt?.toISOString() ?? null,
    confirmers: (status?.confirmers ?? []).map((confirmer) => ({
      name: confirmer.name,
      confirmedAt: confirmer.confirmedAt.toISOString(),
    })),
  };
}

type BulkTrackingRecipient = PrismaRecipientWithCompany & {
  statuses: (PrismaRecipientStatus & { announcementId: string })[];
};

type BulkTrackingUser = PrismaApplicantUserWithCompany & {
  isActive: boolean;
  companyId: string;
  announcementReadReceipts: (PrismaReadReceipt & { announcementId: string })[];
};

/**
 * ヘルプデスクのお知らせ管理一覧向けに、複数のお知らせ分の「会社単位の実施済み状況」と
 * 「個人単位の確認済み状況」を、あらかじめ一括取得した行から振り分けて組み立てる（N+1の解消用）。
 *
 * 各お知らせの母集団の定義は、1件ずつ取得する`getAnnouncementRecipientStatuses`
 * （`targetRecipientsWhere`）・`getAnnouncementUserReadStatuses`（`targetApplicantUsersWhere`）
 * と同一:
 * - 会社単位: `countries`は会社の国が一致、`users`は指定会社、または指定個人が（無効化済みを含めて）
 *   所属する会社の担当者、`all`は全担当者。
 * - 個人単位: 有効（`isActive`）な申請者のうち、`countries`は所属会社の国が一致、`users`は指定個人または
 *   指定会社の所属者、`all`は全員。
 */
export function buildAnnouncementTrackingViews(
  announcements: { id: string; targeting: AnnouncementTargeting }[],
  recipients: BulkTrackingRecipient[],
  users: BulkTrackingUser[]
): {
  recipientStatuses: Record<string, AnnouncementRecipientStatusView[]>;
  userReadStatuses: Record<string, AnnouncementUserReadStatusView[]>;
} {
  const userIdsByCompanyId = new Map<string, Set<string>>();
  for (const user of users) {
    const ids = userIdsByCompanyId.get(user.companyId) ?? new Set<string>();
    ids.add(user.id);
    userIdsByCompanyId.set(user.companyId, ids);
  }

  const recipientStatuses: Record<string, AnnouncementRecipientStatusView[]> = {};
  const userReadStatuses: Record<string, AnnouncementUserReadStatusView[]> = {};

  for (const { id, targeting } of announcements) {
    recipientStatuses[id] = recipients
      .filter((recipient) => {
        if (targeting.scope === "countries") {
          return targeting.countries.includes(recipient.company.country);
        }
        if (targeting.scope === "users") {
          if (targeting.companyIds.includes(recipient.companyId)) {
            return true;
          }
          const companyUserIds = userIdsByCompanyId.get(recipient.companyId);
          return targeting.userIds.some((userId) => companyUserIds?.has(userId));
        }
        return true;
      })
      .map((recipient) =>
        mapRecipientStatusView(
          recipient,
          recipient.statuses.find((status) => status.announcementId === id)
        )
      );

    userReadStatuses[id] = users
      .filter((user) => {
        if (!user.isActive) {
          return false;
        }
        if (targeting.scope === "countries") {
          return targeting.countries.includes(user.company.country);
        }
        if (targeting.scope === "users") {
          return targeting.userIds.includes(user.id) || targeting.companyIds.includes(user.companyId);
        }
        return true;
      })
      .map((user) =>
        mapUserReadStatusView(
          user,
          user.announcementReadReceipts.find((receipt) => receipt.announcementId === id)
        )
      );
  }

  return { recipientStatuses, userReadStatuses };
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
  locale: string,
  country?: string
): { title: string; body: string } {
  if (locale === DEFAULT_ANNOUNCEMENT_LOCALE) {
    return { title: announcement.title, body: announcement.body };
  }

  // UI言語が`en`のままのときに限り、閲覧者の国の言語に翻訳があればそれを本文として優先する。
  // `en`以外のUI言語（th・vi等）を選んでいる場合は、選択した言語を国の言語より優先する。
  const countryLanguage =
    country && locale === "en" ? COUNTRY_CONTENT_LANGUAGE[country.toUpperCase()] : undefined;
  if (countryLanguage) {
    const countryTranslation = announcement.translations.find(
      (item) => item.locale.toLowerCase() === countryLanguage.toLowerCase()
    );
    if (countryTranslation) {
      return { title: countryTranslation.title, body: countryTranslation.body };
    }
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

/** 個人指定（`users`）の配信対象を表す条件。指定された個人、または指定された会社の所属者。 */
function usersTargetingCondition(
  targeting: Extract<AnnouncementTargeting, { scope: "users" }>
): Prisma.ApplicantUserWhereInput {
  return {
    OR: [{ id: { in: targeting.userIds } }, { companyId: { in: targeting.companyIds } }],
  };
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
  if (announcement.targeting.scope === "users") {
    return { isActive: true, ...usersTargetingCondition(announcement.targeting) };
  }
  return { isActive: true };
}

/** `targeting`に該当する`ApplicantUser`を表す条件（`isActive`は含まない。`all`は全員）。 */
function targetingUserCondition(targeting: AnnouncementTargeting): Prisma.ApplicantUserWhereInput {
  if (targeting.scope === "countries") {
    return { company: { country: { in: targeting.countries } } };
  }
  if (targeting.scope === "users") {
    return usersTargetingCondition(targeting);
  }
  return {};
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

  // 個人指定（users）が絡む変更は、「編集後の対象のうち編集前の対象でなかった者」を
  // 汎用的な差集合として表す（国⇔個人の切替、個人の追加・全体への拡大を含む）。
  if (previousTargeting.scope === "users" || nextTargeting.scope === "users") {
    if (
      previousTargeting.scope === "users" &&
      nextTargeting.scope === "users" &&
      nextTargeting.userIds.every((userId) => previousTargeting.userIds.includes(userId)) &&
      nextTargeting.companyIds.every((companyId) =>
        previousTargeting.companyIds.includes(companyId)
      )
    ) {
      return null;
    }
    return {
      isActive: true,
      AND: [targetingUserCondition(nextTargeting)],
      NOT: targetingUserCondition(previousTargeting),
    };
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
