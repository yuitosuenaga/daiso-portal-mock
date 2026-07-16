import "server-only";

import type { Document as PrismaDocument } from "@prisma/client";

import type { Document, DocumentTargeting } from "@/types/document";

export function mapTargeting(record: PrismaDocument): DocumentTargeting {
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

export function mapDocument(record: PrismaDocument): Document {
  const base = {
    id: record.id,
    title: record.title,
    description: record.description ?? undefined,
    targeting: mapTargeting(record),
    uploadedAt: record.uploadedAt.toISOString(),
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
