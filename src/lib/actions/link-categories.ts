"use server";

import { revalidatePath } from "next/cache";

import {
  createLinkCategory,
  deleteLinkCategory,
  getLinkCategoryById,
  moveLinkCategory,
  updateLinkCategory,
} from "@/lib/api/link-categories";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  addLinkCategoryTranslations,
  LinkCategoryNotFoundError,
} from "@/lib/server/link-category-service";
import { linkCategoryFormSchema } from "@/lib/validation/link-category";
import type {
  LinkCategorySaveResult,
  LinkCategoryMoveDirection,
  LinkCategoryTranslationView,
} from "@/types/link-category";

const HELPDESK_CATEGORY_LIST_PATH = "/[locale]/helpdesk/links/categories";
const HELPDESK_LINK_LIST_PATH = "/[locale]/helpdesk/links";
const HELPDESK_LINK_NEW_PATH = "/[locale]/helpdesk/links/new";
const HELPDESK_LINK_EDIT_PATH = "/[locale]/helpdesk/links/[id]/edit";
const APPLICANT_LINK_LIST_PATH = "/[locale]/links";

/**
 * カテゴリの追加・編集・削除・並び替え完了時の再検証対象（要件13.13）。
 * カテゴリ管理画面・リンク管理一覧・リンクの作成/編集画面、および申請者側のリンク一覧を含める。
 */
function revalidateLinkCategoryRoutes() {
  revalidatePath(HELPDESK_CATEGORY_LIST_PATH, "page");
  revalidatePath(HELPDESK_LINK_LIST_PATH, "page");
  revalidatePath(HELPDESK_LINK_NEW_PATH, "page");
  revalidatePath(HELPDESK_LINK_EDIT_PATH, "page");
  revalidatePath(APPLICANT_LINK_LIST_PATH, "page");
}

/** 自動翻訳結果（locale→フィールド）を保存用の翻訳行へ変換する。 */
function toTranslationViews(
  translations: Record<string, Record<string, string>>
): LinkCategoryTranslationView[] {
  return Object.entries(translations).flatMap(([locale, fields]) =>
    fields.name ? [{ locale, name: fields.name }] : []
  );
}

/**
 * カテゴリを新規作成し、関連ルートを再検証する。`linkCategoryFormSchema`による
 * サーバー側再検証を行う（要件13.12・14.11）。名称重複・階層違反等、スキーマで
 * 表現できない検証はサービス層の例外をそのまま送出する。
 * `ja`の名称を全対応言語へ自動翻訳して保存する。翻訳失敗でも保存は継続し、`failedLocales`で返す。
 */
export async function createLinkCategoryAction(input: {
  parentId: string | null;
  name: string;
}): Promise<LinkCategorySaveResult> {
  const parsed = linkCategoryFormSchema.parse(input);
  const { translations, failedLocales } = await autoTranslateFields({ name: parsed.name });
  const created = await createLinkCategory({
    ...parsed,
    translations: toTranslationViews(translations),
  });
  revalidateLinkCategoryRoutes();

  return { category: created, failedLocales };
}

/** カテゴリを更新し、関連ルートを再検証する。`ja`の名称が変わった場合のみ再翻訳する。 */
export async function updateLinkCategoryAction(
  id: string,
  input: { name: string }
): Promise<LinkCategorySaveResult> {
  const parsed = linkCategoryFormSchema.parse({ parentId: null, ...input });
  const existing = await getLinkCategoryById(id);
  if (!existing) {
    throw new LinkCategoryNotFoundError(id);
  }

  let translations: LinkCategoryTranslationView[] | undefined;
  let failedLocales: string[] = [];
  if (existing.name !== parsed.name) {
    const result = await autoTranslateFields({ name: parsed.name });
    translations = toTranslationViews(result.translations);
    failedLocales = result.failedLocales;
  } else {
    const saved = new Set(existing.translations.map((item) => item.locale));
    failedLocales = TRANSLATED_LOCALES.filter((locale) => !saved.has(locale));
  }

  const updated = await updateLinkCategory(id, { name: parsed.name, translations });
  revalidateLinkCategoryRoutes();

  return { category: updated, failedLocales };
}

/**
 * 未翻訳のlocaleだけを翻訳して保存する（再翻訳）。ヘルプデスクセッションを要求する。
 * まだ翻訳できなかったlocaleを`failedLocales`で返す。
 */
export async function retranslateLinkCategoryAction(
  id: string
): Promise<LinkCategorySaveResult> {
  await requireHelpdeskStaffSession();
  const existing = await getLinkCategoryById(id);
  if (!existing) {
    throw new LinkCategoryNotFoundError(id);
  }

  const saved = new Set(existing.translations.map((item) => item.locale));
  const missingLocales = TRANSLATED_LOCALES.filter((locale) => !saved.has(locale));
  if (missingLocales.length === 0) {
    return { category: existing, failedLocales: [] };
  }

  const result = await autoTranslateFields({ name: existing.name }, { locales: missingLocales });
  const category = await addLinkCategoryTranslations(
    id,
    toTranslationViews(result.translations)
  );
  revalidateLinkCategoryRoutes();

  return { category, failedLocales: result.failedLocales };
}

/**
 * カテゴリを削除し、関連ルートを再検証する。使用中（紐づくリンク・配下の中分類が
 * 1件以上）の場合は`LinkCategoryInUseError`を送出し、削除・再検証は行わない。
 */
export async function deleteLinkCategoryAction(id: string): Promise<void> {
  await deleteLinkCategory(id);
  revalidateLinkCategoryRoutes();
}

/** カテゴリの表示順を並び替え、関連ルートを再検証する。 */
export async function moveLinkCategoryAction(
  id: string,
  direction: LinkCategoryMoveDirection
): Promise<void> {
  await moveLinkCategory(id, direction);
  revalidateLinkCategoryRoutes();
}
