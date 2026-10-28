import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { PdfFileStats } from "@/lib/server/file-response";
import {
  MONTHLY_MATERIAL_FILE_SELECT,
  MONTHLY_MATERIAL_SUMMARY_SELECT,
  MonthlyMaterialDataIntegrityError,
  mapMonthlyMaterialSummary,
  targetingToColumns,
  type PrismaMonthlyMaterialSummary,
} from "@/lib/server/monthly-material-mapper";
import type {
  CreateMonthlyMaterialInput,
  MonthlyMaterialCategory,
  MonthlyMaterialSummary,
  UpdateMonthlyMaterialInput,
} from "@/types/monthly-material";
import { errorFields, logger } from "./logger";

export class MonthlyMaterialNotFoundError extends Error {
  readonly materialId: string;

  constructor(materialId: string) {
    super("MonthlyMaterial not found");
    this.name = "MonthlyMaterialNotFoundError";
    this.materialId = materialId;
  }
}

/**
 * 年月の降順、同一年月内は登録順（`createdAt`昇順）で並べる。同一カテゴリ×年月に
 * 複数件登録できるため、同一年月内の並びを安定させるための第3ソートキー。
 */
const ORDER_BY_YEAR_MONTH_DESC: Prisma.MonthlyMaterialOrderByWithRelationInput[] = [
  { year: "desc" },
  { month: "desc" },
  { createdAt: "asc" },
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
 * `mapMonthlyMaterialSummary`が`MonthlyMaterialDataIntegrityError`を送出したレコードのみを
 * スキップし、残りは正常に返す。1件のデータ不整合が原因でカテゴリ全体の一覧取得が
 * 丸ごと失敗しないようにするための措置。
 */
function mapMonthlyMaterialsSkippingCorrupted(
  records: PrismaMonthlyMaterialSummary[]
): MonthlyMaterialSummary[] {
  return records.flatMap((record) => {
    try {
      return [mapMonthlyMaterialSummary(record)];
    } catch (error) {
      if (error instanceof MonthlyMaterialDataIntegrityError) {
        logger.error("[monthly-material-service] Skipping corrupted record", errorFields(error));
        return [];
      }
      throw error;
    }
  });
}

/**
 * 指定カテゴリについて、公開範囲が自社に及ぶ資料のみを年月の降順で取得する。
 * 他カテゴリの資料が結果に混入しないよう、`category`を必ず絞り込み条件に含める。
 */
export async function listMonthlyMaterialsVisibleTo(
  category: MonthlyMaterialCategory,
  country: string,
  companyCode: string
): Promise<MonthlyMaterialSummary[]> {
  const records = await prisma.monthlyMaterial.findMany({
    where: { category, ...monthlyMaterialVisibleToWhere(country, companyCode) },
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
    select: MONTHLY_MATERIAL_SUMMARY_SELECT,
  });

  return mapMonthlyMaterialsSkippingCorrupted(records);
}

/**
 * 指定カテゴリについて、公開範囲による絞り込みを行わず全件を年月の降順で取得する。
 * ヘルプデスク側の閲覧・管理画面が利用する。
 */
export async function listAllMonthlyMaterials(
  category: MonthlyMaterialCategory
): Promise<MonthlyMaterialSummary[]> {
  const records = await prisma.monthlyMaterial.findMany({
    where: { category },
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
    select: MONTHLY_MATERIAL_SUMMARY_SELECT,
  });

  return mapMonthlyMaterialsSkippingCorrupted(records);
}

/** 配信ルートが返すファイル本体（アップロード方式のPDFのみ）。 */
export interface MonthlyMaterialFile {
  fileName: string;
  dataUrl: string;
}

/** 認可確認用の軽量な情報（本体は含まない）。 */
export interface MonthlyMaterialFileMeta {
  id: string;
  fileName: string;
}

function toMonthlyMaterialFile(
  record: { sourceType: string; fileName: string | null; dataUrl: string | null } | null
): MonthlyMaterialFile | null {
  if (!record || record.sourceType !== "upload" || !record.dataUrl) {
    return null;
  }
  return { fileName: record.fileName ?? "material.pdf", dataUrl: record.dataUrl };
}

function toMonthlyMaterialFileMeta(
  record: { id: string; sourceType: string; fileName: string | null } | null
): MonthlyMaterialFileMeta | null {
  if (!record || record.sourceType !== "upload") {
    return null;
  }
  return { id: record.id, fileName: record.fileName ?? "material.pdf" };
}

const MONTHLY_MATERIAL_FILE_META_SELECT = {
  id: true,
  sourceType: true,
  fileName: true,
} as const;

/**
 * 自社に可視なアップロード方式資料の認可確認（本体は読まない）。可視性は一覧と同じ述語
 * （`monthlyMaterialVisibleToWhere`）を再利用する。他社向け・存在しない・Google方式はnull。
 */
export async function findMonthlyMaterialFileMetaVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<MonthlyMaterialFileMeta | null> {
  const record = await prisma.monthlyMaterial.findFirst({
    where: { id, ...monthlyMaterialVisibleToWhere(country, companyCode) },
    select: MONTHLY_MATERIAL_FILE_META_SELECT,
  });
  return toMonthlyMaterialFileMeta(record);
}

/** 公開範囲によらずIDだけで認可確認する（ヘルプデスク用、本体は読まない）。 */
export async function findMonthlyMaterialFileMetaById(
  id: string
): Promise<MonthlyMaterialFileMeta | null> {
  const record = await prisma.monthlyMaterial.findUnique({
    where: { id },
    select: MONTHLY_MATERIAL_FILE_META_SELECT,
  });
  return toMonthlyMaterialFileMeta(record);
}

/**
 * HEAD用。認可確認済みのIDについて、本体をNodeへ転送せずDB側で長さ・先頭・末尾だけ集計する。
 * dataUrlがnullまたは存在しない場合はnull。設計・注意点は`getDocumentFileStats`と同じ
 * （改行・空白だけを`replace`で除去／先頭プレフィックスの判定は先頭300文字のみ／同時数は呼び出し側で制限）。
 */
export async function getMonthlyMaterialFileStats(id: string): Promise<PdfFileStats | null> {
  const rows = await prisma.$queryRaw<
    {
      head: string;
      clean_length: number | bigint;
      clean_tail: string;
      first_pad: number | bigint;
    }[]
  >(Prisma.sql`
    WITH src AS MATERIALIZED (
      SELECT substr("dataUrl", 1, 300) AS head,
             replace(replace(replace(replace(
               substr("dataUrl", strpos(substr("dataUrl", 1, 300), ',') + 1),
               E'\\r', ''), E'\\n', ''), E'\\t', ''), ' ', ''
             ) AS clean
      FROM "MonthlyMaterial"
      WHERE id = ${id} AND "sourceType" = 'upload' AND "dataUrl" IS NOT NULL
    )
    SELECT head,
           length(clean) AS clean_length,
           right(clean, 2) AS clean_tail,
           strpos(clean, '=') AS first_pad
    FROM src
  `);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    head: row.head,
    cleanLength: Number(row.clean_length),
    cleanTail: row.clean_tail,
    firstPad: Number(row.first_pad),
  };
}

/**
 * 自社に可視な資料のファイル本体を1件取得する（セマフォ取得後に呼ぶ）。可視性は
 * 認可確認と同じ述語を再適用する。他社向け・存在しない・Google方式・本体なしはnull。
 */
export async function findMonthlyMaterialFileVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<MonthlyMaterialFile | null> {
  const record = await prisma.monthlyMaterial.findFirst({
    where: { id, ...monthlyMaterialVisibleToWhere(country, companyCode) },
    select: MONTHLY_MATERIAL_FILE_SELECT,
  });
  return toMonthlyMaterialFile(record);
}

/** 公開範囲によらずIDだけでファイル本体を取得する（ヘルプデスク用）。 */
export async function findMonthlyMaterialFileById(
  id: string
): Promise<MonthlyMaterialFile | null> {
  const record = await prisma.monthlyMaterial.findUnique({
    where: { id },
    select: MONTHLY_MATERIAL_FILE_SELECT,
  });
  return toMonthlyMaterialFile(record);
}

/** 資料を新規作成する。同一カテゴリ×年月に既に資料が存在していても、別レコードとして追加登録できる。 */
export async function createMonthlyMaterialRecord(
  input: CreateMonthlyMaterialInput
): Promise<MonthlyMaterialSummary> {
  const record = await prisma.monthlyMaterial.create({
    data: {
      category: input.category,
      department: input.department,
      year: input.year,
      month: input.month,
      ...toMonthlyMaterialData(input),
    },
    select: MONTHLY_MATERIAL_SUMMARY_SELECT,
  });

  return mapMonthlyMaterialSummary(record);
}

/**
 * 既存の資料の内容を更新する。存在しない場合は`MonthlyMaterialNotFoundError`を送出する。
 *
 * アップロード方式で`dataUrl`が無い入力は「ファイルを差し替えず年月・部門・公開範囲だけ直す」操作。
 * 一覧が`dataUrl`を持たないため、既存ファイルをDBに残したまま、ファイル系の列
 * （sourceType/fileName/fileType/fileSize/dataUrl/googleUrl/googleEmbedUrl）には触れずに更新する。
 * クライアントから来た`fileName`/`fileType`/`fileSize`は信用せず無視する。対象が既存のアップロード方式
 * （本体あり）でなければ（Google方式からファイル無しでアップロード方式へ切り替える操作など）
 * 更新件数が0になり、`MonthlyMaterialNotFoundError`を送出する。
 *
 * 注意: ここでの`MonthlyMaterialNotFoundError`は「`id`・`sourceType`・`dataUrl`の条件に合う行が無い」を
 * 意味する。つまり、行が存在しない場合のほか、Google方式の行からファイル無しでアップロード方式へ
 * 切り替えようとした場合も含む。後者は`dataUrl`がnullのアップロード方式の行を作らないための保護
 * （`monthlyMaterialUpdateSchema`はこの入力を通すため、保護はこの`updateMany`の条件だけが担う）。
 * エラー名と意味がずれるが、API側のエラー対応を広げないため専用のエラー型は設けない。
 */
export async function updateMonthlyMaterialRecord(
  id: string,
  input: UpdateMonthlyMaterialInput
): Promise<MonthlyMaterialSummary> {
  try {
    if (input.sourceType === "upload" && !input.dataUrl) {
      const { count } = await prisma.monthlyMaterial.updateMany({
        where: { id, sourceType: "upload", dataUrl: { not: null } },
        data: {
          category: input.category,
          department: input.department,
          year: input.year,
          month: input.month,
          ...targetingToColumns(input.targeting),
        },
      });
      if (count === 0) {
        throw new MonthlyMaterialNotFoundError(id);
      }
      const updated = await prisma.monthlyMaterial.findUnique({
        where: { id },
        select: MONTHLY_MATERIAL_SUMMARY_SELECT,
      });
      if (!updated) {
        throw new MonthlyMaterialNotFoundError(id);
      }
      return mapMonthlyMaterialSummary(updated);
    }

    const record = await prisma.monthlyMaterial.update({
      where: { id },
      data: {
        category: input.category,
        department: input.department,
        year: input.year,
        month: input.month,
        ...toMonthlyMaterialData(input as CreateMonthlyMaterialInput),
      },
      select: MONTHLY_MATERIAL_SUMMARY_SELECT,
    });

    return mapMonthlyMaterialSummary(record);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new MonthlyMaterialNotFoundError(id);
    }
    throw error;
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
