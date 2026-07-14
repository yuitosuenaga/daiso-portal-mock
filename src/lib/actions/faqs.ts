"use server";

import { revalidatePath } from "next/cache";

import { createFaq, deleteFaq, updateFaq } from "@/lib/api/faqs";
import { faqFormSchema } from "@/lib/validation/faq";
import type { CreateFaqInput, Faq } from "@/types/faq";

const HELPDESK_FAQ_LIST_PATH = "/[locale]/helpdesk/faq";
const HELPDESK_FAQ_EDIT_PATH = "/[locale]/helpdesk/faq/[id]/edit";
const APPLICANT_FAQ_LIST_PATH = "/[locale]/faq";

function revalidateFaqRoutes() {
  revalidatePath(HELPDESK_FAQ_LIST_PATH, "page");
  revalidatePath(HELPDESK_FAQ_EDIT_PATH, "page");
  revalidatePath(APPLICANT_FAQ_LIST_PATH, "page");
}

/**
 * FAQを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力（質問・回答・カテゴリの未入力等）は保存せず例外を送出する。
 */
export async function createFaqAction(input: CreateFaqInput): Promise<Faq> {
  const parsed = faqFormSchema.parse(input);
  const created = await createFaq(parsed);
  revalidateFaqRoutes();

  return created;
}

/**
 * 既存FAQの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateFaqAction(
  id: string,
  input: CreateFaqInput
): Promise<Faq> {
  const parsed = faqFormSchema.parse(input);
  const updated = await updateFaq(id, parsed);
  revalidateFaqRoutes();

  return updated;
}

/**
 * FAQを削除し、ヘルプデスク側・申請者側のルートを再検証する。
 */
export async function deleteFaqAction(id: string): Promise<void> {
  await deleteFaq(id);
  revalidateFaqRoutes();
}
