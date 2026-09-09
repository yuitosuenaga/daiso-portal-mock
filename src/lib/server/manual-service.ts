import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_MANUAL_LOCALE,
  MANUAL_INCLUDE,
  ManualDataIntegrityError,
  mapManual,
  resolveManualContent,
  targetingToColumns,
  type PrismaManualWithTranslations,
} from "@/lib/server/manual-mapper";
import type { CreateManualInput, Manual } from "@/types/manual";

// `resolveManualContent`は`manual-mapper.ts`から再エクスポートし、`manual-mapper.ts`に
// 依存する呼び出し元が本モジュール経由でも参照できるようにする
// （`document-service.ts`の`resolveDocumentContent`再エクスポートと同型）。
export { resolveManualContent };

export class ManualNotFoundError extends Error {
  constructor(manualId: string) {
    super(`Manual not found: ${manualId}`);
    this.name = "ManualNotFoundError";
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
 * `mapManual`が`ManualDataIntegrityError`を送出したレコードのみをスキップし、残りは正常に
 * 返す。1件のデータ不整合が原因で一覧取得が丸ごと失敗しないようにするための措置
 * （`monthly-material-service.ts`の`mapMonthlyMaterialsSkippingCorrupted`と同型）。
 */
function mapManualsSkippingCorrupted(
  records: PrismaManualWithTranslations[]
): Manual[] {
  return records.flatMap((record) => {
    try {
      return [mapManual(record)];
    } catch (error) {
      if (error instanceof ManualDataIntegrityError) {
        console.error(`[manual-service] Skipping corrupted record: ${error.message}`);
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
): Promise<Manual[]> {
  const records = await prisma.manual.findMany({
    where: manualVisibleToWhere(country, companyCode),
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
    include: MANUAL_INCLUDE,
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
export async function listAllManuals(): Promise<Manual[]> {
  const records = await prisma.manual.findMany({
    orderBy: ORDER_BY_YEAR_MONTH_DESC,
    include: MANUAL_INCLUDE,
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

/** マニュアルを新規作成する。 */
export async function createManualRecord(
  input: CreateManualInput
): Promise<Manual> {
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
    include: MANUAL_INCLUDE,
  });

  return mapManual(record);
}

/** 既存マニュアルの内容を更新する。存在しない場合は`ManualNotFoundError`を送出する。 */
export async function updateManualRecord(
  id: string,
  input: CreateManualInput
): Promise<Manual> {
  try {
    const record = await prisma.manual.update({
      where: { id },
      data: {
        ...toManualData(input),
        translations: translationsToNestedWrite(input.translations),
      },
      include: MANUAL_INCLUDE,
    });

    return mapManual(record);
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
