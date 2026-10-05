import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertLinkCategoryPair } from "@/lib/server/link-category-service";
import type {
  CreateLinkInput,
  Link,
  LinkTranslationView,
  LinkWithTimestamp,
} from "@/types/link";

export class LinkNotFoundError extends Error {
  constructor(linkId: string) {
    super(`Link not found: ${linkId}`);
    this.name = "LinkNotFoundError";
  }
}

/**
 * `LinkWithTimestamp`は`@/types/link`が所有する表示用型。
 * 既存の`import { type LinkWithTimestamp } from "@/lib/server/link-service"`が
 * 壊れないよう、後方互換のためここから再エクスポートする。
 */
export type { LinkWithTimestamp } from "@/types/link";

interface LinkRecord {
  id: string;
  title: string;
  url: string;
  categoryId: string | null;
  subCategoryId: string | null;
  description: string | null;
  createdAt: Date;
  translations: { locale: string; title: string; description: string | null }[];
}

const LINK_INCLUDE = { translations: true } as const;

function translationsToNestedCreate(translations: LinkTranslationView[]) {
  return translations.map((translation) => ({
    locale: translation.locale,
    title: translation.title,
    description: translation.description ?? null,
  }));
}

function mapLink(record: LinkRecord): Link {
  return {
    id: record.id,
    title: record.title,
    url: record.url,
    categoryId: record.categoryId,
    subCategoryId: record.subCategoryId,
    description: record.description ?? undefined,
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description ?? undefined,
    })),
  };
}

function mapLinkWithTimestamp(record: LinkRecord): LinkWithTimestamp {
  return {
    ...mapLink(record),
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * リンク全件を、登録日（`createdAt`）降順・登録日を含めて取得する。
 * 申請者側一覧（`links-page`spec、新着バッジ・登録日表示）とヘルプデスク側の両方が利用する。
 */
export async function listLinks(): Promise<LinkWithTimestamp[]> {
  const records = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    include: LINK_INCLUDE,
  });

  return records.map(mapLinkWithTimestamp);
}

/** ヘルプデスク管理一覧向けに、登録日（`createdAt`）降順で全件を返す。 */
export async function listLinksForHelpdesk(): Promise<LinkWithTimestamp[]> {
  const records = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    include: LINK_INCLUDE,
  });

  return records.map(mapLinkWithTimestamp);
}

/** 指定されたIDのリンクを1件取得する。存在しない場合はnullを返す。 */
export async function findLinkById(id: string): Promise<Link | null> {
  const record = await prisma.link.findUnique({
    where: { id },
    include: LINK_INCLUDE,
  });

  return record ? mapLink(record) : null;
}

/**
 * リンクを新規作成する。登録日時（`createdAt`）はDBの既定値に委ねる。
 * 保存前に大分類・中分類の親子整合を検証する（要件12.9・12.10）。不整合の場合は
 * 保存せず`assertLinkCategoryPair`の例外をそのまま送出する。
 */
export async function createLinkRecord(input: CreateLinkInput): Promise<Link> {
  const subCategoryId = input.subCategoryId ?? null;
  await assertLinkCategoryPair(input.categoryId, subCategoryId);

  const record = await prisma.link.create({
    data: {
      title: input.title,
      url: input.url,
      categoryId: input.categoryId,
      subCategoryId,
      description: input.description,
      translations: {
        create: translationsToNestedCreate(input.translations ?? []),
      },
    },
    include: LINK_INCLUDE,
  });

  return mapLink(record);
}

/**
 * 既存リンクの内容を更新する。存在しない場合は`LinkNotFoundError`を送出する。
 * 保存前に大分類・中分類の親子整合を検証する（要件12.9・12.10）。
 */
export async function updateLinkRecord(
  id: string,
  input: CreateLinkInput
): Promise<Link> {
  const subCategoryId = input.subCategoryId ?? null;
  await assertLinkCategoryPair(input.categoryId, subCategoryId);

  try {
    const record = await prisma.link.update({
      where: { id },
      data: {
        title: input.title,
        url: input.url,
        categoryId: input.categoryId,
        subCategoryId,
        description: input.description,
        // 省略時（ja原文が変わっていない編集）は既存の翻訳行を変更しない
        ...(input.translations
          ? {
              translations: {
                deleteMany: {},
                create: translationsToNestedCreate(input.translations),
              },
            }
          : {}),
      },
      include: LINK_INCLUDE,
    });

    return mapLink(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new LinkNotFoundError(id);
    }
    throw error;
  }
}

/**
 * 指定リンクへ、未保存のlocaleの翻訳のみを追加する（再翻訳用）。既存localeの行は上書きしない。
 * 存在しない場合は`LinkNotFoundError`を送出する。
 */
export async function addLinkTranslations(
  id: string,
  translations: LinkTranslationView[]
): Promise<Link> {
  const existing = await prisma.link.findUnique({
    where: { id },
    include: LINK_INCLUDE,
  });
  if (!existing) {
    throw new LinkNotFoundError(id);
  }

  const savedLocales = new Set(existing.translations.map((item) => item.locale));
  const missing = translations.filter((item) => !savedLocales.has(item.locale));
  if (missing.length === 0) {
    return mapLink(existing);
  }

  const record = await prisma.link.update({
    where: { id },
    data: { translations: { create: translationsToNestedCreate(missing) } },
    include: LINK_INCLUDE,
  });

  return mapLink(record);
}

/** リンクを削除する。存在しない場合は`LinkNotFoundError`を送出する。 */
export async function deleteLinkRecord(id: string): Promise<void> {
  try {
    await prisma.link.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new LinkNotFoundError(id);
    }
    throw error;
  }
}
