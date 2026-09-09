import "server-only";

import type { MonthlyMaterialTargetingScope, Prisma } from "@prisma/client";

import type { MonthlyMaterial, MonthlyMaterialTargeting } from "@/types/monthly-material";

/** 翻訳を持たないため、`Document`と異なりincludeは不要。読み取り時の型を明示するために定義する。 */
export type PrismaMonthlyMaterial = Prisma.MonthlyMaterialGetPayload<Record<string, never>>;

/**
 * 公開範囲3列（`targetingScope`/`targetingCountries`/`targetingCompanyCodes`）を持つ
 * 構造的な型。`document-mapper.ts`の`DocumentTargetingColumns`と同型のパターン。
 */
export interface MonthlyMaterialTargetingColumns {
  targetingScope: MonthlyMaterialTargetingScope;
  targetingCountries: string[];
  targetingCompanyCodes: string[];
}

export function mapTargeting(
  record: MonthlyMaterialTargetingColumns
): MonthlyMaterialTargeting {
  if (record.targetingScope === "countries") {
    return { scope: "countries", countries: record.targetingCountries };
  }
  if (record.targetingScope === "companies") {
    return { scope: "companies", companyCodes: record.targetingCompanyCodes };
  }
  return { scope: "all" };
}

export function targetingToColumns(targeting: MonthlyMaterialTargeting): {
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
 * 内部エラー。`toMonthlyMaterialData`（monthly-material-service.ts）が書き込み時に必ず両分岐を
 * 正しく埋める・nullにする前提のため、通常は発生しない（`document-mapper.ts`の
 * `DocumentDataIntegrityError`と同型）。
 */
export class MonthlyMaterialDataIntegrityError extends Error {
  constructor(materialId: string, sourceType: string) {
    super(
      `MonthlyMaterial ${materialId} has sourceType "${sourceType}" but is missing the fields required for that source type`
    );
    this.name = "MonthlyMaterialDataIntegrityError";
  }
}

export function mapMonthlyMaterial(record: PrismaMonthlyMaterial): MonthlyMaterial {
  const base = {
    id: record.id,
    category: record.category,
    department: record.department,
    year: record.year,
    month: record.month,
    targeting: mapTargeting(record),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };

  if (record.sourceType === "google") {
    if (!record.googleUrl || !record.googleEmbedUrl) {
      throw new MonthlyMaterialDataIntegrityError(record.id, record.sourceType);
    }
    return {
      ...base,
      sourceType: "google",
      googleUrl: record.googleUrl,
      googleEmbedUrl: record.googleEmbedUrl,
    };
  }

  if (!record.fileName || !record.fileType || record.fileSize == null || !record.dataUrl) {
    throw new MonthlyMaterialDataIntegrityError(record.id, record.sourceType);
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
