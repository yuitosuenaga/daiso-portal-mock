"use server";

import { revalidatePath } from "next/cache";

import {
  ApplicantUserEmailTakenError,
  createApplicantUser,
  isApplicantUserEmailTaken,
  setApplicantUserActive,
  updateApplicantUser,
} from "@/lib/server/applicant-user-service";
import {
  applicantUserCreateFormSchema,
  applicantUserUpdateFormSchema,
} from "@/lib/validation/applicant-user";
import type {
  ApplicantUserSummary,
  CreateApplicantUserInput,
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
 * 申請者アカウントを新規作成し、対象会社の詳細ルートを再検証する。
 * 不正な入力・メールアドレスの重複は保存せず例外を送出する。
 */
export async function createApplicantUserAction(
  companyId: string,
  input: CreateApplicantUserInput
): Promise<ApplicantUserSummary> {
  const parsed = applicantUserCreateFormSchema.parse(input);

  if (await isApplicantUserEmailTaken(parsed.email)) {
    throw new ApplicantUserEmailTakenError(parsed.email);
  }

  const created = await createApplicantUser(companyId, parsed);
  revalidateApplicantUserRoutes();

  return created;
}

/**
 * 既存の申請者アカウントを更新し、対象会社の詳細ルート・当該アカウントの編集ルートを
 * 再検証する。不正な入力・自分自身以外とのメールアドレスの重複は保存せず例外を送出する。
 * パスワード欄が空欄の場合は既存のパスワードハッシュを変更しない。
 */
export async function updateApplicantUserAction(
  id: string,
  input: UpdateApplicantUserInput
): Promise<ApplicantUserSummary> {
  const parsed = applicantUserUpdateFormSchema.parse(input);

  if (await isApplicantUserEmailTaken(parsed.email, id)) {
    throw new ApplicantUserEmailTakenError(parsed.email);
  }

  const updated = await updateApplicantUser(id, {
    email: parsed.email,
    displayName: parsed.displayName,
    password: parsed.password ? parsed.password : undefined,
    preferredLocale: parsed.preferredLocale,
  });
  revalidateApplicantUserRoutes();

  return updated;
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
