"use server";

import { revalidatePath } from "next/cache";

import {
  createFaq,
  deleteFaq,
  getFaqByIdForHelpdesk,
  updateFaq,
} from "@/lib/api/faqs";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import {
  FaqNotFoundError,
  findFaqById,
  upsertFaqTranslations,
} from "@/lib/server/faq-service";
import { faqFormSchema, type FaqFormValues } from "@/lib/validation/faq";
import type { Faq, FaqTranslationView } from "@/types/faq";

const HELPDESK_FAQ_LIST_PATH = "/[locale]/helpdesk/faq";
const HELPDESK_FAQ_EDIT_PATH = "/[locale]/helpdesk/faq/[id]/edit";
const APPLICANT_FAQ_LIST_PATH = "/[locale]/faq";

/** 保存系アクションの結果。`failedLocales`が空でなければ一部言語の自動翻訳が未保存。 */
export interface FaqSaveResult {
  faq: Faq;
  failedLocales: string[];
}

function revalidateFaqRoutes() {
  revalidatePath(HELPDESK_FAQ_LIST_PATH, "page");
  revalidatePath(HELPDESK_FAQ_EDIT_PATH, "page");
  revalidatePath(APPLICANT_FAQ_LIST_PATH, "page");
}

function toTranslationViews(
  translations: Record<string, Record<string, string>>
): FaqTranslationView[] {
  return Object.entries(translations).map(([locale, fields]) => ({
    locale,
    question: fields.question,
    answer: fields.answer,
  }));
}

/**
 * FAQを新規作成する。日本語の質問・回答を全対応言語へ自動翻訳して保存する。
 * 翻訳に失敗しても保存は継続し（jaのみ）、失敗したlocaleを`failedLocales`で返す。
 * 不正な入力は保存せず例外を送出する。
 */
export async function createFaqAction(input: FaqFormValues): Promise<FaqSaveResult> {
  const parsed = faqFormSchema.parse(input);
  const { translations, failedLocales } = await autoTranslateFields({
    question: parsed.question,
    answer: parsed.answer,
  });
  const created = await createFaq({ ...parsed, translations: toTranslationViews(translations) });
  revalidateFaqRoutes();

  return { faq: created, failedLocales };
}

/**
 * 既存FAQの内容を更新する。日本語の質問・回答が変わった場合のみ全言語を再翻訳し、
 * 変わらない場合は既存の翻訳を維持する。翻訳失敗時も保存は継続する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateFaqAction(
  id: string,
  input: FaqFormValues
): Promise<FaqSaveResult> {
  const parsed = faqFormSchema.parse(input);
  const existing = await getFaqByIdForHelpdesk(id);
  if (!existing) {
    throw new FaqNotFoundError(id);
  }

  const sourceChanged =
    existing.question !== parsed.question || existing.answer !== parsed.answer;

  let translations = existing.translations;
  let failedLocales: string[] = [];
  if (sourceChanged) {
    const result = await autoTranslateFields({
      question: parsed.question,
      answer: parsed.answer,
    });
    translations = toTranslationViews(result.translations);
    failedLocales = result.failedLocales;
  }

  const updated = await updateFaq(id, { ...parsed, translations });
  revalidateFaqRoutes();

  return { faq: updated, failedLocales };
}

/**
 * 不足している言語（`TRANSLATED_LOCALES`のうち未保存のもの）だけを翻訳して保存する。
 * ヘルプデスクセッションを要求する。再翻訳でも失敗したlocaleは`failedLocales`で返す。
 */
export async function retranslateFaqAction(
  id: string
): Promise<{ failedLocales: string[] }> {
  await requireHelpdeskStaffSession();

  const faq = await findFaqById(id);
  if (!faq) {
    throw new FaqNotFoundError(id);
  }

  const existingLocales = new Set(faq.translations.map((translation) => translation.locale));
  const missingLocales = TRANSLATED_LOCALES.filter((locale) => !existingLocales.has(locale));
  if (missingLocales.length === 0) {
    return { failedLocales: [] };
  }

  const { translations, failedLocales } = await autoTranslateFields(
    { question: faq.question, answer: faq.answer },
    { locales: missingLocales }
  );
  const views = toTranslationViews(translations);
  if (views.length > 0) {
    await upsertFaqTranslations(id, views);
    revalidateFaqRoutes();
  }

  return { failedLocales };
}

/**
 * FAQを削除し、ヘルプデスク側・申請者側のルートを再検証する。
 */
export async function deleteFaqAction(id: string): Promise<void> {
  await deleteFaq(id);
  revalidateFaqRoutes();
}
