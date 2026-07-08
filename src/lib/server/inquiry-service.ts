import "server-only";

import { prisma } from "@/lib/db/prisma";
import { mapHistoryEntry, mapInquiry } from "@/lib/server/inquiry-mapper";
import type { InquiryAttachment } from "@/types/attachment";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";
import type { InquiryHistoryEntry } from "@/types/inquiry-history";

const INQUIRY_INCLUDE = {
  claimedByStaff: true,
  attachments: true,
} as const;

export class DoubleClaimError extends Error {
  constructor(inquiryId: string) {
    super(`Inquiry is already claimed: ${inquiryId}`);
    this.name = "DoubleClaimError";
  }
}

export class InquiryNotFoundError extends Error {
  constructor(inquiryId: string) {
    super(`Inquiry not found: ${inquiryId}`);
    this.name = "InquiryNotFoundError";
  }
}

interface CreateInquiryServiceInput {
  data: CreateInquiryInput;
  companyId: string;
}

function attachmentCreateInput(attachments: InquiryAttachment[] | undefined) {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }
  return {
    create: attachments.map((attachment) => ({
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      dataUrl: attachment.dataUrl,
    })),
  };
}

/**
 * セッションから解決した会社IDを永続化し、フォーム入力値（会社名・国）は
 * 表示用フィールドとしてそのまま保存する。
 */
export async function createInquiryRecord(
  input: CreateInquiryServiceInput
): Promise<Inquiry> {
  const record = await prisma.inquiry.create({
    data: {
      category: input.data.category,
      urgency: input.data.urgency,
      storeRegion: input.data.storeRegion,
      originalText: input.data.originalText,
      originalLanguage: input.data.originalLanguage,
      status: input.data.status,
      createdAt: new Date(input.data.createdAt),
      companyId: input.companyId,
      submittedByCompanyName: input.data.submittedBy.companyName,
      submittedByCountry: input.data.submittedBy.country,
      attachments: attachmentCreateInput(input.data.attachments),
    },
    include: INQUIRY_INCLUDE,
  });

  return mapInquiry(record);
}

/** 指定した会社IDに紐づく問い合わせのみを送信日時降順で取得する。 */
export async function listInquiriesForCompany(
  companyId: string
): Promise<Inquiry[]> {
  const records = await prisma.inquiry.findMany({
    where: { companyId },
    include: INQUIRY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return records.map(mapInquiry);
}

/** 会社による絞り込みを行わず全件を送信日時降順で取得する。 */
export async function listAllInquiries(): Promise<Inquiry[]> {
  const records = await prisma.inquiry.findMany({
    include: INQUIRY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return records.map(mapInquiry);
}

/** 指定したIDの問い合わせを1件取得する。存在しない場合はnullを返す。 */
export async function findInquiryById(id: string): Promise<Inquiry | null> {
  const record = await prisma.inquiry.findUnique({
    where: { id },
    include: INQUIRY_INCLUDE,
  });

  return record ? mapInquiry(record) : null;
}

/**
 * 指定した会社IDに紐づく場合のみ、指定したIDの問い合わせを1件取得する。
 * 対象が存在しない、または他社の問い合わせの場合はnullを返す
 * （公開型`Inquiry`は`companyId`を含まないため、所有権判定はDBクエリ側で行う）。
 */
export async function findInquiryForCompany(
  id: string,
  companyId: string
): Promise<Inquiry | null> {
  const record = await prisma.inquiry.findFirst({
    where: { id, companyId },
    include: INQUIRY_INCLUDE,
  });

  return record ? mapInquiry(record) : null;
}

/**
 * 対応中フラグを設定・解除する。既にclaim済みの問い合わせへ新たなclaimを
 * 設定しようとした場合は`DoubleClaimError`を送出する（二重対応防止）。
 */
export async function setClaim(
  id: string,
  staff: { staffId: string; displayName: string } | null
): Promise<Inquiry> {
  const current = await prisma.inquiry.findUnique({ where: { id } });
  if (!current) {
    throw new InquiryNotFoundError(id);
  }

  if (staff && current.claimedByStaffId) {
    throw new DoubleClaimError(id);
  }

  const record = await prisma.inquiry.update({
    where: { id },
    data: staff
      ? { claimedByStaffId: staff.staffId, claimedAt: new Date() }
      : { claimedByStaffId: null, claimedAt: null },
    include: INQUIRY_INCLUDE,
  });

  return mapInquiry(record);
}

/** 問い合わせの対応状況（status）を変更する。 */
export async function updateStatus(
  id: string,
  status: Inquiry["status"]
): Promise<Inquiry> {
  const record = await prisma.inquiry.update({
    where: { id },
    data: { status },
    include: INQUIRY_INCLUDE,
  });

  return mapInquiry(record);
}

/** 対応履歴を1件追記する。追記のみで更新・削除は行わない。 */
export async function appendHistoryEntry(
  entry: Omit<InquiryHistoryEntry, "id">
): Promise<InquiryHistoryEntry> {
  const record = await prisma.inquiryHistoryEntry.create({
    data: {
      inquiryId: entry.inquiryId,
      type: entry.type,
      actorName: entry.actorName,
      occurredAt: new Date(entry.occurredAt),
      detail: entry.detail,
      attachments: attachmentCreateInput(entry.attachments),
    },
    include: { attachments: true },
  });

  return mapHistoryEntry(record);
}

/** 指定した問い合わせの対応履歴を発生時刻の降順で取得する。 */
export async function listHistory(
  inquiryId: string
): Promise<InquiryHistoryEntry[]> {
  const records = await prisma.inquiryHistoryEntry.findMany({
    where: { inquiryId },
    include: { attachments: true },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  });

  return records.map(mapHistoryEntry);
}
