"use server";

import { revalidatePath } from "next/cache";

import { createManual, deleteManual, updateManual } from "@/lib/api/manuals";
import { manualFormSchema } from "@/lib/validation/manual";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import type { CreateManualInput, Manual } from "@/types/manual";

const HELPDESK_MANUAL_LIST_PATH = "/[locale]/helpdesk/manuals";
const HELPDESK_MANUAL_NEW_PATH = "/[locale]/helpdesk/manuals/new";
const HELPDESK_MANUAL_EDIT_PATH = "/[locale]/helpdesk/manuals/[id]/edit";
const APPLICANT_MANUAL_LIST_PATH = "/[locale]/manuals";

function revalidateManualRoutes() {
  revalidatePath(HELPDESK_MANUAL_LIST_PATH, "page");
  revalidatePath(HELPDESK_MANUAL_NEW_PATH, "page");
  revalidatePath(HELPDESK_MANUAL_EDIT_PATH, "page");
  revalidatePath(APPLICANT_MANUAL_LIST_PATH, "page");
}

/**
 * `sourceType: "google"`の場合、`googleEmbedUrl`をクライアントから送られた値のまま信頼せず、
 * `googleUrl`からサーバー側で再計算する。クライアントが任意の埋め込みURLを注入する経路を
 * 防ぐための措置（`documents`specの`withServerRecomputedEmbedUrl`と同型）。
 */
function withServerRecomputedEmbedUrl(input: CreateManualInput): CreateManualInput {
  if (input.sourceType !== "google") return input;

  const googleEmbedUrl = toGoogleEmbedUrl(input.googleUrl);
  if (!googleEmbedUrl) {
    throw new Error("Invalid Google document URL");
  }

  return { ...input, googleEmbedUrl };
}

/**
 * マニュアルを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。不正な入力
 * （タイトル未入力、ファイル形式・サイズ不正、公開範囲0件選択など）は保存せず例外を送出する。
 */
export async function createManualAction(
  input: CreateManualInput
): Promise<Manual> {
  const parsed = manualFormSchema.parse(input);
  const created = await createManual(withServerRecomputedEmbedUrl(parsed));
  revalidateManualRoutes();

  return created;
}

/**
 * 既存マニュアルの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateManualAction(
  id: string,
  input: CreateManualInput
): Promise<Manual> {
  const parsed = manualFormSchema.parse(input);
  const updated = await updateManual(id, withServerRecomputedEmbedUrl(parsed));
  revalidateManualRoutes();

  return updated;
}

/** マニュアルを削除し、ヘルプデスク側・申請者側のルートを再検証する。 */
export async function deleteManualAction(id: string): Promise<void> {
  await deleteManual(id);
  revalidateManualRoutes();
}
