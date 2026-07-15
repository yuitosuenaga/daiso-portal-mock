import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  Announcement,
  AnnouncementTargeting,
} from "@/types/announcement";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";
import type { DocumentCompanyCode } from "@/lib/constants/document-company-options";

/** 添付ファイル・ドキュメント紐づけを含むAnnouncementレコードの読み取り時のinclude句。 */
export const ANNOUNCEMENT_INCLUDE = {
  attachments: true,
  linkedDocuments: true,
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
