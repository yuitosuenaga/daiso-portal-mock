import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { companyFormSchema } from "@/lib/validation/company";
import type { CreateCompanyInput } from "@/types/company";

/** 販社CSV一括登録が期待するヘッダー行（固定順。要件19.2）。 */
const EXPECTED_HEADER = ["name", "country", "companyCode"] as const;

/**
 * データ行1件の検証エラーを表す機械可読コード。表示文言への解決は呼び出し側
 * （UI・next-intl）の責務とする（要件19.14の方針。tasks.md 36.1）。
 */
export type CompanyCsvRowErrorCode =
  | "required"
  | "companyCodeFormat"
  | "invalidCountry"
  | "companyCodeDuplicate"
  | "duplicateInFile";

/** ファイル全体のエラー（要件19.12）。 */
export type CompanyCsvFileErrorCode = "empty" | "headerMismatch" | "noDataRows";

export interface CompanyCsvRowResult {
  /** データ行の番号（1始まり、ヘッダー行を除く）。 */
  rowNumber: number;
  name: string;
  /** 正規化済み（大文字化）の国コード。 */
  country: string;
  companyCode: string;
  status: "ok" | "error";
  errors: CompanyCsvRowErrorCode[];
}

export interface ParsedCompanyCsv {
  /** ファイル全体のエラー。存在する場合、`rows`は空配列となる。 */
  fileError?: CompanyCsvFileErrorCode;
  rows: CompanyCsvRowResult[];
}

/**
 * CSVの1行をカンマ区切りで分割する軽量なパーサー。ダブルクォート囲みの基本対応
 * （`""`によるエスケープを含む）と、各値の前後空白トリムを行う。
 * 会社名にカンマ・改行を含むケースは要件外だが、ダブルクォート囲みは最低限考慮する
 * （design.md「追加設計」節の注記）。
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells.map((cell) => cell.trim());
}

function isKnownCountryCode(code: string): boolean {
  return (INQUIRY_COUNTRY_CODES as readonly string[]).includes(code);
}

/**
 * 販社CSVの生テキストをパースし、行単位で検証する純粋関数（要件19.2, 19.4〜19.7,
 * 19.12）。UI・Server Actionの双方から呼び出せるよう、DBアクセス等の副作用を持たない。
 *
 * - ヘッダー行が`name,country,companyCode`（固定順）と一致しない場合、
 *   空ファイル・データ0件の場合は`fileError`を返し`rows`は空配列にする（要件19.12）。
 * - 各データ行は`country`を大文字化した上で`INQUIRY_COUNTRY_CODES`に含まれるか検証し
 *   （要件19.5）、`companyFormSchema`で会社名・国・販社コードの必須／フォーマットを
 *   検証し（要件19.6）、販社コードの一意性を既存コード（`existingCodes`）と
 *   同一ファイル内の重複の両面で検証する（要件19.7）。
 * - 1行に複数の検証エラーが該当する場合は、該当する全てのエラーコードを`errors`に含める。
 */
export function parseAndValidateCompanyCsv(
  csvText: string,
  existingCodes: readonly string[] = []
): ParsedCompanyCsv {
  const withoutBom = csvText.replace(/^﻿/, "");
  const trimmedText = withoutBom.trim();

  if (!trimmedText) {
    return { fileError: "empty", rows: [] };
  }

  const lines = trimmedText.split(/\r\n|\r|\n/);
  const headerCells = splitCsvLine(lines[0]);
  const headerMatches =
    headerCells.length === EXPECTED_HEADER.length &&
    headerCells.every((cell, index) => cell === EXPECTED_HEADER[index]);

  if (!headerMatches) {
    return { fileError: "headerMismatch", rows: [] };
  }

  const dataLines = lines.slice(1).filter((line) => line.trim() !== "");

  if (dataLines.length === 0) {
    return { fileError: "noDataRows", rows: [] };
  }

  const existingCodeSet = new Set(
    existingCodes.map((code) => code.trim()).filter((code) => code !== "")
  );

  const parsedRows = dataLines.map((line, index) => {
    const [rawName = "", rawCountry = "", rawCompanyCode = ""] = splitCsvLine(line);

    return {
      rowNumber: index + 1,
      name: rawName.trim(),
      country: rawCountry.trim().toUpperCase(),
      companyCode: rawCompanyCode.trim(),
    };
  });

  const codeOccurrences = new Map<string, number>();
  for (const row of parsedRows) {
    if (row.companyCode) {
      codeOccurrences.set(
        row.companyCode,
        (codeOccurrences.get(row.companyCode) ?? 0) + 1
      );
    }
  }

  const rows: CompanyCsvRowResult[] = parsedRows.map((row) => {
    const errors: CompanyCsvRowErrorCode[] = [];

    const parsed = companyFormSchema.safeParse({
      name: row.name,
      country: row.country,
      companyCode: row.companyCode,
    });

    if (!parsed.success) {
      const hasRequiredIssue = parsed.error.issues.some(
        (issue) => issue.code === "too_small"
      );
      const hasCompanyCodeFormatIssue = parsed.error.issues.some(
        (issue) => issue.path[0] === "companyCode" && issue.code !== "too_small"
      );

      if (hasRequiredIssue) {
        errors.push("required");
      }
      if (hasCompanyCodeFormatIssue) {
        errors.push("companyCodeFormat");
      }
    }

    if (row.country && !isKnownCountryCode(row.country)) {
      errors.push("invalidCountry");
    }

    if (row.companyCode && existingCodeSet.has(row.companyCode)) {
      errors.push("companyCodeDuplicate");
    }

    if (row.companyCode && (codeOccurrences.get(row.companyCode) ?? 0) > 1) {
      errors.push("duplicateInFile");
    }

    return {
      rowNumber: row.rowNumber,
      name: row.name,
      country: row.country,
      companyCode: row.companyCode,
      status: errors.length === 0 ? "ok" : "error",
      errors,
    };
  });

  return { rows };
}

/** パース結果が「ファイルエラーが無く、全データ行が検証を通過している」かどうかを判定する（要件19.9）。 */
export function isFullyValidCompanyCsv(parsed: ParsedCompanyCsv): boolean {
  return (
    !parsed.fileError &&
    parsed.rows.length > 0 &&
    parsed.rows.every((row) => row.status === "ok")
  );
}

/** 検証済みの行結果から`createCompaniesBulk`向けの入力配列を組み立てる。 */
export function toCreateCompanyInputs(
  rows: CompanyCsvRowResult[]
): CreateCompanyInput[] {
  return rows.map((row) => ({
    name: row.name,
    country: row.country,
    companyCode: row.companyCode,
  }));
}
