"use server";

import { revalidatePath } from "next/cache";

import { createLink, deleteLink, updateLink } from "@/lib/api/links";
import { linkFormSchema } from "@/lib/validation/link";
import type { CreateLinkInput, Link } from "@/types/link";

const HELPDESK_LINK_LIST_PATH = "/[locale]/helpdesk/links";
const HELPDESK_LINK_EDIT_PATH = "/[locale]/helpdesk/links/[id]/edit";
const APPLICANT_LINK_LIST_PATH = "/[locale]/links";

function revalidateLinkRoutes() {
  revalidatePath(HELPDESK_LINK_LIST_PATH, "page");
  revalidatePath(HELPDESK_LINK_EDIT_PATH, "page");
  revalidatePath(APPLICANT_LINK_LIST_PATH, "page");
}

/**
 * リンクを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力（タイトル・URLの未入力、無効なURL形式等）は保存せず例外を送出する。
 */
export async function createLinkAction(input: CreateLinkInput): Promise<Link> {
  const parsed = linkFormSchema.parse(input);
  const created = await createLink(parsed);
  revalidateLinkRoutes();

  return created;
}

/**
 * 既存リンクの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateLinkAction(
  id: string,
  input: CreateLinkInput
): Promise<Link> {
  const parsed = linkFormSchema.parse(input);
  const updated = await updateLink(id, parsed);
  revalidateLinkRoutes();

  return updated;
}

/**
 * リンクを削除し、ヘルプデスク側・申請者側のルートを再検証する。
 */
export async function deleteLinkAction(id: string): Promise<void> {
  await deleteLink(id);
  revalidateLinkRoutes();
}
