import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import type { Document, DocumentTargeting } from "@/types/document";

export type DocumentFileValidationResult =
  | { valid: true }
  | { valid: false; reason: "size" | "type" };

export interface TargetingLabelDictionary {
  allLabel: string;
  countriesLabel: string;
  companiesLabel: string;
  countryLabels: Record<string, string>;
  companyLabels: Record<string, string>;
}

/**
 * 公開範囲（DocumentTargeting）を、ヘルプデスク画面向けの表示用ラベル文字列に整形する。
 * DocumentManagementList・DocumentDetailPanelの両方で共用する。
 */
export function targetingLabel(
  targeting: DocumentTargeting,
  labels: TargetingLabelDictionary
): string {
  if (targeting.scope === "all") {
    return labels.allLabel;
  }
  if (targeting.scope === "countries") {
    return `${labels.countriesLabel}: ${targeting.countries
      .map((code) => labels.countryLabels[code] ?? code)
      .join(", ")}`;
  }
  return `${labels.companiesLabel}: ${targeting.companyCodes
    .map((code) => labels.companyLabels[code] ?? code)
    .join(", ")}`;
}

/**
 * ドキュメントとしてアップロードするファイルの形式・サイズを検証する。
 * 1ドキュメント=1PDFの1対1関係のため、`inquiry-form`の`validateAttachmentFile`と異なり
 * 件数チェックは行わない。
 */
export function validateDocumentFile(file: File): DocumentFileValidationResult {
  if (
    !DOCUMENT_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof DOCUMENT_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return { valid: false, reason: "type" };
  }
  if (file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: "size" };
  }
  return { valid: true };
}

/**
 * タイトル・説明の部分一致（大文字小文字を区別しない）でドキュメントを絞り込む。
 * キーワードが空のとき、入力配列をそのまま（順序維持で）返す。
 */
export function filterDocuments(
  documents: Document[],
  keyword: string
): Document[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return documents;
  }

  return documents.filter((document) => {
    const title = document.title.toLowerCase();
    const description = document.description?.toLowerCase() ?? "";
    return (
      title.includes(normalizedKeyword) ||
      description.includes(normalizedKeyword)
    );
  });
}
