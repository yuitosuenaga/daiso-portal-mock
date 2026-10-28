import "server-only";

import type { MonthlyMaterialTargetingScope, Prisma } from "@prisma/client";

import type {
  MonthlyMaterial,
  MonthlyMaterialSummary,
  MonthlyMaterialTargeting,
} from "@/types/monthly-material";

/** 翻訳を持たないため、`Document`と異なりincludeは不要。読み取り時の型を明示するために定義する。 */
export type PrismaMonthlyMaterial = Prisma.MonthlyMaterialGetPayload<Record<string, never>>;

/**
 * 一覧・保存結果用のselect句。ファイル本体（`dataUrl`、Base64で最大約27MB/件）を読み込まず、
 * メタデータだけをホワイトリストで取得する。本体は`MONTHLY_MATERIAL_FILE_SELECT`で
 * 配信ルートが1件ずつ読む。
 */
export const MONTHLY_MATERIAL_SUMMARY_SELECT = {
  id: true,
  category: true,
  department: true,
  year: true,
  month: true,
  sourceType: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  googleUrl: true,
  googleEmbedUrl: true,
  targetingScope: true,
  targetingCountries: true,
  targetingCompanyCodes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.MonthlyMaterialSelect;

export type PrismaMonthlyMaterialSummary = Prisma.MonthlyMaterialGetPayload<{
  select: typeof MONTHLY_MATERIAL_SUMMARY_SELECT;
}>;

/** ファイル配信ルート用のselect句（1件分のファイル本体を読む）。 */
export const MONTHLY_MATERIAL_FILE_SELECT = {
  sourceType: true,
  fileName: true,
  fileType: true,
  dataUrl: true,
} as const satisfies Prisma.MonthlyMaterialSelect;

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

/** 一覧用。`dataUrl`を読み込まず、出力にも含めない。 */
export function mapMonthlyMaterialSummary(
  record: PrismaMonthlyMaterialSummary
): MonthlyMaterialSummary {
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

  if (!record.fileName || !record.fileType || record.fileSize == null) {
    throw new MonthlyMaterialDataIntegrityError(record.id, record.sourceType);
  }
  return {
    ...base,
    sourceType: "upload",
    fileName: record.fileName,
    fileType: "application/pdf",
    fileSize: record.fileSize,
  };
}

/** 詳細用（`dataUrl`を含む）。 */
export function mapMonthlyMaterial(record: PrismaMonthlyMaterial): MonthlyMaterial {
  const summary = mapMonthlyMaterialSummary(record);
  if (summary.sourceType === "google") {
    return summary;
  }
  if (!record.dataUrl) {
    throw new MonthlyMaterialDataIntegrityError(record.id, record.sourceType);
  }
  return { ...summary, dataUrl: record.dataUrl };
}
