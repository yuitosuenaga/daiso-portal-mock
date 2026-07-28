import "server-only";

import type { Prisma, DocumentTargetingScope } from "@prisma/client";

import type { Document, DocumentTargeting } from "@/types/document";

/** 翻訳行を含むDocumentレコードの読み取り時のinclude句。 */
export const DOCUMENT_INCLUDE = {
  translations: true,
} as const satisfies Prisma.DocumentInclude;

export type PrismaDocumentWithTranslations = Prisma.DocumentGetPayload<{
  include: typeof DOCUMENT_INCLUDE;
}>;

/**
 * 公開範囲3列（`targetingScope`/`targetingCountries`/`targetingCompanyCodes`）を持つ
 * 構造的な型。`Document`・`DocumentCategory`のいずれのPrismaレコードも構造的部分型として
 * そのまま渡せるため、`mapTargeting`/`targetingToColumns`をカテゴリからも再利用できる。
 */
export interface DocumentTargetingColumns {
  targetingScope: DocumentTargetingScope;
  targetingCountries: string[];
  targetingCompanyCodes: string[];
}

export function mapTargeting(record: DocumentTargetingColumns): DocumentTargeting {
  if (record.targetingScope === "countries") {
    return { scope: "countries", countries: record.targetingCountries };
  }
  if (record.targetingScope === "companies") {
    return { scope: "companies", companyCodes: record.targetingCompanyCodes };
  }
  return { scope: "all" };
}

export function targetingToColumns(targeting: DocumentTargeting): {
  targetingScope: "all" | "countries" | "companies";
  targetingCountries: string[];
  targetingCompanyCodes: string[];
} {
  if (targeting.scope === "countries") {
    return {
      targetingScope: "countries",
      targetingCountries: targeting.countries,
      targetingCompanyCodes: [],
    };
  }
  if (targeting.scope === "companies") {
    return {
      targetingScope: "companies",
      targetingCountries: [],
      targetingCompanyCodes: targeting.companyCodes,
    };
  }
  return { targetingScope: "all", targetingCountries: [], targetingCompanyCodes: [] };
}

/**
 * `sourceType`と実際に保存されているフィールドの整合性が取れていないレコードを検出するための
 * 内部エラー。`toDocumentData`（document-service.ts）が書き込み時に必ず両分岐を正しく
 * 埋める・nullにする前提のため、通常は発生しない。発生した場合はプレビューが空表示になる
 * だけで気づけないよりも、早期に例外を送出して原因調査できるようにする。
 */
export class DocumentDataIntegrityError extends Error {
  constructor(documentId: string, sourceType: string) {
    super(
      `Document ${documentId} has sourceType "${sourceType}" but is missing the fields required for that source type`
    );
    this.name = "DocumentDataIntegrityError";
  }
}

export function mapDocument(record: PrismaDocumentWithTranslations): Document {
  const base = {
    id: record.id,
    title: record.title,
    description: record.description ?? undefined,
    status: record.status,
    targeting: mapTargeting(record),
    uploadedAt: record.uploadedAt.toISOString(),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description ?? undefined,
    })),
    categoryId: record.categoryId,
    subCategoryId: record.subCategoryId,
  };

  if (record.sourceType === "google") {
    if (!record.googleUrl || !record.googleEmbedUrl) {
      throw new DocumentDataIntegrityError(record.id, record.sourceType);
    }
    return {
      ...base,
      sourceType: "google",
      googleUrl: record.googleUrl,
      googleEmbedUrl: record.googleEmbedUrl,
    };
  }

  if (!record.fileName || !record.fileType || record.fileSize == null || !record.dataUrl) {
    throw new DocumentDataIntegrityError(record.id, record.sourceType);
  }
  return {
    ...base,
    sourceType: "upload",
    fileName: record.fileName,
    fileType: "application/pdf",
    fileSize: record.fileSize,
    dataUrl: record.dataUrl,
  };
}

/**
 * ドキュメントの既定言語。翻訳データが見つからない場合、常にこの言語にフォールバックする。
 * `document-service.ts`から参照される。
 */
export const DEFAULT_DOCUMENT_LOCALE = "ja";

/**
 * 指定した言語に対応するドキュメントのタイトル・説明を解決する。`locale`が既定言語（`ja`）の
 * ときは`document.title`/`description`を返す。それ以外は`document.translations`から`locale`が
 * 一致する行を探し、見つかればその内容を返す。一致する翻訳が無い場合、20か国以上へ発信する
 * 本ポータルの共通語である`en`翻訳を優先してフォールバックし、`en`翻訳も無い場合にのみ
 * 既定言語（`ja`）の内容にフォールバックする
 * （`resolveAnnouncementContent`と同一のフォールバック順序: `locale`一致 → `en` → `ja`）。
 */
export function resolveDocumentContent(
  document: Pick<Document, "title" | "description" | "translations">,
  locale: string
): { title: string; description?: string } {
  if (locale === DEFAULT_DOCUMENT_LOCALE) {
    return { title: document.title, description: document.description };
  }

  const translation = document.translations.find((item) => item.locale === locale);
  if (translation) {
    return { title: translation.title, description: translation.description };
  }

  const enTranslation = document.translations.find((item) => item.locale === "en");
  if (enTranslation) {
    return { title: enTranslation.title, description: enTranslation.description };
  }

  return { title: document.title, description: document.description };
}
