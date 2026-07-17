import { InquiryStatusSummary } from "@/types/inquiry-summary";
import { CreateInquiryInput, Inquiry } from "@/types/inquiry";
import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
  UnauthorizedSessionError,
} from "@/lib/server/auth-session";
import { getSession } from "@/lib/server/get-session";
import { createInquirySchema } from "@/lib/validation/inquiry";
import {
  createInquiryRecord,
  findInquiryById as findInquiryByIdService,
  findInquiryForCompany,
  listAllInquiries as listAllInquiriesService,
  listInquiriesForCompany,
  listUnreadReplyInquiryIds as listUnreadReplyInquiryIdsService,
  markInquiryRead as markInquiryReadService,
  setClaim,
  updateStatus,
} from "@/lib/server/inquiry-service";

function summarize(inquiries: Inquiry[]): InquiryStatusSummary {
  return inquiries.reduce<InquiryStatusSummary>(
    (summary, inquiry) => {
      summary[inquiry.status] += 1;
      return summary;
    },
    { new: 0, in_progress: 0, resolved: 0 }
  );
}

/**
 * 問い合わせ・申請を送信する。ログイン中の申請者セッションが所属する`Company`の
 * IDを永続化し、`submittedBy`はフォーム入力値のまま表示用フィールドとして保存する。
 *
 * ヘルプデスク担当者が申請者に代わって代理登録する場合は`proxyCompanyId`を渡す。
 * この場合はヘルプデスクセッションを要求し、渡された会社IDへ紐付けて登録する
 * （`claims.companyId`のような自社スコープを持たないため、呼び出し元が対象会社を明示する）。
 *
 * `input`は`createInquirySchema`で検証してから永続化する。Server Action経由（クライアント
 * 検証のバイパスが可能）・`POST /api/inquiries`経由の両方の呼び出し元で共有される関数のため、
 * ここで検証しないと添付ファイル件数・サイズや不正なenum値が無制限に書き込まれてしまう。
 */
export async function createInquiry(
  input: CreateInquiryInput,
  proxyCompanyId?: string
): Promise<Inquiry> {
  const session = await getSession();

  if (session?.claims?.role === "applicant") {
    const data = createInquirySchema.parse(input);
    return createInquiryRecord({ data, companyId: session.claims.companyId });
  }

  if (session?.claims?.role === "helpdesk" && proxyCompanyId) {
    const data = createInquirySchema.parse(input);
    return createInquiryRecord({ data, companyId: proxyCompanyId });
  }

  throw new UnauthorizedSessionError(
    "Applicant session, or helpdesk session with a target company, is required"
  );
}

/**
 * ログイン中の申請者セッションが所属する会社の問い合わせ全件を取得する。
 */
export async function getInquiries(): Promise<Inquiry[]> {
  const { claims } = await requireApplicantSession();

  return listInquiriesForCompany(claims.companyId);
}

/**
 * 全社分の問い合わせ全件を取得する。ヘルプデスク担当者のセッションを要求する。
 */
export async function getAllInquiries(): Promise<Inquiry[]> {
  await requireHelpdeskStaffSession();

  return listAllInquiriesService();
}

/**
 * 指定されたIDの問い合わせを1件取得する。申請者セッションでは自社スコープに
 * 限定し、ヘルプデスクセッションでは全社の問い合わせを取得できる。
 */
export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const session = await getSession();
  if (!session?.claims) {
    throw new UnauthorizedSessionError("Session required");
  }

  if (session.claims.role === "applicant") {
    return findInquiryForCompany(id, session.claims.companyId);
  }

  return findInquiryByIdService(id);
}

/**
 * 対応中フラグを設定・解除する。`staffName`引数はシグネチャ互換のために残すが、
 * 実際の担当者情報はログイン中のヘルプデスクセッションから解決する
 * （クライアントが自称する氏名を信用しない）。
 */
export async function setInquiryClaim(
  id: string,
  staffName: string | null
): Promise<Inquiry> {
  const { claims } = await requireHelpdeskStaffSession();

  return setClaim(
    id,
    staffName
      ? { staffId: claims.staffId, displayName: claims.displayName }
      : null
  );
}

/**
 * 問い合わせの対応状況（status）を変更する。ヘルプデスク担当者のセッションを要求する。
 */
export async function updateInquiryStatus(
  id: string,
  status: Inquiry["status"]
): Promise<Inquiry> {
  await requireHelpdeskStaffSession();

  return updateStatus(id, status);
}

/**
 * ログイン中の申請者セッションが所属する会社の問い合わせのうち、
 * ヘルプデスク起点の対応履歴（`reply_sent`/`status_changed`/`claimed`/`released`）に
 * 未読（新着）があるものの問い合わせIDを返す。申請者自身の送信（`requester_message`）は
 * 判定に含めない。
 */
export async function getUnreadReplyInquiryIds(): Promise<string[]> {
  const { claims } = await requireApplicantSession();

  return listUnreadReplyInquiryIdsService(claims.companyId);
}

/**
 * ログイン中の申請者セッションが所属する会社の問い合わせに限り、
 * 既読時刻（`lastReadAt`）を現在時刻に更新する。`status`・対応中フラグ（`claim`）は
 * 変更しない。他社の問い合わせIDを指定しても更新されない。
 */
export async function markInquiryRead(inquiryId: string): Promise<void> {
  const { claims } = await requireApplicantSession();

  await markInquiryReadService(inquiryId, claims.companyId);
}

/** 自社の問い合わせをステータス別に集計する。 */
export async function getInquiryStatusSummary(): Promise<InquiryStatusSummary> {
  const ownCompanyInquiries = await getInquiries();

  return summarize(ownCompanyInquiries);
}

/** 全社の問い合わせをステータス別に集計する。 */
export async function getAllInquiryStatusSummary(): Promise<InquiryStatusSummary> {
  const allInquiries = await getAllInquiries();

  return summarize(allInquiries);
}
