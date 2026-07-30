import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  LINK_CATEGORY_INCLUDE,
  mapLinkCategory,
  resolveLinkCategoryContent,
} from "@/lib/server/link-category-mapper";
import type {
  CreateLinkCategoryInput,
  LinkCategory,
  LinkCategoryAdminView,
  LinkCategoryMoveDirection,
  LinkCategorySummary,
  LinkCategoryTranslationView,
  UpdateLinkCategoryInput,
} from "@/types/link-category";

const ORDER_BY_DISPLAY_ORDER = [
  { displayOrder: "asc" as const },
  { createdAt: "asc" as const },
];

export class LinkCategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Link category not found: ${categoryId}`);
    this.name = "LinkCategoryNotFoundError";
  }
}

/** 同一階層（大分類同士、または同一の大分類配下の中分類同士）で既定言語（ja）の名称が重複（要件13.6） */
export class LinkCategoryNameConflictError extends Error {
  constructor(name: string) {
    super(`Link category name already exists in this hierarchy: ${name}`);
    this.name = "LinkCategoryNameConflictError";
  }
}

/** 配下にリンクまたは中分類が存在するため削除できない（要件13.8・13.9） */
export class LinkCategoryInUseError extends Error {
  readonly linkCount: number;
  readonly childCount: number;

  constructor(linkCount: number, childCount: number) {
    super(`Link category is in use (links: ${linkCount}, children: ${childCount})`);
    this.name = "LinkCategoryInUseError";
    this.linkCount = linkCount;
    this.childCount = childCount;
  }
}

/** 中分類の配下に中分類を作ろうとした、または存在しない親を指定した（要件12.2） */
export class LinkCategoryDepthError extends Error {
  constructor(parentId: string) {
    super(`Link category cannot be created under a non-parent category: ${parentId}`);
    this.name = "LinkCategoryDepthError";
  }
}

/** 大分類と中分類の親子関係が不整合（要件12.9） */
export class LinkCategoryPairError extends Error {
  constructor(categoryId: string, subCategoryId: string | null) {
    super(
      `Invalid link category pair: categoryId=${categoryId}, subCategoryId=${subCategoryId ?? "null"}`
    );
    this.name = "LinkCategoryPairError";
  }
}

function translationsToNestedWrite(translations: LinkCategoryTranslationView[]) {
  return {
    deleteMany: {},
    create: translations.map((translation) => ({
      locale: translation.locale,
      name: translation.name,
    })),
  };
}

/**
 * 同一階層（`parentId`が同じもの同士）で既定言語（ja）の名称が重複していないことを確認する。
 * `@@unique([parentId, name])`はPostgresがNULLを互いに異なる値として扱うため大分類同士には
 * 効かず、DB制約では表現できない。判定をこのサービス層に一元化する（要件13.6）。
 */
async function assertCategoryNameAvailable(
  parentId: string | null,
  name: string,
  excludeId?: string
): Promise<void> {
  const existing = await prisma.linkCategory.findFirst({
    where: {
      parentId,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new LinkCategoryNameConflictError(name);
  }
}

// ---- ヘルプデスク側（削除可否のUI判定に使う件数を同梱する）----

/**
 * 大分類を表示順（`displayOrder`昇順・同値時は`createdAt`昇順）で取得し、配下の中分類も
 * 同順序でincludeする。各カテゴリの直接紐づくリンク件数を同梱する。カテゴリ管理画面・
 * 削除可否のUI判定が利用する。
 */
export async function listLinkCategoriesForHelpdesk(): Promise<
  LinkCategoryAdminView[]
> {
  const parents = await prisma.linkCategory.findMany({
    where: { parentId: null },
    orderBy: ORDER_BY_DISPLAY_ORDER,
    include: {
      translations: true,
      _count: { select: { links: true } },
      children: {
        orderBy: ORDER_BY_DISPLAY_ORDER,
        include: {
          translations: true,
          _count: { select: { subCategoryLinks: true } },
        },
      },
    },
  });

  return parents.map((parent) => {
    const mappedParent = mapLinkCategory(parent);
    return {
      ...mappedParent,
      linkCount: parent._count.links,
      children: parent.children.map((child) => {
        const mappedChild = mapLinkCategory(child);
        return {
          ...mappedChild,
          linkCount: child._count.subCategoryLinks,
        };
      }),
    };
  });
}

/** ヘルプデスク側の単一カテゴリ取得。 */
export async function findLinkCategoryForHelpdesk(
  id: string
): Promise<LinkCategory | null> {
  const record = await prisma.linkCategory.findUnique({
    where: { id },
    include: LINK_CATEGORY_INCLUDE,
  });

  return record ? mapLinkCategory(record) : null;
}

/**
 * カテゴリを新規作成する。`parentId`が非nullのとき、親の存在と「親自身が大分類であること」
 * を検証し（要件12.2）、同一階層の名称重複を検証する（要件13.6）。`displayOrder`は同一階層の
 * 末尾（`max + 1`）として自動採番する（要件13.11）。
 */
export async function createLinkCategoryRecord(
  input: CreateLinkCategoryInput
): Promise<LinkCategory> {
  if (input.parentId !== null) {
    const parent = await prisma.linkCategory.findUnique({
      where: { id: input.parentId },
    });
    if (!parent || parent.parentId !== null) {
      throw new LinkCategoryDepthError(input.parentId);
    }
  }

  await assertCategoryNameAvailable(input.parentId, input.name);

  const aggregate = await prisma.linkCategory.aggregate({
    where: { parentId: input.parentId },
    _max: { displayOrder: true },
  });
  const displayOrder = (aggregate._max.displayOrder ?? -1) + 1;

  const record = await prisma.linkCategory.create({
    data: {
      parentId: input.parentId,
      name: input.name,
      displayOrder,
      translations: {
        create: input.translations.map((translation) => ({
          locale: translation.locale,
          name: translation.name,
        })),
      },
    },
    include: LINK_CATEGORY_INCLUDE,
  });

  return mapLinkCategory(record);
}

/**
 * カテゴリを更新する。`name`・`translations`（全置換）を更新し、`parentId`・`displayOrder`は
 * 更新対象外とする（所属大分類の付け替えはスコープ外、並び替えは専用関数）。
 * 名称重複判定は自分自身を除外して行う。
 */
export async function updateLinkCategoryRecord(
  id: string,
  input: UpdateLinkCategoryInput
): Promise<LinkCategory> {
  const existing = await prisma.linkCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new LinkCategoryNotFoundError(id);
  }

  await assertCategoryNameAvailable(existing.parentId, input.name, id);

  const record = await prisma.linkCategory.update({
    where: { id },
    data: {
      name: input.name,
      translations: translationsToNestedWrite(input.translations),
    },
    include: LINK_CATEGORY_INCLUDE,
  });

  return mapLinkCategory(record);
}

/**
 * カテゴリを削除する。削除直前に「当該カテゴリに紐づくリンク件数」（大分類は`categoryId`一致、
 * 中分類は`subCategoryId`一致）と「配下の中分類件数」を再取得し、いずれかが1件以上なら
 * `LinkCategoryInUseError`（件数を保持）を送出して削除しない（要件13.8〜13.10。TOCTOU対策）。
 * 両方0件のときのみ削除し、翻訳行は`onDelete: Cascade`で連鎖削除される。
 */
export async function deleteLinkCategoryRecord(id: string): Promise<void> {
  const existing = await prisma.linkCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new LinkCategoryNotFoundError(id);
  }

  const isParent = existing.parentId === null;
  const [linkCount, childCount] = await Promise.all([
    prisma.link.count({
      where: isParent ? { categoryId: id } : { subCategoryId: id },
    }),
    isParent ? prisma.linkCategory.count({ where: { parentId: id } }) : Promise.resolve(0),
  ]);

  if (linkCount > 0 || childCount > 0) {
    throw new LinkCategoryInUseError(linkCount, childCount);
  }

  await prisma.linkCategory.delete({ where: { id } });
}

/**
 * 同一階層（同一`parentId`）の`displayOrder`順で隣接する1件と`displayOrder`を
 * トランザクションで入れ替える。先頭で「上へ」・末尾で「下へ」の場合は何もしない。
 */
export async function moveLinkCategoryRecord(
  id: string,
  direction: LinkCategoryMoveDirection
): Promise<void> {
  const current = await prisma.linkCategory.findUnique({ where: { id } });
  if (!current) {
    throw new LinkCategoryNotFoundError(id);
  }

  const siblings = await prisma.linkCategory.findMany({
    where: { parentId: current.parentId },
    orderBy: ORDER_BY_DISPLAY_ORDER,
  });
  const index = siblings.findIndex((sibling) => sibling.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return;
  }

  const target = siblings[targetIndex];
  await prisma.$transaction([
    prisma.linkCategory.update({
      where: { id: current.id },
      data: { displayOrder: target.displayOrder },
    }),
    prisma.linkCategory.update({
      where: { id: target.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);
}

/**
 * リンク保存時に大分類・中分類の親子整合を検証する（要件12.9）。zodスキーマでは
 * 他レコードを参照できないため、この検証のみサービス層が担う。中分類がnullのときは受理する。
 */
export async function assertLinkCategoryPair(
  categoryId: string,
  subCategoryId: string | null
): Promise<void> {
  const category = await prisma.linkCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.parentId !== null) {
    throw new LinkCategoryPairError(categoryId, subCategoryId);
  }

  if (subCategoryId === null) {
    return;
  }

  const subCategory = await prisma.linkCategory.findUnique({
    where: { id: subCategoryId },
  });
  if (!subCategory || subCategory.parentId !== categoryId) {
    throw new LinkCategoryPairError(categoryId, subCategoryId);
  }
}

// ---- 申請者側（公開範囲を持たないため絞り込みなし。要件16.2）----

/**
 * 大分類・中分類を表示順で全件取得し、名前を`locale`で解決した状態で返す。
 * `LinkCategory`は公開範囲を持たないため、`documents-management`の
 * `listVisibleDocumentCategories`と異なり可視性フィルタは行わない。
 */
export async function getLinkCategoriesForApplicant(
  locale: string
): Promise<LinkCategorySummary[]> {
  const parents = await prisma.linkCategory.findMany({
    where: { parentId: null },
    orderBy: ORDER_BY_DISPLAY_ORDER,
    include: {
      translations: true,
      children: {
        orderBy: ORDER_BY_DISPLAY_ORDER,
        include: { translations: true },
      },
    },
  });

  return parents.map((parent) => {
    const mappedParent = mapLinkCategory(parent);
    return {
      id: mappedParent.id,
      name: resolveLinkCategoryContent(mappedParent, locale).name,
      displayOrder: mappedParent.displayOrder,
      subCategories: parent.children.map((child) => {
        const mappedChild = mapLinkCategory(child);
        return {
          id: mappedChild.id,
          name: resolveLinkCategoryContent(mappedChild, locale).name,
          displayOrder: mappedChild.displayOrder,
        };
      }),
    };
  });
}
