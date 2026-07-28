import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { documentVisibleToWhere } from "@/lib/server/document-service";
import {
  DEFAULT_DOCUMENT_LOCALE,
  targetingToColumns,
} from "@/lib/server/document-mapper";
import {
  DOCUMENT_CATEGORY_INCLUDE,
  mapDocumentCategory,
  resolveDocumentCategoryContent,
} from "@/lib/server/document-category-mapper";
import type {
  CreateDocumentCategoryInput,
  DocumentCategory,
  DocumentCategoryAdminView,
  DocumentCategoryMoveDirection,
  DocumentCategorySummary,
  DocumentCategoryDetail,
  DocumentCategoryTranslationView,
  UpdateDocumentCategoryInput,
} from "@/types/document-category";

const ORDER_BY_DISPLAY_ORDER = [
  { displayOrder: "asc" as const },
  { createdAt: "asc" as const },
];

export class DocumentCategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Document category not found: ${categoryId}`);
    this.name = "DocumentCategoryNotFoundError";
  }
}

/** 同一階層（大分類同士、または同一の大分類配下の中分類同士）で既定言語（ja）の名称が重複（要件19.6） */
export class DocumentCategoryNameConflictError extends Error {
  constructor(name: string) {
    super(`Document category name already exists in this hierarchy: ${name}`);
    this.name = "DocumentCategoryNameConflictError";
  }
}

/** 配下にドキュメントまたは中分類が存在するため削除できない（要件19.8・19.9） */
export class DocumentCategoryInUseError extends Error {
  readonly documentCount: number;
  readonly childCount: number;

  constructor(documentCount: number, childCount: number) {
    super(
      `Document category is in use (documents: ${documentCount}, children: ${childCount})`
    );
    this.name = "DocumentCategoryInUseError";
    this.documentCount = documentCount;
    this.childCount = childCount;
  }
}

/** 中分類の配下に中分類を作ろうとした、または存在しない親を指定した（要件18.2） */
export class DocumentCategoryDepthError extends Error {
  constructor(parentId: string) {
    super(
      `Document category cannot be created under a non-parent category: ${parentId}`
    );
    this.name = "DocumentCategoryDepthError";
  }
}

/** 大分類と中分類の親子関係が不整合（要件18.9） */
export class DocumentCategoryPairError extends Error {
  constructor(categoryId: string, subCategoryId: string | null) {
    super(
      `Invalid document category pair: categoryId=${categoryId}, subCategoryId=${subCategoryId ?? "null"}`
    );
    this.name = "DocumentCategoryPairError";
  }
}

function translationsToNestedWrite(translations: DocumentCategoryTranslationView[]) {
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
 * 効かず、DB制約では表現できない。判定をこのサービス層に一元化する（要件19.6）。
 */
async function assertCategoryNameAvailable(
  parentId: string | null,
  name: string,
  excludeId?: string
): Promise<void> {
  const existing = await prisma.documentCategory.findFirst({
    where: {
      parentId,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw new DocumentCategoryNameConflictError(name);
  }
}

/**
 * カテゴリ自体の公開範囲述語（全体公開／対象国／対象販社）。ドキュメントの可視性述語
 * （`documentVisibleToWhere`）と異なり、カテゴリに公開状態（`status`）の概念は無いため
 * 含めない。
 */
function categoryVisibleToWhere(
  country: string,
  companyCode: string
): Prisma.DocumentCategoryWhereInput {
  return {
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
      { targetingScope: "companies", targetingCompanyCodes: { has: companyCode } },
    ],
  };
}

// ---- ヘルプデスク側（公開範囲で絞らない。要件21.9）----

/**
 * 大分類を表示順（`displayOrder`昇順・同値時は`createdAt`昇順）で取得し、配下の中分類も
 * 同順序でincludeする。各カテゴリの直接紐づくドキュメント件数（下書きを含み、公開範囲では
 * 絞らない）を同梱する。カテゴリ管理画面・削除可否のUI判定が利用する。
 */
export async function listDocumentCategoriesForHelpdesk(): Promise<
  DocumentCategoryAdminView[]
> {
  const parents = await prisma.documentCategory.findMany({
    where: { parentId: null },
    orderBy: ORDER_BY_DISPLAY_ORDER,
    include: {
      translations: true,
      _count: { select: { documents: true } },
      children: {
        orderBy: ORDER_BY_DISPLAY_ORDER,
        include: {
          translations: true,
          _count: { select: { subCategoryDocuments: true } },
        },
      },
    },
  });

  return parents.map((parent) => {
    const mappedParent = mapDocumentCategory(parent);
    return {
      ...mappedParent,
      documentCount: parent._count.documents,
      children: parent.children.map((child) => {
        const mappedChild = mapDocumentCategory(child);
        return {
          ...mappedChild,
          documentCount: child._count.subCategoryDocuments,
        };
      }),
    };
  });
}

/** ヘルプデスク側の単一カテゴリ取得。公開範囲・状態による絞り込みは行わない。 */
export async function findDocumentCategoryForHelpdesk(
  id: string
): Promise<DocumentCategory | null> {
  const record = await prisma.documentCategory.findUnique({
    where: { id },
    include: DOCUMENT_CATEGORY_INCLUDE,
  });

  return record ? mapDocumentCategory(record) : null;
}

/**
 * カテゴリを新規作成する。`parentId`が非nullのとき、親の存在と「親自身が大分類であること」
 * を検証し（要件18.2）、同一階層の名称重複を検証する（要件19.6）。`displayOrder`は同一階層の
 * 末尾（`max + 1`）として自動採番する（要件19.10）。
 */
export async function createDocumentCategoryRecord(
  input: CreateDocumentCategoryInput
): Promise<DocumentCategory> {
  if (input.parentId !== null) {
    const parent = await prisma.documentCategory.findUnique({
      where: { id: input.parentId },
    });
    if (!parent || parent.parentId !== null) {
      throw new DocumentCategoryDepthError(input.parentId);
    }
  }

  await assertCategoryNameAvailable(input.parentId, input.name);

  const targetingColumns = targetingToColumns(input.targeting);
  const aggregate = await prisma.documentCategory.aggregate({
    where: { parentId: input.parentId },
    _max: { displayOrder: true },
  });
  const displayOrder = (aggregate._max.displayOrder ?? -1) + 1;

  const record = await prisma.documentCategory.create({
    data: {
      parentId: input.parentId,
      name: input.name,
      displayOrder,
      ...targetingColumns,
      translations: {
        create: input.translations.map((translation) => ({
          locale: translation.locale,
          name: translation.name,
        })),
      },
    },
    include: DOCUMENT_CATEGORY_INCLUDE,
  });

  return mapDocumentCategory(record);
}

/**
 * カテゴリを更新する。`name`・`targeting`・`translations`（全置換）を更新し、`parentId`・
 * `displayOrder`は更新対象外とする（所属大分類の付け替えはスコープ外、並び替えは専用関数）。
 * 名称重複判定は自分自身を除外して行う。
 */
export async function updateDocumentCategoryRecord(
  id: string,
  input: UpdateDocumentCategoryInput
): Promise<DocumentCategory> {
  const existing = await prisma.documentCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new DocumentCategoryNotFoundError(id);
  }

  await assertCategoryNameAvailable(existing.parentId, input.name, id);

  const targetingColumns = targetingToColumns(input.targeting);
  const record = await prisma.documentCategory.update({
    where: { id },
    data: {
      name: input.name,
      ...targetingColumns,
      translations: translationsToNestedWrite(input.translations),
    },
    include: DOCUMENT_CATEGORY_INCLUDE,
  });

  return mapDocumentCategory(record);
}

/**
 * カテゴリを削除する。削除直前に「当該カテゴリに紐づくドキュメント件数」
 * （大分類は`categoryId`一致、中分類は`subCategoryId`一致）と「配下の中分類件数」を
 * 再取得し、いずれかが1件以上なら`DocumentCategoryInUseError`（件数を保持）を送出して
 * 削除しない（要件19.8〜19.10・19.12。TOCTOU対策）。両方0件のときのみ削除し、
 * 翻訳行は`onDelete: Cascade`で連鎖削除される。
 */
export async function deleteDocumentCategoryRecord(id: string): Promise<void> {
  const existing = await prisma.documentCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new DocumentCategoryNotFoundError(id);
  }

  const isParent = existing.parentId === null;
  const [documentCount, childCount] = await Promise.all([
    prisma.document.count({
      where: isParent ? { categoryId: id } : { subCategoryId: id },
    }),
    isParent ? prisma.documentCategory.count({ where: { parentId: id } }) : Promise.resolve(0),
  ]);

  if (documentCount > 0 || childCount > 0) {
    throw new DocumentCategoryInUseError(documentCount, childCount);
  }

  await prisma.documentCategory.delete({ where: { id } });
}

/**
 * 同一階層（同一`parentId`）の`displayOrder`順で隣接する1件と`displayOrder`を
 * トランザクションで入れ替える。先頭で「上へ」・末尾で「下へ」の場合は何もしない。
 */
export async function moveDocumentCategoryRecord(
  id: string,
  direction: DocumentCategoryMoveDirection
): Promise<void> {
  const current = await prisma.documentCategory.findUnique({ where: { id } });
  if (!current) {
    throw new DocumentCategoryNotFoundError(id);
  }

  const siblings = await prisma.documentCategory.findMany({
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
    prisma.documentCategory.update({
      where: { id: current.id },
      data: { displayOrder: target.displayOrder },
    }),
    prisma.documentCategory.update({
      where: { id: target.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);
}

/**
 * ドキュメント保存時に大分類・中分類の親子整合を検証する（要件18.9）。zodスキーマでは
 * 他レコードを参照できないため、この検証のみサービス層が担う。中分類がnullのときは受理する。
 */
export async function assertDocumentCategoryPair(
  categoryId: string,
  subCategoryId: string | null
): Promise<void> {
  const category = await prisma.documentCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.parentId !== null) {
    throw new DocumentCategoryPairError(categoryId, subCategoryId);
  }

  if (subCategoryId === null) {
    return;
  }

  const subCategory = await prisma.documentCategory.findUnique({
    where: { id: subCategoryId },
  });
  if (!subCategory || subCategory.parentId !== categoryId) {
    throw new DocumentCategoryPairError(categoryId, subCategoryId);
  }
}

// ---- 申請者側（公開範囲で絞る。要件21.6〜21.8）----

/**
 * 自社に可視な大分類のみを返す。「カテゴリ自体の公開範囲が自社に及ぶ」かつ「配下に
 * 自社へ公開された（`targeting`を満たし`status === "published"`である）ドキュメントが
 * 1件以上存在する」の両条件を満たす大分類のみを対象とする（要件21.6）。
 * `groupBy`で可視ドキュメントの大分類別件数を求め（カテゴリ未設定＝`categoryId: null`は
 * 除外され、どの大分類にも計上されない＝要件20.10相当）、公開範囲を満たす大分類のうち
 * 件数が1件以上のものだけを残す。
 */
export async function listVisibleDocumentCategories(
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<DocumentCategorySummary[]> {
  const grouped = await prisma.document.groupBy({
    by: ["categoryId"],
    where: {
      ...documentVisibleToWhere(country, companyCode),
      categoryId: { not: null },
    },
    _count: { _all: true },
  });
  const countByCategoryId = new Map<string, number>();
  for (const group of grouped) {
    if (group.categoryId) {
      countByCategoryId.set(group.categoryId, group._count._all);
    }
  }

  const categories = await prisma.documentCategory.findMany({
    where: { parentId: null, ...categoryVisibleToWhere(country, companyCode) },
    orderBy: ORDER_BY_DISPLAY_ORDER,
    include: DOCUMENT_CATEGORY_INCLUDE,
  });

  const summaries: DocumentCategorySummary[] = [];
  for (const record of categories) {
    const documentCount = countByCategoryId.get(record.id) ?? 0;
    if (documentCount === 0) {
      continue;
    }
    const mapped = mapDocumentCategory(record);
    summaries.push({
      id: mapped.id,
      name: resolveDocumentCategoryContent(mapped, locale).name,
      documentCount,
    });
  }

  return summaries;
}

/**
 * 指定IDが「大分類であり、かつカテゴリ自体が自社に可視」のときのみ返す。それ以外
 * （非可視・不存在・中分類ID）は`null`を返す（要件21.8）。配下の中分類は中分類自体の
 * 公開範囲のみで絞り込む（配下ドキュメント件数の条件は課さない＝要件21.7）。
 */
export async function findVisibleDocumentCategory(
  id: string,
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<DocumentCategoryDetail | null> {
  const record = await prisma.documentCategory.findFirst({
    where: { id, parentId: null, ...categoryVisibleToWhere(country, companyCode) },
    include: DOCUMENT_CATEGORY_INCLUDE,
  });
  if (!record) {
    return null;
  }

  const children = await prisma.documentCategory.findMany({
    where: { parentId: id, ...categoryVisibleToWhere(country, companyCode) },
    orderBy: ORDER_BY_DISPLAY_ORDER,
    include: DOCUMENT_CATEGORY_INCLUDE,
  });

  const mapped = mapDocumentCategory(record);
  return {
    id: mapped.id,
    name: resolveDocumentCategoryContent(mapped, locale).name,
    subCategories: children.map((child) => {
      const mappedChild = mapDocumentCategory(child);
      return {
        id: mappedChild.id,
        name: resolveDocumentCategoryContent(mappedChild, locale).name,
      };
    }),
  };
}
