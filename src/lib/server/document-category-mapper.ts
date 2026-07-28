import "server-only";

import type { Prisma } from "@prisma/client";

import { DEFAULT_DOCUMENT_LOCALE, mapTargeting } from "@/lib/server/document-mapper";
import type { DocumentCategory } from "@/types/document-category";

/** 翻訳行を含むDocumentCategoryレコードの読み取り時のinclude句。 */
export const DOCUMENT_CATEGORY_INCLUDE = {
  translations: true,
} as const satisfies Prisma.DocumentCategoryInclude;

export type PrismaDocumentCategoryWithTranslations = Prisma.DocumentCategoryGetPayload<{
  include: typeof DOCUMENT_CATEGORY_INCLUDE;
}>;

export function mapDocumentCategory(
  record: PrismaDocumentCategoryWithTranslations
): DocumentCategory {
  return {
    id: record.id,
    parentId: record.parentId,
    name: record.name,
    displayOrder: record.displayOrder,
    targeting: mapTargeting(record),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      name: translation.name,
    })),
  };
}

/**
 * 指定した言語に対応するカテゴリ名を解決する。`resolveDocumentContent`と同一の
 * フォールバック順序（`locale`一致 → `en` → 既定言語`ja`）を用いる（要件20.8）。
 * 既定言語は`document-mapper.ts`の`DEFAULT_DOCUMENT_LOCALE`を再利用し、
 * カテゴリ専用の定数を新設しない。
 */
export function resolveDocumentCategoryContent(
  category: Pick<DocumentCategory, "name" | "translations">,
  locale: string
): { name: string } {
  if (locale === DEFAULT_DOCUMENT_LOCALE) {
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
