"use server";

import { revalidatePath } from "next/cache";

import {
  CompanyCodeTakenError,
  createCompany,
  isCompanyCodeTaken,
  updateCompany,
} from "@/lib/server/company-service";
import { companyFormSchema } from "@/lib/validation/company";
import type { Company, CreateCompanyInput } from "@/types/company";

const HELPDESK_COMPANY_LIST_PATH = "/[locale]/helpdesk/companies";
const HELPDESK_COMPANY_DETAIL_PATH = "/[locale]/helpdesk/companies/[id]";
const HELPDESK_COMPANY_EDIT_PATH = "/[locale]/helpdesk/companies/[id]/edit";

function revalidateCompanyRoutes() {
  revalidatePath(HELPDESK_COMPANY_LIST_PATH, "page");
  revalidatePath(HELPDESK_COMPANY_DETAIL_PATH, "page");
  revalidatePath(HELPDESK_COMPANY_EDIT_PATH, "page");
}

/**
 * 会社を新規作成し、販社管理一覧・詳細ルートを再検証する。
 * 不正な入力・販社コードの重複は保存せず例外を送出する。
 */
export async function createCompanyAction(
  input: CreateCompanyInput
): Promise<Company> {
  const parsed = companyFormSchema.parse(input);

  if (await isCompanyCodeTaken(parsed.companyCode)) {
    throw new CompanyCodeTakenError(parsed.companyCode);
  }

  const created = await createCompany(parsed);
  revalidateCompanyRoutes();

  return created;
}

/**
 * 既存の会社情報を更新し、販社管理一覧・詳細・編集ルートを再検証する。
 * 不正な入力・自分自身以外との販社コードの重複は保存せず例外を送出する。
 */
export async function updateCompanyAction(
  id: string,
  input: CreateCompanyInput
): Promise<Company> {
  const parsed = companyFormSchema.parse(input);

  if (await isCompanyCodeTaken(parsed.companyCode, id)) {
    throw new CompanyCodeTakenError(parsed.companyCode);
  }

  const updated = await updateCompany(id, parsed);
  revalidateCompanyRoutes();

  return updated;
}
