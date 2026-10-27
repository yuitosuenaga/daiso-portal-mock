"use server";

import { revalidatePath } from "next/cache";

import {
  createApplicantUser,
  isApplicantUserEmailTaken,
  searchApplicantUsersForTargeting,
  setApplicantUserActive,
  updateApplicantUser,
} from "@/lib/server/applicant-user-service";
import { searchCompaniesForTargeting } from "@/lib/server/company-targeting-service";
import {
  applicantUserCreateFormSchema,
  applicantUserUpdateFormSchema,
} from "@/lib/validation/applicant-user";
import type {
  ApplicantUserSummary,
  CreateApplicantUserInput,
  TargetingCandidates,
  UpdateApplicantUserInput,
} from "@/types/applicant-user";

const HELPDESK_COMPANY_DETAIL_PATH = "/[locale]/helpdesk/companies/[id]";
const HELPDESK_APPLICANT_USER_EDIT_PATH =
  "/[locale]/helpdesk/companies/[id]/applicant-users/[userId]/edit";

function revalidateApplicantUserRoutes() {
  revalidatePath(HELPDESK_COMPANY_DETAIL_PATH, "page");
  revalidatePath(HELPDESK_APPLICANT_USER_EDIT_PATH, "page");
}

/**
 * 申請者アカウントの保存系Server Actionの戻り値。メールアドレス重複は例外ではなく
 * 種別コードで返す（本番ではServer Actionの例外メッセージがクライアントへ届く前にマスクされ、
 * メッセージ文字列による判定が成立しないため）。
 */
export type ApplicantUserSaveResult =
  | { ok: true; user: ApplicantUserSummary }
  | { ok: false; reason: "emailTaken" };

/**
 * 申請者アカウントを新規作成し、対象会社の詳細ルートを再検証する。
 * 不正な入力は保存せず例外を送出する。メールアドレスの重複は保存せず
 * `{ ok: false, reason: "emailTaken" }`を返す。
 */
export async function createApplicantUserAction(
  companyId: string,
  input: CreateApplicantUserInput
): Promise<ApplicantUserSaveResult> {
  const parsed = applicantUserCreateFormSchema.parse(input);

  if (await isApplicantUserEmailTaken(parsed.email)) {
    return { ok: false, reason: "emailTaken" };
  }

  const created = await createApplicantUser(companyId, parsed);
  revalidateApplicantUserRoutes();

  return { ok: true, user: created };
}

/**
 * 既存の申請者アカウントを更新し、対象会社の詳細ルート・当該アカウントの編集ルートを
 * 再検証する。不正な入力は保存せず例外を送出する。自分自身以外とのメールアドレスの重複は
 * 保存せず`{ ok: false, reason: "emailTaken" }`を返す。
 * パスワード欄が空欄の場合は既存のパスワードハッシュを変更しない。
 */
export async function updateApplicantUserAction(
  id: string,
  input: UpdateApplicantUserInput
): Promise<ApplicantUserSaveResult> {
  const parsed = applicantUserUpdateFormSchema.parse(input);

  if (await isApplicantUserEmailTaken(parsed.email, id)) {
    return { ok: false, reason: "emailTaken" };
  }

  const updated = await updateApplicantUser(id, {
    email: parsed.email,
    displayName: parsed.displayName,
    password: parsed.password ? parsed.password : undefined,
    preferredLocale: parsed.preferredLocale,
  });
  revalidateApplicantUserRoutes();

  return { ok: true, user: updated };
}

/**
 * 申請者アカウントの有効状態を変更し、対象会社の詳細ルート・当該アカウントの
 * 編集ルートを再検証する。確認（要件7.2）は呼び出し元コンポーネントが担う。
 */
export async function setApplicantUserActiveAction(
  id: string,
  isActive: boolean
): Promise<ApplicantUserSummary> {
  const updated = await setApplicantUserActive(id, isActive);
  revalidateApplicantUserRoutes();

  return updated;
}

/**
 * お知らせの個人・会社指定用に、会社と申請者アカウントを部分一致で検索する（ヘルプデスク専用）。
 * 会社と個人は別々の候補として返す。
 */
export async function searchTargetingCandidatesAction(
  query: string
): Promise<TargetingCandidates> {
  const [companies, users] = await Promise.all([
    searchCompaniesForTargeting(query),
    searchApplicantUsersForTargeting(query),
  ]);
  return { companies, users };
}
