"use server";

import { revalidatePath } from "next/cache";

import {
  createMonthlyMaterial,
  deleteMonthlyMaterial,
  updateMonthlyMaterial,
} from "@/lib/api/monthly-materials";
import { monthlyMaterialFormSchema, monthlyMaterialUpdateSchema } from "@/lib/validation/monthly-material";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import type {
  CreateMonthlyMaterialInput,
  MonthlyMaterialCategory,
  MonthlyMaterialSummary,
  UpdateMonthlyMaterialInput,
} from "@/types/monthly-material";

const APPLICANT_ROUTE_BY_CATEGORY: Record<MonthlyMaterialCategory, string> = {
  salesFloorMeeting: "/[locale]/sales-floor-meeting",
  pop: "/[locale]/pop",
};

const HELPDESK_ROUTE_BY_CATEGORY: Record<MonthlyMaterialCategory, string> = {
  salesFloorMeeting: "/[locale]/helpdesk/sales-floor-meeting",
  pop: "/[locale]/helpdesk/pop",
};

/**
 * 保存・削除操作が完了した資料のカテゴリに対応する、海外販社側・ヘルプデスク側両方の
 * ルートを再検証する。
 */
function revalidateMonthlyMaterialRoutes(category: MonthlyMaterialCategory) {
  revalidatePath(APPLICANT_ROUTE_BY_CATEGORY[category], "page");
  revalidatePath(HELPDESK_ROUTE_BY_CATEGORY[category], "page");
}

/**
 * `sourceType: "google"`の場合、`googleEmbedUrl`をクライアントから送られた値のまま
 * 信頼せず、`googleUrl`からサーバー側で再計算する（`documents`specの
 * `withServerRecomputedEmbedUrl`と同型の措置）。
 */
function withServerRecomputedEmbedUrl<T extends UpdateMonthlyMaterialInput>(input: T): T {
  if (input.sourceType !== "google") return input;

  const googleEmbedUrl = toGoogleEmbedUrl(input.googleUrl);
  if (!googleEmbedUrl) {
    throw new Error("Invalid Google document URL");
  }

  return { ...input, googleEmbedUrl };
}

/**
 * 資料を新規作成し、対象カテゴリの海外販社側・ヘルプデスク側ルートを再検証する。
 * 不正な入力（年月未入力、ファイル形式・サイズ不正、公開範囲0件選択など）は保存せず
 * 例外を送出する。同一年月に複数件登録することは許容される（別レコードとして追加登録できる）。
 */
export async function createMonthlyMaterialAction(
  input: CreateMonthlyMaterialInput
): Promise<MonthlyMaterialSummary> {
  const parsed = monthlyMaterialFormSchema.parse(input);
  const created = await createMonthlyMaterial(withServerRecomputedEmbedUrl(parsed));
  revalidateMonthlyMaterialRoutes(created.category);

  return created;
}

/**
 * 既存の資料の内容を更新し、対象カテゴリのルートを再検証する。不正な入力は保存せず
 * 例外を送出する。アップロード方式で`dataUrl`が無い入力は、ファイルを差し替えず既存ファイルを
 * 保持したまま年月などだけを更新する（`updateMonthlyMaterialRecord`）。
 */
export async function updateMonthlyMaterialAction(
  id: string,
  input: UpdateMonthlyMaterialInput
): Promise<MonthlyMaterialSummary> {
  const parsed = monthlyMaterialUpdateSchema.parse(input) as UpdateMonthlyMaterialInput;
  const updated = await updateMonthlyMaterial(id, withServerRecomputedEmbedUrl(parsed));
  revalidateMonthlyMaterialRoutes(updated.category);

  return updated;
}

/** 資料を削除し、対象カテゴリのルートを再検証する。 */
export async function deleteMonthlyMaterialAction(
  id: string,
  category: MonthlyMaterialCategory
): Promise<void> {
  await deleteMonthlyMaterial(id);
  revalidateMonthlyMaterialRoutes(category);
}
