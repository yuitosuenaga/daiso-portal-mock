"use server";

import { revalidatePath } from "next/cache";

import {
  createLink,
  deleteLink,
  getLinkByIdForHelpdesk,
  updateLink,
} from "@/lib/api/links";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { addLinkTranslations, LinkNotFoundError } from "@/lib/server/link-service";
import { linkFormSchema } from "@/lib/validation/link";
import type { CreateLinkInput, LinkSaveResult, LinkTranslationView } from "@/types/link";

const HELPDESK_LINK_LIST_PATH = "/[locale]/helpdesk/links";
const HELPDESK_LINK_EDIT_PATH = "/[locale]/helpdesk/links/[id]/edit";
const APPLICANT_LINK_LIST_PATH = "/[locale]/links";

function revalidateLinkRoutes() {
  revalidatePath(HELPDESK_LINK_LIST_PATH, "page");
  revalidatePath(HELPDESK_LINK_EDIT_PATH, "page");
  revalidatePath(APPLICANT_LINK_LIST_PATH, "page");
}

/** 自動翻訳結果（locale→フィールド）を保存用の翻訳行へ変換する。 */
function toTranslationViews(
  translations: Record<string, Record<string, string>>
): LinkTranslationView[] {
  return Object.entries(translations).flatMap(([locale, fields]) =>
    fields.title
      ? [{ locale, title: fields.title, description: fields.description || undefined }]
      : []
  );
}

/**
 * リンクを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力（タイトル・URLの未入力、無効なURL形式等）は保存せず例外を送出する。
 * `ja`のタイトル・説明を全対応言語へ自動翻訳して保存する。翻訳に失敗しても保存は継続し、
 * 失敗したlocaleを`failedLocales`で返す。
 */
export async function createLinkAction(input: CreateLinkInput): Promise<LinkSaveResult> {
  const parsed = linkFormSchema.parse(input);
  const { translations, failedLocales } = await autoTranslateFields({
    title: parsed.title,
    description: parsed.description,
  });
  const created = await createLink({
    ...parsed,
    translations: toTranslationViews(translations),
  });
  revalidateLinkRoutes();

  return { link: created, failedLocales };
}

/**
 * 既存リンクの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力は保存せず例外を送出する。`ja`のタイトル・説明が変わった場合のみ再翻訳する
 * （変わっていなければ既存の翻訳行を保持する）。
 */
export async function updateLinkAction(
  id: string,
  input: CreateLinkInput
): Promise<LinkSaveResult> {
  const parsed = linkFormSchema.parse(input);
  const existing = await getLinkByIdForHelpdesk(id);
  if (!existing) {
    throw new LinkNotFoundError(id);
  }

  const sourceChanged =
    existing.title !== parsed.title ||
    (existing.description ?? "") !== (parsed.description ?? "");

  let translations: LinkTranslationView[] | undefined;
  let failedLocales: string[] = [];
  if (sourceChanged) {
    const result = await autoTranslateFields({
      title: parsed.title,
      description: parsed.description,
    });
    translations = toTranslationViews(result.translations);
    failedLocales = result.failedLocales;
  } else {
    const saved = new Set((existing.translations ?? []).map((item) => item.locale));
    failedLocales = TRANSLATED_LOCALES.filter((locale) => !saved.has(locale));
  }

  const updated = await updateLink(id, { ...parsed, translations });
  revalidateLinkRoutes();

  return { link: updated, failedLocales };
}

/**
 * 未翻訳のlocaleだけを翻訳して保存する（再翻訳）。ヘルプデスクセッションを要求する。
 * まだ翻訳できなかったlocaleを`failedLocales`で返す。
 */
export async function retranslateLinkAction(id: string): Promise<LinkSaveResult> {
  await requireHelpdeskStaffSession();
  const existing = await getLinkByIdForHelpdesk(id);
  if (!existing) {
    throw new LinkNotFoundError(id);
  }

  const saved = new Set((existing.translations ?? []).map((item) => item.locale));
  const missingLocales = TRANSLATED_LOCALES.filter((locale) => !saved.has(locale));
  if (missingLocales.length === 0) {
    return { link: existing, failedLocales: [] };
  }

  const result = await autoTranslateFields(
    { title: existing.title, description: existing.description },
    { locales: missingLocales }
  );
  const link = await addLinkTranslations(id, toTranslationViews(result.translations));
  revalidateLinkRoutes();

  return { link, failedLocales: result.failedLocales };
}

/**
 * リンクを削除し、ヘルプデスク側・申請者側のルートを再検証する。
 */
export async function deleteLinkAction(id: string): Promise<void> {
  await deleteLink(id);
  revalidateLinkRoutes();
}
