import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { PdfFileStats } from "@/lib/server/file-response";
import {
  DEFAULT_MANUAL_LOCALE,
  MANUAL_FILE_SELECT,
  MANUAL_INCLUDE,
  MANUAL_SUMMARY_SELECT,
  ManualDataIntegrityError,
  mapManual,
  mapManualSummary,
  resolveManualContent,
  targetingToColumns,
  type PrismaManualSummary,
} from "@/lib/server/manual-mapper";
import type { CreateManualInput, Manual, ManualSummary } from "@/types/manual";
import { errorFields, logger } from "./logger";

// `resolveManualContent`は`manual-mapper.ts`から再エクスポートし、`manual-mapper.ts`に
// 依存する呼び出し元が本モジュール経由でも参照できるようにする
// （`document-service.ts`の`resolveDocumentContent`再エクスポートと同型）。
export { resolveManualContent };

export class ManualNotFoundError extends Error {
  readonly manualId: string;

  constructor(manualId: string) {
    super("Manual not found");
    this.name = "ManualNotFoundError";
    this.manualId = manualId;
  }
}

/**
 * 年月の降順、同一年月内は登録順（`createdAt`昇順）で並べる
 * （`monthly-material-service.ts`の`ORDER_BY_YEAR_MONTH_DESC`と同型）。
 */
const ORDER_BY_YEAR_MONTH_DESC: Prisma.ManualOrderByWithRelationInput[] = [
  { year: "desc" },
  { month: "desc" },
  { createdAt: "asc" },
];

/**
 * `CreateManualInput`をPrismaの書き込み用データへ変換する。`sourceType`の分岐で使われない側の
 * フィールド（アップロード方式ならgoogleUrl/googleEmbedUrl、Google方式ならfileName等）は
 * 明示的に`null`にし、編集時に登録方式が切り替わっても前の方式のデータが残留しないようにする
 * （`document-service.ts`の`toDocumentData`と同型）。
 */
function toManualData(
  input: CreateManualInput
): Prisma.ManualUncheckedCreateInput {
  const targetingColumns = targetingToColumns(input.targeting);

  if (input.sourceType === "google") {
    return {
      title: input.title,
      description: input.description,
      category: input.category,
      year: input.year,
      month: input.month,
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
    title: input.title,
    description: input.description,
    category: input.category,
    year: input.year,
    month: input.month,
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
 * マニュアルの可視性述語（公開範囲が自社に及ぶ）。マニュアルは`documents`specの
 * `Document`と異なりdraft/published相当の公開状態を持たないため、`status`条件は含まない。
 */
export function manualVisibleToWhere(
  country: string,
  companyCode: string
): Prisma.ManualWhereInput {
  return {
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
      { targetingScope: "companies", targetingCompanyCodes: { has: companyCode } },
    ],
  };
}

/**
 * `translations`配列（`en`必須の1件）をPrismaのネスト書き込み形状に変換する。常に置換する
 * 方針のため、常に`deleteMany`（既存の全翻訳行を削除）＋`create`（渡された内容を作り直す）で
 * 表現する（`document-service.ts`の`translationsToNestedWrite`と同型）。
 */
function translationsToNestedWrite(translations: Manual["translations"]) {
  return {
    deleteMany: {},
    create: translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description,
    })),
  };
}

/**
 * `mapManualSummary`が`ManualDataIntegrityError`を送出したレコードのみをスキップし、残りは正常に
 * 返す。1件のデータ不整合が原因で一覧取得が丸ごと失敗しないようにするための措置
 * （`monthly-material-service.ts`の`mapMonthlyMaterialsSkippingCorrupted`と同型）。
 */
function mapManualsSkippingCorrupted(
  records: PrismaManualSummary[]
): ManualSummary[] {
  return records.flatMap((record) => {
    try {
      return [mapManualSummary(record)];
    } catch (error) {
      if (error instanceof ManualDataIntegrityError) {
        logger.error("[manual-service] Skipping corrupted record", errorFields(error));
        return [];
      }
      throw error;
    }
  });
}

/**
 * 公開範囲が自社に及ぶマニュアルのみを年月の降順で取得する。`locale`に対応するタイトル・説明
 * （未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function listManualsVisibleTo(
  country: string,
  companyCode: string,
  locale: string = DEFAULT_MANUAL_LOCALE
): Promise<ManualSummary[]> {
  const records = await prisma.manual.findMany({
    where: manualVisibleToWhere(country, companyCode),
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
    select: MANUAL_SUMMARY_SELECT,
  });

  return mapManualsSkippingCorrupted(records).map((item) => ({
    ...item,
    ...resolveManualContent(item, locale),
  }));
}

/**
 * 公開範囲による絞り込みを行わず、マニュアル全件を年月の降順で取得する。表示解決
 * （`resolveManualContent`）は行わず、既定言語（`ja`＝親列）と全翻訳をそのまま返す
 * （ヘルプデスク側フォームが全言語を編集できるようにするため）。
 */
export async function listAllManuals(): Promise<ManualSummary[]> {
  const records = await prisma.manual.findMany({
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
    select: MANUAL_SUMMARY_SELECT,
  });

  return mapManualsSkippingCorrupted(records);
}

/**
 * 公開範囲による絞り込みを行わず、指定したIDのマニュアルを1件取得する。表示解決は行わない。
 */
export async function findManualById(id: string): Promise<Manual | null> {
  const record = await prisma.manual.findUnique({
    where: { id },
    include: MANUAL_INCLUDE,
  });

  return record ? mapManual(record) : null;
}

/** 配信ルートが返すファイル本体（アップロード方式のPDFのみ）。 */
export interface ManualFile {
  fileName: string;
  dataUrl: string;
}

/** 認可確認用の軽量な情報（本体は含まない）。 */
export interface ManualFileMeta {
  id: string;
  fileName: string;
}

function toManualFile(
  record: { sourceType: string; fileName: string | null; dataUrl: string | null } | null
): ManualFile | null {
  if (!record || record.sourceType !== "upload" || !record.dataUrl) {
    return null;
  }
  return { fileName: record.fileName ?? "manual.pdf", dataUrl: record.dataUrl };
}

function toManualFileMeta(
  record: { id: string; sourceType: string; fileName: string | null } | null
): ManualFileMeta | null {
  if (!record || record.sourceType !== "upload") {
    return null;
  }
  return { id: record.id, fileName: record.fileName ?? "manual.pdf" };
}

const MANUAL_FILE_META_SELECT = { id: true, sourceType: true, fileName: true } as const;

/**
 * 自社に可視なアップロード方式マニュアルの認可確認（本体は読まない）。可視性は一覧と同じ述語
 * （`manualVisibleToWhere`）を再利用する。他社向け・存在しない・Google方式はnull。
 */
export async function findManualFileMetaVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<ManualFileMeta | null> {
  const record = await prisma.manual.findFirst({
    where: { id, ...manualVisibleToWhere(country, companyCode) },
    select: MANUAL_FILE_META_SELECT,
  });
  return toManualFileMeta(record);
}

/** 公開範囲によらずIDだけで認可確認する（ヘルプデスク用、本体は読まない）。 */
export async function findManualFileMetaById(id: string): Promise<ManualFileMeta | null> {
  const record = await prisma.manual.findUnique({
    where: { id },
    select: MANUAL_FILE_META_SELECT,
  });
  return toManualFileMeta(record);
}

/**
 * HEAD用。認可確認済みのIDについて、本体をNodeへ転送せずDB側で長さ・先頭・末尾だけ集計する。
 * dataUrlがnullまたは存在しない場合はnull。設計・注意点は`getDocumentFileStats`と同じ
 * （改行・空白だけを`replace`で除去／先頭プレフィックスの判定は先頭300文字のみ／同時数は呼び出し側で制限）。
 */
export async function getManualFileStats(id: string): Promise<PdfFileStats | null> {
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
      FROM "Manual"
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
 * 自社に可視なマニュアルのファイル本体を1件取得する（セマフォ取得後に呼ぶ）。可視性は
 * 認可確認と同じ述語を再適用する。他社向け・存在しない・Google方式・本体なしはnull。
 */
export async function findManualFileVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<ManualFile | null> {
  const record = await prisma.manual.findFirst({
    where: { id, ...manualVisibleToWhere(country, companyCode) },
    select: MANUAL_FILE_SELECT,
  });
  return toManualFile(record);
}

/** 公開範囲によらずIDだけでファイル本体を取得する（ヘルプデスク用）。 */
export async function findManualFileById(id: string): Promise<ManualFile | null> {
  const record = await prisma.manual.findUnique({
    where: { id },
    select: MANUAL_FILE_SELECT,
  });
  return toManualFile(record);
}

/** マニュアルを新規作成する。 */
export async function createManualRecord(
  input: CreateManualInput
): Promise<ManualSummary> {
  const record = await prisma.manual.create({
    data: {
      ...toManualData(input),
      // 新規作成時は既存の翻訳行が存在しないため`deleteMany`を含まない単純な`create`のみを使う
      // （`deleteMany`は更新時にのみ有効なネスト書き込み操作。
      // `document-service.ts`の`createDocumentRecord`と同型）。
      translations: {
        create: input.translations.map((translation) => ({
          locale: translation.locale,
          title: translation.title,
          description: translation.description,
        })),
      },
    },
    select: MANUAL_SUMMARY_SELECT,
  });

  return mapManualSummary(record);
}

/** 既存マニュアルの内容を更新する。存在しない場合は`ManualNotFoundError`を送出する。 */
export async function updateManualRecord(
  id: string,
  input: CreateManualInput
): Promise<ManualSummary> {
  try {
    const record = await prisma.manual.update({
      where: { id },
      data: {
        ...toManualData(input),
        translations: translationsToNestedWrite(input.translations),
      },
      select: MANUAL_SUMMARY_SELECT,
    });

    return mapManualSummary(record);
  } catch {
    throw new ManualNotFoundError(id);
  }
}

/** マニュアルを削除する。存在しない場合は`ManualNotFoundError`を送出する。 */
export async function deleteManualRecord(id: string): Promise<void> {
  try {
    await prisma.manual.delete({ where: { id } });
  } catch {
    throw new ManualNotFoundError(id);
  }
}
