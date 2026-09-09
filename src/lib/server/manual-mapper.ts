import "server-only";

import type { Prisma, ManualTargetingScope } from "@prisma/client";

import type { Manual, ManualTargeting } from "@/types/manual";

/** 翻訳行を含むManualレコードの読み取り時のinclude句。 */
export const MANUAL_INCLUDE = {
  translations: true,
} as const satisfies Prisma.ManualInclude;

export type PrismaManualWithTranslations = Prisma.ManualGetPayload<{
  include: typeof MANUAL_INCLUDE;
}>;

/**
 * 公開範囲3列（`targetingScope`/`targetingCountries`/`targetingCompanyCodes`）を持つ
 * 構造的な型（`document-mapper.ts`の`DocumentTargetingColumns`と同型のパターン）。
 */
export interface ManualTargetingColumns {
  targetingScope: ManualTargetingScope;
  targetingCountries: string[];
  targetingCompanyCodes: string[];
}

export function mapTargeting(record: ManualTargetingColumns): ManualTargeting {
  if (record.targetingScope === "countries") {
    return { scope: "countries", countries: record.targetingCountries };
  }
  if (record.targetingScope === "companies") {
    return { scope: "companies", companyCodes: record.targetingCompanyCodes };
  }
  return { scope: "all" };
}

export function targetingToColumns(targeting: ManualTargeting): {
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
 * 内部エラー。`toManualData`（manual-service.ts）が書き込み時に必ず両分岐を正しく埋める・
 * nullにする前提のため、通常は発生しない（`document-mapper.ts`の`DocumentDataIntegrityError`
 * と同型）。
 */
export class ManualDataIntegrityError extends Error {
  constructor(manualId: string, sourceType: string) {
    super(
      `Manual ${manualId} has sourceType "${sourceType}" but is missing the fields required for that source type`
    );
    this.name = "ManualDataIntegrityError";
  }
}

export function mapManual(record: PrismaManualWithTranslations): Manual {
  const base = {
    id: record.id,
    title: record.title,
    description: record.description ?? undefined,
    category: record.category,
    year: record.year,
    month: record.month,
    targeting: mapTargeting(record),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description ?? undefined,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };

  if (record.sourceType === "google") {
    if (!record.googleUrl || !record.googleEmbedUrl) {
      throw new ManualDataIntegrityError(record.id, record.sourceType);
    }
    return {
      ...base,
      sourceType: "google",
      googleUrl: record.googleUrl,
      googleEmbedUrl: record.googleEmbedUrl,
    };
  }

  if (!record.fileName || !record.fileType || record.fileSize == null || !record.dataUrl) {
    throw new ManualDataIntegrityError(record.id, record.sourceType);
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
 * マニュアルの既定言語。翻訳データが見つからない場合、常にこの言語にフォールバックする。
 * `manual-service.ts`から参照される。
 */
export const DEFAULT_MANUAL_LOCALE = "ja";

/**
 * 指定した言語に対応するマニュアルのタイトル・説明を解決する。`locale`が既定言語（`ja`）の
 * ときは`manual.title`/`description`を返す。それ以外は`manual.translations`から`locale`が
 * 一致する行を探し、見つかればその内容を返す。一致する翻訳が無い場合、共通語である`en`翻訳を
 * 優先してフォールバックし、`en`翻訳も無い場合にのみ既定言語（`ja`）の内容にフォールバックする
 * （`resolveDocumentContent`と同一のフォールバック順序: `locale`一致 → `en` → `ja`）。
 */
export function resolveManualContent(
  manual: Pick<Manual, "title" | "description" | "translations">,
  locale: string
): { title: string; description?: string } {
  if (locale === DEFAULT_MANUAL_LOCALE) {
    return { title: manual.title, description: manual.description };
  }

  const translation = manual.translations.find((item) => item.locale === locale);
  if (translation) {
    return { title: translation.title, description: translation.description };
  }

  const enTranslation = manual.translations.find((item) => item.locale === "en");
  if (enTranslation) {
    return { title: enTranslation.title, description: enTranslation.description };
  }

  return { title: manual.title, description: manual.description };
}
