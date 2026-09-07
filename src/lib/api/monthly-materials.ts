import type {
  CreateMonthlyMaterialInput,
  MonthlyMaterial,
  MonthlyMaterialCategory,
} from "@/types/monthly-material";
import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";
import {
  createMonthlyMaterialRecord,
  deleteMonthlyMaterialRecord,
  listAllMonthlyMaterials as listAllMonthlyMaterialsService,
  listMonthlyMaterialsVisibleTo,
  updateMonthlyMaterialRecord,
} from "@/lib/server/monthly-material-service";

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に公開範囲が及ぶ、
 * 指定カテゴリの資料全件を年月の降順で返す。
 */
export async function getMonthlyMaterials(
  category: MonthlyMaterialCategory
): Promise<MonthlyMaterial[]> {
  const { claims } = await requireApplicantSession();

  return listMonthlyMaterialsVisibleTo(category, claims.country, claims.companyCode);
}

/**
 * 公開範囲による絞り込みを行わず、指定カテゴリの資料全件を年月の降順で返す。
 * ヘルプデスク側の閲覧・管理画面が利用する。
 */
export async function getAllMonthlyMaterialsForHelpdesk(
  category: MonthlyMaterialCategory
): Promise<MonthlyMaterial[]> {
  await requireHelpdeskStaffSession();

  return listAllMonthlyMaterialsService(category);
}

/** 資料を新規作成する。 */
export async function createMonthlyMaterial(
  input: CreateMonthlyMaterialInput
): Promise<MonthlyMaterial> {
  await requireHelpdeskStaffSession();

  return createMonthlyMaterialRecord(input);
}

/** 既存の資料の内容を更新する。 */
export async function updateMonthlyMaterial(
  id: string,
  input: CreateMonthlyMaterialInput
): Promise<MonthlyMaterial> {
  await requireHelpdeskStaffSession();

  return updateMonthlyMaterialRecord(id, input);
}

/** 資料を削除する。 */
export async function deleteMonthlyMaterial(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteMonthlyMaterialRecord(id);
}
