import "server-only";

import type { Prisma } from "@prisma/client";

import type { InquiryAttachment } from "@/types/attachment";
import type { InquiryHistoryEntry } from "@/types/inquiry-history";
import type { Inquiry } from "@/types/inquiry";

type PrismaInquiryAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
};

type PrismaInquiryWithRelations = Prisma.InquiryGetPayload<{
  include: { claimedByStaff: true; attachments: true };
}>;

type PrismaHistoryEntryWithRelations = Prisma.InquiryHistoryEntryGetPayload<{
  include: { attachments: true };
}>;

export function mapAttachment(record: PrismaInquiryAttachment): InquiryAttachment {
  return {
    id: record.id,
    fileName: record.fileName,
    fileType: record.fileType,
    fileSize: record.fileSize,
    dataUrl: record.dataUrl,
  };
}

export function mapInquiry(record: PrismaInquiryWithRelations): Inquiry {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    urgency: record.urgency,
    storeRegion: record.storeRegion,
    originalText: record.originalText,
    originalLanguage: record.originalLanguage,
    translatedText: record.translatedText ?? undefined,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    submittedBy: {
      companyName: record.submittedByCompanyName,
      country: record.submittedByCountry,
    },
    claim:
      record.claimedByStaffId && record.claimedAt && record.claimedByStaff
        ? {
            staffName: record.claimedByStaff.displayName,
            claimedAt: record.claimedAt.toISOString(),
          }
        : null,
    attachments: record.attachments?.length
      ? record.attachments.map(mapAttachment)
      : undefined,
  };
}

export function mapHistoryEntry(
  record: PrismaHistoryEntryWithRelations
): InquiryHistoryEntry {
  return {
    id: record.id,
    inquiryId: record.inquiryId,
    type: record.type,
    actorName: record.actorName,
    occurredAt: record.occurredAt.toISOString(),
    detail: record.detail ?? undefined,
    attachments: record.attachments?.length
      ? record.attachments.map(mapAttachment)
      : undefined,
  };
}
