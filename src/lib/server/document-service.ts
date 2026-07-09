import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  mapDocument,
  targetingToColumns,
} from "@/lib/server/document-mapper";
import type { CreateDocumentInput, Document } from "@/types/document";

export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
  }
}

const ORDER_BY_UPLOADED_AT_DESC = { uploadedAt: "desc" } as const;

function visibleToWhere(country: string, companyCode: string): Prisma.DocumentWhereInput {
  return {
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
      { targetingScope: "companies", targetingCompanyCodes: { has: companyCode } },
    ],
  };
}

/** 公開範囲が「全体公開」、または自社の国・会社コードが対象に含まれるドキュメントのみを取得する。 */
export async function listDocumentsVisibleTo(
  country: string,
  companyCode: string
): Promise<Document[]> {
  const records = await prisma.document.findMany({
    where: visibleToWhere(country, companyCode),
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
  });

  return records.map(mapDocument);
}

/**
 * 指定したIDのドキュメントを1件取得する。自社の国・会社コードが公開範囲に含まれない、
 * または該当データが存在しない場合はnullを返す。
 */
export async function findDocumentVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<Document | null> {
  const record = await prisma.document.findFirst({
    where: { id, ...visibleToWhere(country, companyCode) },
  });

  return record ? mapDocument(record) : null;
}

/** 公開範囲による絞り込みを行わず、ドキュメント全件をアップロード日の降順で取得する。 */
export async function listAllDocuments(): Promise<Document[]> {
  const records = await prisma.document.findMany({
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
  });

  return records.map(mapDocument);
}

/** 公開範囲による絞り込みを行わず、指定したIDのドキュメントを1件取得する。 */
export async function findDocumentById(id: string): Promise<Document | null> {
  const record = await prisma.document.findUnique({ where: { id } });

  return record ? mapDocument(record) : null;
}

/** ドキュメントを新規作成する。アップロード日時は保存操作を行った時刻とする。 */
export async function createDocumentRecord(
  input: CreateDocumentInput
): Promise<Document> {
  const record = await prisma.document.create({
    data: {
      title: input.title,
      description: input.description,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      dataUrl: input.dataUrl,
      ...targetingToColumns(input.targeting),
    },
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
        title: input.title,
        description: input.description,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        dataUrl: input.dataUrl,
        ...targetingToColumns(input.targeting),
      },
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
