import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_DOCUMENT_LOCALE,
  DOCUMENT_INCLUDE,
  mapDocument,
  resolveDocumentContent,
  targetingToColumns,
} from "@/lib/server/document-mapper";
import type { CreateDocumentInput, Document } from "@/types/document";

// `resolveDocumentContent`は`document-mapper.ts`から再エクスポートし、
// `document-mapper.ts`に依存する呼び出し元が本モジュール経由でも参照できるようにする
// （`announcement-service.ts`の`resolveAnnouncementContent`再エクスポートと同型）。
export { resolveDocumentContent };

export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
  }
}

const ORDER_BY_UPLOADED_AT_DESC = { uploadedAt: "desc" } as const;

/**
 * `CreateDocumentInput`をPrismaの書き込み用データへ変換する。`sourceType`の分岐で
 * 使われない側のフィールド（アップロード方式ならgoogleUrl/googleEmbedUrl、Google方式なら
 * fileName等）は明示的に`null`にし、編集時に登録方式が切り替わっても前の方式のデータが
 * 残留しないようにする。
 */
function toDocumentData(
  input: CreateDocumentInput
): Prisma.DocumentUncheckedCreateInput {
  const targetingColumns = targetingToColumns(input.targeting);

  if (input.sourceType === "google") {
    return {
      title: input.title,
      description: input.description,
      status: input.status,
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
    status: input.status,
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

function visibleToWhere(country: string, companyCode: string): Prisma.DocumentWhereInput {
  return {
    status: "published",
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
      { targetingScope: "companies", targetingCompanyCodes: { has: companyCode } },
    ],
  };
}

/**
 * `translations`配列（`en`必須＋任意追加言語）をPrismaのネスト書き込み形状に変換する。
 * `en`行を必ず1件含み、それ以外の行は渡された内容で全置換する方針のため、常に
 * `deleteMany`（既存の全翻訳行を削除）＋`create`（渡された内容を作り直す）で表現する
 * （`announcement-service.ts`の`translationsToNestedWrite`と同型）。
 */
function translationsToNestedWrite(translations: Document["translations"]) {
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
 * 公開範囲が「全体公開」、または自社の国・会社コードが対象に含まれるドキュメントのみを取得する。
 * `locale`に対応するタイトル・説明（未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function listDocumentsVisibleTo(
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<Document[]> {
  const records = await prisma.document.findMany({
    where: visibleToWhere(country, companyCode),
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
    include: DOCUMENT_INCLUDE,
  });

  return records
    .map(mapDocument)
    .map((item) => ({ ...item, ...resolveDocumentContent(item, locale) }));
}

/**
 * 指定したIDのドキュメントを1件取得する。自社の国・会社コードが公開範囲に含まれない、
 * または該当データが存在しない場合はnullを返す。`locale`に対応するタイトル・説明
 * （未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function findDocumentVisibleTo(
  id: string,
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<Document | null> {
  const record = await prisma.document.findFirst({
    where: { id, ...visibleToWhere(country, companyCode) },
    include: DOCUMENT_INCLUDE,
  });
  if (!record) {
    return null;
  }

  const document = mapDocument(record);
  return { ...document, ...resolveDocumentContent(document, locale) };
}

/**
 * 公開範囲による絞り込みを行わず、ドキュメント全件をアップロード日の降順で取得する。
 * 表示解決（`resolveDocumentContent`）は行わず、既定言語（`ja`＝親列）と全翻訳をそのまま返す
 * （ヘルプデスク側フォームが全言語を編集できるようにするため）。
 */
export async function listAllDocuments(): Promise<Document[]> {
  const records = await prisma.document.findMany({
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
    include: DOCUMENT_INCLUDE,
  });

  return records.map(mapDocument);
}

/**
 * 公開範囲による絞り込みを行わず、指定したIDのドキュメントを1件取得する。
 * 表示解決は行わず、既定言語（`ja`＝親列）と全翻訳をそのまま返す。
 */
export async function findDocumentById(id: string): Promise<Document | null> {
  const record = await prisma.document.findUnique({
    where: { id },
    include: DOCUMENT_INCLUDE,
  });

  return record ? mapDocument(record) : null;
}

/** ドキュメントを新規作成する。アップロード日時は保存操作を行った時刻とする。 */
export async function createDocumentRecord(
  input: CreateDocumentInput
): Promise<Document> {
  const record = await prisma.document.create({
    data: {
      ...toDocumentData(input),
      translations: translationsToNestedWrite(input.translations),
    },
    include: DOCUMENT_INCLUDE,
  });

  return mapDocument(record);
}

/** 既存ドキュメントの内容を更新する。存在しない場合は`DocumentNotFoundError`を送出する。 */
export async function updateDocumentRecord(
  id: string,
  input: CreateDocumentInput
): Promise<Document> {
  try {
    const record = await prisma.document.update({
      where: { id },
      data: {
        ...toDocumentData(input),
        translations: translationsToNestedWrite(input.translations),
      },
      include: DOCUMENT_INCLUDE,
    });

    return mapDocument(record);
  } catch {
    throw new DocumentNotFoundError(id);
  }
}

/** ドキュメントを削除する。存在しない場合は`DocumentNotFoundError`を送出する。 */
export async function deleteDocumentRecord(id: string): Promise<void> {
  try {
    await prisma.document.delete({ where: { id } });
  } catch {
    throw new DocumentNotFoundError(id);
  }
}
