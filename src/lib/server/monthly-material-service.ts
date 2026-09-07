import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  mapMonthlyMaterial,
  targetingToColumns,
} from "@/lib/server/monthly-material-mapper";
import type {
  CreateMonthlyMaterialInput,
  MonthlyMaterial,
  MonthlyMaterialCategory,
} from "@/types/monthly-material";

export class MonthlyMaterialNotFoundError extends Error {
  constructor(materialId: string) {
    super(`MonthlyMaterial not found: ${materialId}`);
    this.name = "MonthlyMaterialNotFoundError";
  }
}

/**
 * 同一カテゴリ内で既に登録済みの年月と重複する年月を登録・変更しようとしたことを表すエラー。
 * `@@unique([category, year, month])`制約違反（Prismaの`P2002`）から変換して送出する。
 */
export class DuplicateYearMonthError extends Error {
  constructor(
    public readonly category: MonthlyMaterialCategory,
    public readonly year: number,
    public readonly month: number
  ) {
    super(`MonthlyMaterial already exists for ${category} ${year}-${month}`);
    this.name = "DuplicateYearMonthError";
  }
}

const ORDER_BY_YEAR_MONTH_DESC: Prisma.MonthlyMaterialOrderByWithRelationInput[] = [
  { year: "desc" },
  { month: "desc" },
];

/**
 * `CreateMonthlyMaterialInput`をPrismaの書き込み用データへ変換する。`sourceType`の分岐で
 * 使われない側のフィールドは明示的に`null`にし、編集時に登録方式が切り替わっても前の方式の
 * データが残留しないようにする（`document-service.ts`の`toDocumentData`と同型）。
 */
function toMonthlyMaterialData(
  input: CreateMonthlyMaterialInput
): Omit<Prisma.MonthlyMaterialUncheckedCreateInput, "category" | "year" | "month"> {
  const targetingColumns = targetingToColumns(input.targeting);

  if (input.sourceType === "google") {
    return {
      sourceType: "google",
      fileName: null,
      fileType: null,
      fileSize: null,
      dataUrl: null,
      googleUrl: input.googleUrl,
      googleEmbedUrl: input.googleEmbedUrl,
      ...targetingColumns,
    };
  }

  return {
    sourceType: "upload",
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    dataUrl: input.dataUrl,
    googleUrl: null,
    googleEmbedUrl: null,
    ...targetingColumns,
  };
}

/**
 * 資料の可視性述語（公開範囲が自社に及ぶ）。カテゴリの絞り込みは呼び出し側で
 * `AND`条件として付与する。
 */
export function monthlyMaterialVisibleToWhere(
  country: string,
  companyCode: string
): Prisma.MonthlyMaterialWhereInput {
  return {
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
      { targetingScope: "companies", targetingCompanyCodes: { has: companyCode } },
    ],
  };
}

/**
 * 指定カテゴリについて、公開範囲が自社に及ぶ資料のみを年月の降順で取得する。
 * 他カテゴリの資料が結果に混入しないよう、`category`を必ず絞り込み条件に含める。
 */
export async function listMonthlyMaterialsVisibleTo(
  category: MonthlyMaterialCategory,
  country: string,
  companyCode: string
): Promise<MonthlyMaterial[]> {
  const records = await prisma.monthlyMaterial.findMany({
    where: { category, ...monthlyMaterialVisibleToWhere(country, companyCode) },
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
  });

  return records.map(mapMonthlyMaterial);
}

/**
 * 指定カテゴリについて、公開範囲による絞り込みを行わず全件を年月の降順で取得する。
 * ヘルプデスク側の閲覧・管理画面が利用する。
 */
export async function listAllMonthlyMaterials(
  category: MonthlyMaterialCategory
): Promise<MonthlyMaterial[]> {
  const records = await prisma.monthlyMaterial.findMany({
    where: { category },
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
  });

  return records.map(mapMonthlyMaterial);
}

/**
 * 一意制約違反（`P2002`）を捕捉し`DuplicateYearMonthError`へ変換する。
 * それ以外のエラーはそのまま再送出する。
 */
function rethrowAsDuplicateYearMonthError(
  error: unknown,
  category: MonthlyMaterialCategory,
  year: number,
  month: number
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new DuplicateYearMonthError(category, year, month);
  }
  throw error;
}

/** 資料を新規作成する。同一カテゴリ内で年月が重複する場合は`DuplicateYearMonthError`を送出する。 */
export async function createMonthlyMaterialRecord(
  input: CreateMonthlyMaterialInput
): Promise<MonthlyMaterial> {
  try {
    const record = await prisma.monthlyMaterial.create({
      data: {
        category: input.category,
        year: input.year,
        month: input.month,
        ...toMonthlyMaterialData(input),
      },
    });

    return mapMonthlyMaterial(record);
  } catch (error) {
    rethrowAsDuplicateYearMonthError(error, input.category, input.year, input.month);
  }
}

/**
 * 既存の資料の内容を更新する。存在しない場合は`MonthlyMaterialNotFoundError`、
 * 変更先の年月が同一カテゴリ内の別レコードと重複する場合は`DuplicateYearMonthError`を送出する。
 */
export async function updateMonthlyMaterialRecord(
  id: string,
  input: CreateMonthlyMaterialInput
): Promise<MonthlyMaterial> {
  try {
    const record = await prisma.monthlyMaterial.update({
      where: { id },
      data: {
        category: input.category,
        year: input.year,
        month: input.month,
        ...toMonthlyMaterialData(input),
      },
    });

    return mapMonthlyMaterial(record);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new MonthlyMaterialNotFoundError(id);
    }
    rethrowAsDuplicateYearMonthError(error, input.category, input.year, input.month);
  }
}

/** 資料を削除する。存在しない場合は`MonthlyMaterialNotFoundError`を送出する。 */
export async function deleteMonthlyMaterialRecord(id: string): Promise<void> {
  try {
    await prisma.monthlyMaterial.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new MonthlyMaterialNotFoundError(id);
    }
    throw error;
  }
}
