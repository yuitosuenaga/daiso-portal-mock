"use server";

import { revalidatePath } from "next/cache";

import {
  createLinkCategory,
  deleteLinkCategory,
  moveLinkCategory,
  updateLinkCategory,
} from "@/lib/api/link-categories";
import { linkCategoryFormSchema } from "@/lib/validation/link-category";
import type {
  CreateLinkCategoryInput,
  LinkCategory,
  LinkCategoryMoveDirection,
  UpdateLinkCategoryInput,
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

/**
 * カテゴリを新規作成し、関連ルートを再検証する。`linkCategoryFormSchema`による
 * サーバー側再検証を行う（要件13.12・14.11）。名称重複・階層違反等、スキーマで
 * 表現できない検証はサービス層の例外をそのまま送出する。
 */
export async function createLinkCategoryAction(
  input: CreateLinkCategoryInput
): Promise<LinkCategory> {
  const parsed = linkCategoryFormSchema.parse(input);
  const created = await createLinkCategory(parsed);
  revalidateLinkCategoryRoutes();

  return created;
}

/** カテゴリを更新し、関連ルートを再検証する。 */
export async function updateLinkCategoryAction(
  id: string,
  input: UpdateLinkCategoryInput
): Promise<LinkCategory> {
  const parsed = linkCategoryFormSchema.parse({ parentId: null, ...input });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parentId, ...updateInput } = parsed;
  const updated = await updateLinkCategory(id, updateInput);
  revalidateLinkCategoryRoutes();

  return updated;
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
