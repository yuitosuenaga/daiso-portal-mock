"use server";

import { revalidatePath } from "next/cache";

import {
  createManual,
  deleteManual,
  getManualByIdForHelpdesk,
  updateManual,
} from "@/lib/api/manuals";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { manualFormSchema } from "@/lib/validation/manual";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import type {
  CreateManualInput,
  ManualFormInput,
  ManualSaveResult,
  ManualTranslationView,
} from "@/types/manual";

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
function withServerRecomputedEmbedUrl<T extends ManualFormInput>(input: T): T {
  if (input.sourceType !== "google") return input;

  const googleEmbedUrl = toGoogleEmbedUrl(input.googleUrl);
  if (!googleEmbedUrl) {
    throw new Error("Invalid Google document URL");
  }

  return { ...input, googleEmbedUrl };
}

/**
 * 日本語の原文（title/description）を全対応言語へ自動翻訳し、翻訳行（`ja`以外）に変換する。
 * 翻訳に失敗したlocaleは翻訳行に含めず`failedLocales`で返す（`ja`のみで保存を続行するため）。
 */
async function translateManualContent(
  source: { title: string; description?: string },
  locales?: readonly string[]
): Promise<{ translations: ManualTranslationView[]; failedLocales: string[] }> {
  const { translations, failedLocales } = await autoTranslateFields(
    { title: source.title, description: source.description },
    locales ? { locales } : undefined
  );

  const rows: ManualTranslationView[] = Object.entries(translations).flatMap(
    ([locale, fields]) =>
      fields?.title
        ? [{ locale, title: fields.title, description: fields.description || undefined }]
        : []
  );

  return { translations: rows, failedLocales };
}

/**
 * マニュアルを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。不正な入力
 * （タイトル未入力、ファイル形式・サイズ不正、公開範囲0件選択など）は保存せず例外を送出する。
 * 日本語の原文は全対応言語へ自動翻訳して保存する。翻訳に失敗しても保存は続行し、
 * 失敗したlocaleを`failedLocales`で返す。
 */
export async function createManualAction(
  input: ManualFormInput
): Promise<ManualSaveResult> {
  const parsed = withServerRecomputedEmbedUrl(
    manualFormSchema.parse(input) as ManualFormInput
  );
  const { translations, failedLocales } = await translateManualContent(parsed);
  const created = await createManual({ ...parsed, translations } as CreateManualInput);
  revalidateManualRoutes();

  return { manual: created, failedLocales };
}

/**
 * 既存マニュアルの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力は保存せず例外を送出する。日本語の原文（title/description）が変更された場合のみ
 * 再翻訳し、変更が無ければ既存の翻訳を維持する。翻訳に失敗しても保存は続行する。
 */
export async function updateManualAction(
  id: string,
  input: ManualFormInput
): Promise<ManualSaveResult> {
  const parsed = withServerRecomputedEmbedUrl(
    manualFormSchema.parse(input) as ManualFormInput
  );
  const existing = await getManualByIdForHelpdesk(id);

  const sourceUnchanged =
    existing !== null &&
    existing.title === parsed.title &&
    (existing.description ?? "") === (parsed.description ?? "");

  let translations: ManualTranslationView[];
  let failedLocales: string[] = [];
  if (existing && sourceUnchanged) {
    translations = existing.translations;
  } else {
    ({ translations, failedLocales } = await translateManualContent(parsed));
  }

  const updated = await updateManual(id, { ...parsed, translations } as CreateManualInput);
  revalidateManualRoutes();

  return { manual: updated, failedLocales };
}

/**
 * 翻訳APIだけを再実行する。未保存の対応言語（`TRANSLATED_LOCALES`のうち翻訳行が無いもの）
 * のみを翻訳して保存し、なお失敗した言語を`failedLocales`で返す。ヘルプデスクセッション必須。
 */
export async function retranslateManualAction(
  id: string
): Promise<{ failedLocales: string[] }> {
  const existing = await getManualByIdForHelpdesk(id);
  if (!existing) {
    throw new Error(`Manual not found: ${id}`);
  }

  const saved = new Set(existing.translations.map((translation) => translation.locale));
  const missingLocales = TRANSLATED_LOCALES.filter((locale) => !saved.has(locale));
  if (missingLocales.length === 0) {
    return { failedLocales: [] };
  }

  const { translations, failedLocales } = await translateManualContent(
    existing,
    missingLocales
  );
  if (translations.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
    await updateManual(id, {
      ...rest,
      translations: [...existing.translations, ...translations],
    } as CreateManualInput);
    revalidateManualRoutes();
  }

  return { failedLocales };
}

/** マニュアルを削除し、ヘルプデスク側・申請者側のルートを再検証する。 */
export async function deleteManualAction(id: string): Promise<void> {
  await deleteManual(id);
  revalidateManualRoutes();
}
