import "server-only";

import type { Announcement as PrismaAnnouncement, Prisma } from "@prisma/client";

import type {
  Announcement,
  AnnouncementTargeting,
} from "@/types/announcement";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";
import type { DocumentCompanyCode } from "@/lib/constants/document-company-options";

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
    publishedAt: record.publishedAt.toISOString(),
    category: record.category,
    body: record.body,
    targeting: mapTargeting(record),
    actionRequired: record.actionRequired,
    publishStartDate: mapDateOnly(record.publishStartDate),
    publishEndDate: mapDateOnly(record.publishEndDate),
    dueDate: mapDateOnly(record.dueDate),
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
