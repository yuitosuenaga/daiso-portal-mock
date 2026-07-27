"use server";

import { revalidatePath } from "next/cache";

import {
  CompanyCodeTakenError,
  createCompaniesBulk,
  createCompany,
  deactivateApplicantUsersByCompanies,
  findExistingCompanyCodes,
  isCompanyCodeTaken,
  updateCompany,
} from "@/lib/server/company-service";
import {
  isFullyValidCompanyCsv,
  parseAndValidateCompanyCsv,
  toCreateCompanyInputs,
  type CompanyCsvRowResult,
} from "@/lib/company-csv";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
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

/**
 * 販社コード（companyCode）入力欄のblur時に呼び出す、軽量な重複照会用Server Action。
 * 既存の`isCompanyCodeTaken`をそのまま利用し、読み取りのみ行う（保存は行わない）。
 * `excludeCompanyId`を指定した場合（編集時）は、そのIDを自分自身として重複対象から除外する。
 * 最終的な一意性の担保は、既存の`createCompanyAction`/`updateCompanyAction`が行う
 * 送信時のユニーク制約チェックに依存する（本関数は事前案内のためのベストエフォート照会）。
 */
export async function checkCompanyCodeAvailabilityAction(
  code: string,
  excludeCompanyId?: string
): Promise<boolean> {
  const trimmed = code.trim();
  if (!trimmed) {
    return false;
  }

  return isCompanyCodeTaken(trimmed, excludeCompanyId);
}

export interface CompanyCsvImportResult {
  /** true=全件登録実施, false=登録なし（要件19.9） */
  committed: boolean;
  createdCount: number;
  rows: CompanyCsvRowResult[];
  /** ヘッダー不一致・空ファイル等のファイル全体エラー（要件19.12） */
  fileError?: string;
}

/**
 * 販社CSVの一括登録を行うServer Action（要件19）。生のCSVテキストを受け取り、
 * `parseAndValidateCompanyCsv`で全データ行を検証し、全行が検証を通過した場合にのみ
 * `createCompaniesBulk`で1トランザクション登録する（all-or-nothing、要件19.8・19.9）。
 * 1行でも検証エラーがある場合は登録を行わず、行別の検証結果のみを返す。
 */
export async function importCompaniesAction(
  csvText: string
): Promise<CompanyCsvImportResult> {
  // CSVがファイル全体エラー（空・ヘッダー不一致等）の場合、以降のどのサービス関数
  // （`findExistingCompanyCodes`等）も呼び出されないため、ここで明示的にヘルプデスク
  // セッションを検証する（多層防御。要件19.13）。
  await requireHelpdeskStaffSession();

  const parsed = parseAndValidateCompanyCsv(csvText, []);

  if (parsed.fileError) {
    return {
      committed: false,
      createdCount: 0,
      rows: [],
      fileError: parsed.fileError,
    };
  }

  const candidateCodes = parsed.rows.map((row) => row.companyCode).filter(Boolean);
  const existingCodes = await findExistingCompanyCodes(candidateCodes);

  const revalidated = parseAndValidateCompanyCsv(csvText, existingCodes);

  if (revalidated.fileError) {
    return {
      committed: false,
      createdCount: 0,
      rows: [],
      fileError: revalidated.fileError,
    };
  }

  if (!isFullyValidCompanyCsv(revalidated)) {
    return {
      committed: false,
      createdCount: 0,
      rows: revalidated.rows,
    };
  }

  const created = await createCompaniesBulk(toCreateCompanyInputs(revalidated.rows));

  if (created.length > 0) {
    revalidateCompanyRoutes();
  }

  return {
    committed: true,
    createdCount: created.length,
    rows: revalidated.rows,
  };
}

/**
 * 選択された複数販社に所属する有効な申請者アカウントを一括無効化するServer Action
 * （要件20）。`deactivateApplicantUsersByCompanies`を呼び、実行後に一覧・詳細ルートを
 * 再検証する。
 */
export async function deactivateCompaniesApplicantUsersAction(
  companyIds: string[]
): Promise<{ deactivatedCount: number }> {
  const result = await deactivateApplicantUsersByCompanies(companyIds);

  revalidateCompanyRoutes();

  return result;
}
