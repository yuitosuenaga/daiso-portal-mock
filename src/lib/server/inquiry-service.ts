import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { CompanyNotFoundError } from "@/lib/server/company-service";
import { mapHistoryEntry, mapInquiry } from "@/lib/server/inquiry-mapper";
import type { InquiryAttachment } from "@/types/attachment";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";
import type { InquiryHistoryEntry } from "@/types/inquiry-history";

// 一覧用: 添付ファイル（dataUrl=Base64、最大5MB×5件）を読み込まない
const INQUIRY_LIST_INCLUDE = { claimedByStaff: true, translations: true } as const;
// 詳細・作成・更新用: 添付ファイルを含む
const INQUIRY_DETAIL_INCLUDE = {
  claimedByStaff: true,
  attachments: true,
  translations: true,
} as const;

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
  readonly inquiryId: string;

  constructor(inquiryId: string) {
    super("Inquiry is already claimed");
    this.name = "DoubleClaimError";
    this.inquiryId = inquiryId;
  }
}

export class ClaimOwnershipError extends Error {
  readonly inquiryId: string;

  constructor(inquiryId: string) {
    super("Claim not owned by acting staff");
    this.name = "ClaimOwnershipError";
    this.inquiryId = inquiryId;
  }
}

export class InquiryNotFoundError extends Error {
  readonly inquiryId: string;

  constructor(inquiryId: string) {
    super("Inquiry not found");
    this.name = "InquiryNotFoundError";
    this.inquiryId = inquiryId;
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
 * セッション（または代理登録の対象）から解決した会社IDを永続化し、会社名・国は
 * その`Company`から導出して表示用フィールドに保存する（クライアント入力は信用しない）。
 * `status`は`new`固定、`createdAt`はDB既定（`now()`）に任せる。
 * 会社が存在しない場合は`CompanyNotFoundError`を送出する。
 *
 * 翻訳（`InquiryTranslation`）はここでは書き込まない。呼び出し元
 * （`src/lib/api/inquiries.ts`の`createInquiry`）が保存後に
 * `translateInquiryAndStore`（`inquiry-translation-service.ts`）を呼び、
 * Claude APIによる自動翻訳を別途書き込む。
 */
export async function createInquiryRecord(
  input: CreateInquiryServiceInput
): Promise<Inquiry> {
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { name: true, country: true },
  });
  if (!company) {
    throw new CompanyNotFoundError(input.companyId);
  }

  const record = await prisma.inquiry.create({
    data: {
      title: input.data.title,
      category: input.data.category,
      urgency: input.data.urgency,
      storeRegion: input.data.storeRegion,
      originalText: input.data.originalText,
      originalLanguage: input.data.originalLanguage,
      status: "new",
      companyId: input.companyId,
      submittedByCompanyName: company.name,
      submittedByCountry: company.country,
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

type DbClient = Prisma.TransactionClient;

type HistoryCreateInput = Omit<InquiryHistoryEntry, "id">;

function historyCreateData(entry: HistoryCreateInput) {
  return {
    inquiryId: entry.inquiryId,
    type: entry.type,
    actorName: entry.actorName,
    occurredAt: new Date(entry.occurredAt),
    detail: entry.detail,
    attachments: attachmentCreateInput(entry.attachments),
  };
}

async function createHistoryInTx(tx: DbClient, entry: HistoryCreateInput) {
  await tx.inquiryHistoryEntry.create({ data: historyCreateData(entry) });
}

/**
 * 対応中フラグを設定・解除する。既にclaim済みの問い合わせへ新たなclaimを
 * 設定しようとした場合は`DoubleClaimError`を送出する（二重対応防止）。
 *
 * 判定と更新は`WHERE`条件付きの単一`updateMany`（claimは`claimedByStaffId IS NULL`、
 * 解除は`claimedByStaffId = actingStaffId`）で原子的に行い、同時実行でも勝つのは1件のみ。
 * 件数0のときだけ原因を読み取って`InquiryNotFoundError`/`DoubleClaimError`/
 * `ClaimOwnershipError`に振り分ける。未claimの解除は冪等な無操作として成功する。
 *
 * `actingStaffId`は操作を行う担当者の`staffId`。解除パス（`staff`が`null`）で
 * 対象が既にclaim済みかつ`actingStaffId`が所有者と一致しない場合は、原則として
 * `ClaimOwnershipError`を送出し解除を拒否する（他担当者による無断解除の防止）。
 * ただし現担当者が無効化（`isActive = false`）されている場合に限り、他の有効スタッフによる
 * 解除を許可する（読み取った担当者IDを条件にした条件付き更新で原子的に行う。
 * 担当者の有効状態が不明な場合は拒否側に倒す）。
 *
 * `options.historyActorName`を渡すと、実際に状態が変わったときだけ
 * 同一トランザクション内で`claimed`/`released`履歴を記録する。
 */
export async function setClaim(
  id: string,
  staff: { staffId: string; displayName: string } | null,
  actingStaffId: string,
  options?: { historyActorName?: string }
): Promise<Inquiry> {
  return prisma.$transaction(async (tx) => {
    const result = staff
      ? await tx.inquiry.updateMany({
          where: { id, claimedByStaffId: null },
          data: { claimedByStaffId: staff.staffId, claimedAt: new Date() },
        })
      : await tx.inquiry.updateMany({
          where: { id, claimedByStaffId: actingStaffId },
          data: { claimedByStaffId: null, claimedAt: null },
        });

    let changed = result.count === 1;

    if (result.count === 0) {
      if (staff) {
        const exists = await tx.inquiry.findUnique({
          where: { id },
          select: { id: true },
        });
        throw exists ? new DoubleClaimError(id) : new InquiryNotFoundError(id);
      }
      const current = await tx.inquiry.findUnique({
        where: { id },
        select: {
          claimedByStaffId: true,
          claimedByStaff: { select: { isActive: true } },
        },
      });
      if (!current) {
        throw new InquiryNotFoundError(id);
      }
      if (current.claimedByStaffId) {
        // 担当者が無効化されている場合のみ、他スタッフによる解除を許可する。
        if (current.claimedByStaff?.isActive !== false) {
          throw new ClaimOwnershipError(id);
        }
        // 読み取った担当者IDそのものを条件にして原子的に解除する。
        const released = await tx.inquiry.updateMany({
          where: { id, claimedByStaffId: current.claimedByStaffId },
          data: { claimedByStaffId: null, claimedAt: null },
        });
        if (released.count === 1) {
          changed = true;
        } else {
          const latest = await tx.inquiry.findUnique({
            where: { id },
            select: { claimedByStaffId: true },
          });
          if (!latest) {
            throw new InquiryNotFoundError(id);
          }
          if (latest.claimedByStaffId) {
            throw new ClaimOwnershipError(id);
          }
        }
      }
    }

    if (changed && options?.historyActorName) {
      await createHistoryInTx(tx, {
        inquiryId: id,
        type: staff ? "claimed" : "released",
        actorName: options.historyActorName,
        occurredAt: new Date().toISOString(),
      });
    }

    const record = await tx.inquiry.findUniqueOrThrow({
      where: { id },
      include: INQUIRY_DETAIL_INCLUDE,
    });
    return mapInquiry(record);
  });
}

const STATUS_CHANGE_MAX_ATTEMPTS = 3;

/**
 * 対応状況を変更し、変更前後の値を示す`status_changed`履歴を同一トランザクションで記録する。
 * 現在値を読み取り、`WHERE status = 現在値`の条件付き更新で書き込む。他の担当者の変更が
 * 割り込んで更新0件になった場合は読み直して再試行する（最大3回。超えたら例外）。
 * これにより履歴の「変更前」は常に実際に上書きした値と一致する。
 * 現在値と同じ状態への変更は何もせず`{ changed: false }`を返す（履歴も残さない）。
 * 存在しないIDは`InquiryNotFoundError`。
 *
 * 翻訳など外部I/Oはトランザクション外で済ませ、`formatDetail`は純粋関数として渡すこと。
 */
export async function changeStatusWithHistory(
  id: string,
  next: Inquiry["status"],
  options: {
    actorName: string;
    formatDetail: (previous: Inquiry["status"], next: Inquiry["status"]) => string;
  }
): Promise<{ changed: boolean }> {
  return prisma.$transaction(async (tx) => {
    for (let attempt = 0; attempt < STATUS_CHANGE_MAX_ATTEMPTS; attempt += 1) {
      const current = await tx.inquiry.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) {
        throw new InquiryNotFoundError(id);
      }
      const previous = current.status as Inquiry["status"];
      if (previous === next) {
        return { changed: false };
      }

      const result = await tx.inquiry.updateMany({
        where: { id, status: previous },
        data: { status: next },
      });
      if (result.count === 1) {
        await createHistoryInTx(tx, {
          inquiryId: id,
          type: "status_changed",
          actorName: options.actorName,
          occurredAt: new Date().toISOString(),
          detail: options.formatDetail(previous, next),
        });
        return { changed: true };
      }
    }
    throw new Error(`Failed to change inquiry status due to concurrent updates: ${id}`);
  });
}

/**
 * 返信（`reply_sent`履歴）を記録し、statusが`new`なら`in_progress`へ自動遷移して
 * `status_changed`履歴を残す。すべて同一トランザクション。遷移は
 * `WHERE status = 'new'`の条件付き更新で、他の担当者が先に状態を変えていれば上書きしない。
 * 存在しないIDは`InquiryNotFoundError`（履歴は作らない）。
 */
export async function appendReplyWithAutoTransition(
  id: string,
  input: {
    actorName: string;
    body: string;
    attachments?: InquiryAttachment[];
    autoTransitionDetail: string;
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const exists = await tx.inquiry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new InquiryNotFoundError(id);
    }

    await createHistoryInTx(tx, {
      inquiryId: id,
      type: "reply_sent",
      actorName: input.actorName,
      occurredAt: new Date().toISOString(),
      detail: input.body,
      attachments: input.attachments,
    });

    const transitioned = await tx.inquiry.updateMany({
      where: { id, status: "new" },
      data: { status: "in_progress" },
    });
    if (transitioned.count === 1) {
      await createHistoryInTx(tx, {
        inquiryId: id,
        type: "status_changed",
        actorName: input.actorName,
        occurredAt: new Date().toISOString(),
        detail: input.autoTransitionDetail,
      });
    }
  });
}

/** 対応履歴を1件追記する。追記のみで更新・削除は行わない。 */
export async function appendHistoryEntry(
  entry: Omit<InquiryHistoryEntry, "id">
): Promise<InquiryHistoryEntry> {
  const record = await prisma.inquiryHistoryEntry.create({
    data: historyCreateData(entry),
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
