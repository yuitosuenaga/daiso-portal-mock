import "server-only";

import { prisma } from "@/lib/db/prisma";
import { mapHistoryEntry, mapInquiry } from "@/lib/server/inquiry-mapper";
import type { InquiryAttachment } from "@/types/attachment";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";
import type { InquiryHistoryEntry } from "@/types/inquiry-history";

// 一覧用: 添付ファイル（dataUrl=Base64、最大5MB×5件）を読み込まない
const INQUIRY_LIST_INCLUDE = { claimedByStaff: true } as const;
// 詳細・作成・更新用: 添付ファイルを含む
const INQUIRY_DETAIL_INCLUDE = { claimedByStaff: true, attachments: true } as const;

/**
 * 未読判定に含める「ヘルプデスク起点」の対応履歴種別。
 * 申請者自身の送信（`requester_message`）は未読判定に含めない。
 */
const HELPDESK_ORIGIN_HISTORY_TYPES = [
  "reply_sent",
  "status_changed",
  "claimed",
  "released",
] as const;

export class DoubleClaimError extends Error {
  constructor(inquiryId: string) {
    super(`Inquiry is already claimed: ${inquiryId}`);
    this.name = "DoubleClaimError";
  }
}

export class ClaimOwnershipError extends Error {
  constructor(inquiryId: string) {
    super(`Claim not owned by acting staff: ${inquiryId}`);
    this.name = "ClaimOwnershipError";
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
 *
 * 注意: `translatedText`は意図的に書き込まない（DB既定の`null`のまま維持する）。
 * 実際の翻訳API連携（フェーズ3以降）まで、虚偽の訳文・原文コピー・固定プレース
 * ホルダーで埋めることはしない。表示側の「翻訳未対応」注記は
 * `helpdesk-inquiry-management`spec（Requirement 17）が担当する。
 */
export async function createInquiryRecord(
  input: CreateInquiryServiceInput
): Promise<Inquiry> {
  const record = await prisma.inquiry.create({
    data: {
      title: input.data.title,
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
    include: INQUIRY_DETAIL_INCLUDE,
  });

  return mapInquiry(record);
}

/** 指定した会社IDに紐づく問い合わせのみを送信日時降順で取得する。 */
export async function listInquiriesForCompany(
  companyId: string
): Promise<Inquiry[]> {
  const records = await prisma.inquiry.findMany({
    where: { companyId },
    include: INQUIRY_LIST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return records.map(mapInquiry);
}

/** 会社による絞り込みを行わず全件を送信日時降順で取得する。 */
export async function listAllInquiries(): Promise<Inquiry[]> {
  const records = await prisma.inquiry.findMany({
    include: INQUIRY_LIST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return records.map(mapInquiry);
}

/** 指定したIDの問い合わせを1件取得する。存在しない場合はnullを返す。 */
export async function findInquiryById(id: string): Promise<Inquiry | null> {
  const record = await prisma.inquiry.findUnique({
    where: { id },
    include: INQUIRY_DETAIL_INCLUDE,
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
    include: INQUIRY_DETAIL_INCLUDE,
  });

  return record ? mapInquiry(record) : null;
}

/**
 * 対応中フラグを設定・解除する。既にclaim済みの問い合わせへ新たなclaimを
 * 設定しようとした場合は`DoubleClaimError`を送出する（二重対応防止）。
 *
 * `actingStaffId`は操作を行う担当者の`staffId`。解除パス（`staff`が`null`）で
 * 対象が既にclaim済みかつ`actingStaffId`が所有者と一致しない場合は
 * `ClaimOwnershipError`を送出し、解除を拒否する（他担当者による無断解除の防止）。
 */
export async function setClaim(
  id: string,
  staff: { staffId: string; displayName: string } | null,
  actingStaffId: string
): Promise<Inquiry> {
  const current = await prisma.inquiry.findUnique({ where: { id } });
  if (!current) {
    throw new InquiryNotFoundError(id);
  }

  if (staff && current.claimedByStaffId) {
    throw new DoubleClaimError(id);
  }

  if (!staff && current.claimedByStaffId && current.claimedByStaffId !== actingStaffId) {
    throw new ClaimOwnershipError(id);
  }

  const record = await prisma.inquiry.update({
    where: { id },
    data: staff
      ? { claimedByStaffId: staff.staffId, claimedAt: new Date() }
      : { claimedByStaffId: null, claimedAt: null },
    include: INQUIRY_DETAIL_INCLUDE,
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
    include: INQUIRY_DETAIL_INCLUDE,
  });

  return mapInquiry(record);
}

/**
 * 現在の`status`が`expectedStatus`である場合にのみ`nextStatus`へ原子的に更新する。
 * 返信送信時の自動遷移（新規→対応中）のように、状態を読み取ってから書き込むまでの
 * 間に他の担当者による変更が入り込む競合を避けるため、読み取り＋条件なし書き込みではなく
 * DB側の`WHERE`条件で単一クエリとして完結させる。マッチした場合は`true`を返す。
 */
export async function updateStatusIfCurrent(
  id: string,
  expectedStatus: Inquiry["status"],
  nextStatus: Inquiry["status"]
): Promise<boolean> {
  const result = await prisma.inquiry.updateMany({
    where: { id, status: expectedStatus },
    data: { status: nextStatus },
  });

  return result.count > 0;
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

/**
 * 指定した会社IDに紐づく問い合わせのうち、「未読（新着あり）」と判定されるものの
 * IDを返す。未読とは、ヘルプデスク起点の対応履歴（`requester_message`以外）の
 * 最新発生時刻が、当該問い合わせの`lastReadAt`より新しい（または`lastReadAt`が
 * `null`でヘルプデスク起点履歴が1件以上存在する）状態を指す。
 * 申請者自身の送信（`requester_message`）のみの問い合わせは未読にならない。
 */
export async function listUnreadReplyInquiryIds(
  companyId: string
): Promise<string[]> {
  const records = await prisma.inquiry.findMany({
    where: { companyId },
    select: {
      id: true,
      lastReadAt: true,
      history: {
        where: { type: { in: [...HELPDESK_ORIGIN_HISTORY_TYPES] } },
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { occurredAt: true },
      },
    },
  });

  return records
    .filter((record) => {
      const latestHelpdeskEntry = record.history[0];
      if (!latestHelpdeskEntry) {
        return false;
      }
      if (!record.lastReadAt) {
        return true;
      }
      return latestHelpdeskEntry.occurredAt.getTime() > record.lastReadAt.getTime();
    })
    .map((record) => record.id);
}

/**
 * 指定した会社IDに紐づく場合のみ、対象問い合わせの既読時刻（`lastReadAt`）を
 * 現在時刻に更新する。`status`・対応中フラグ（`claim`）は変更しない。
 * 他社スコープのIDを指定した場合は対象0件で更新されない（サイレントに何もしない）。
 */
export async function markInquiryRead(
  id: string,
  companyId: string
): Promise<void> {
  await prisma.inquiry.updateMany({
    where: { id, companyId },
    data: { lastReadAt: new Date() },
  });
}
