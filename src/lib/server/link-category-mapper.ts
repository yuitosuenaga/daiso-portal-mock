import "server-only";

import type { Prisma } from "@prisma/client";

import type { LinkCategory } from "@/types/link-category";

/** カテゴリ名の既定言語。`LinkCategory.name`（親テーブルの列）がこの言語の内容を保持する。 */
export const DEFAULT_LINK_LOCALE = "ja";

/** 翻訳行を含むLinkCategoryレコードの読み取り時のinclude句。 */
export const LINK_CATEGORY_INCLUDE = {
  translations: true,
} as const satisfies Prisma.LinkCategoryInclude;

export type PrismaLinkCategoryWithTranslations = Prisma.LinkCategoryGetPayload<{
  include: typeof LINK_CATEGORY_INCLUDE;
}>;

export function mapLinkCategory(
  record: PrismaLinkCategoryWithTranslations
): LinkCategory {
  return {
    id: record.id,
    parentId: record.parentId,
    name: record.name,
    displayOrder: record.displayOrder,
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      name: translation.name,
    })),
  };
}

/**
 * 指定した言語に対応するカテゴリ名を解決する。`resolveDocumentCategoryContent`
 * （documents-management要件20.8）と同一のフォールバック順序
 * （`locale`一致 → `en` → 既定言語`ja`）を用いる（要件14.8）。
 */
export function resolveLinkCategoryContent(
  category: Pick<LinkCategory, "name" | "translations">,
  locale: string
): { name: string } {
  if (locale === DEFAULT_LINK_LOCALE) {
    return { name: category.name };
  }

  const translation = category.translations.find((item) => item.locale === locale);
  if (translation) {
    return { name: translation.name };
  }

  const enTranslation = category.translations.find((item) => item.locale === "en");
  if (enTranslation) {
    return { name: enTranslation.name };
  }

  return { name: category.name };
}
