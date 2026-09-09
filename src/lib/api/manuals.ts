import { Manual, CreateManualInput } from "@/types/manual";
import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";
import {
  createManualRecord,
  deleteManualRecord,
  findManualById,
  listAllManuals as listAllManualsService,
  listManualsVisibleTo,
  updateManualRecord,
} from "@/lib/server/manual-service";

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に公開範囲が及ぶマニュアル全件を
 * 年月の降順で返す。`options.locale`に対応するタイトル・説明（未指定時は既定言語`ja`）で
 * 解決する。
 */
export async function getManuals(
  options?: { locale?: string }
): Promise<Manual[]> {
  const { claims } = await requireApplicantSession();

  return options?.locale
    ? listManualsVisibleTo(claims.country, claims.companyCode, options.locale)
    : listManualsVisibleTo(claims.country, claims.companyCode);
}

/**
 * 公開範囲による絞り込みを行わず、マニュアル全件を年月の降順で返す。
 * ヘルプデスク側のマニュアル管理画面が利用する。
 */
export async function getAllManuals(): Promise<Manual[]> {
  await requireHelpdeskStaffSession();

  return listAllManualsService();
}

/**
 * 公開範囲による絞り込みを行わず、指定したIDのマニュアルを1件返す。
 * ヘルプデスク側の編集画面が利用する。該当データが存在しない場合はnullを解決する。
 */
export async function getManualByIdForHelpdesk(
  id: string
): Promise<Manual | null> {
  await requireHelpdeskStaffSession();

  return findManualById(id);
}

/** マニュアルを新規作成する。 */
export async function createManual(
  input: CreateManualInput
): Promise<Manual> {
  await requireHelpdeskStaffSession();

  return createManualRecord(input);
}

/** 既存マニュアルの内容を更新する。 */
export async function updateManual(
  id: string,
  input: CreateManualInput
): Promise<Manual> {
  await requireHelpdeskStaffSession();

  return updateManualRecord(id, input);
}

/** マニュアルを削除する。 */
export async function deleteManual(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteManualRecord(id);
}
