import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { companyFormSchema } from "@/lib/validation/company";
import type { CreateCompanyInput } from "@/types/company";

/** 販社CSV一括登録が期待するヘッダー行（固定順。要件19.2）。 */
const EXPECTED_HEADER = ["name", "country", "companyCode"] as const;

/**
 * 1ファイルで受け付けるデータ行数の上限。`createCompaniesBulk`は対話型トランザクション
 * （既定タイムアウト5秒）内で一括INSERTする。行ごとに往復する旧方式は数百〜数千行で
 * タイムアウトし得たが、現在はクエリ2本に固定のため、500行は余裕を持った運用上の上限。
 */
export const MAX_COMPANY_CSV_ROWS = 500;

/**
 * データ行1件の検証エラーを表す機械可読コード。表示文言への解決は呼び出し側
 * （UI・next-intl）の責務とする（要件19.14の方針。tasks.md 36.1）。
 */
export type CompanyCsvRowErrorCode =
  | "required"
  | "companyCodeFormat"
  | "invalidCountry"
  | "companyCodeDuplicate"
  | "duplicateInFile"
  | "columnCount";

/** ファイル全体のエラー（要件19.12）。 */
export type CompanyCsvFileErrorCode =
  | "empty"
  | "headerMismatch"
  | "noDataRows"
  | "invalidEncoding"
  | "tooManyRows";

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

  const trimmed = cells.map((cell) => cell.trim());

  // Excelが出力する末尾の空セル（`a,b,c,,`）は列として扱わない。
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === "") {
    trimmed.pop();
  }

  return trimmed;
}

/** BOMを除去し前後空白を除いた本文を、物理行に分割する。 */
function splitLines(csvText: string): string[] {
  return csvText.replace(/^\uFEFF/, "").trim().split(/\r\n|\r|\n/);
}

/** 空・文字コード（U+FFFD混入＝UTF-8以外で保存された）の判定。 */
function checkEmptyAndEncoding(csvText: string): CompanyCsvFileErrorCode | null {
  if (!csvText.replace(/^\uFEFF/, "").trim()) {
    return "empty";
  }
  if (csvText.includes("\uFFFD")) {
    return "invalidEncoding";
  }
  return null;
}

/** ヘッダー行を除く空でない物理行の数が上限を超えているか。 */
function exceedsRowLimit(lines: string[]): boolean {
  let count = 0;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() !== "") {
      count += 1;
      if (count > MAX_COMPANY_CSV_ROWS) {
        return true;
      }
    }
  }
  return false;
}

/**
 * ファイル全体に対する事前判定（空・文字コード・件数）。クライアントで読み込み直後に
 * 呼び出してServer Actionの往復を省くほか、`parseAndValidateCompanyCsv`でも使う。
 * 問題がなければnullを返す。ヘッダー・データ行の中身は見ない。
 */
export function precheckCompanyCsvText(text: string): CompanyCsvFileErrorCode | null {
  const encodingError = checkEmptyAndEncoding(text);
  if (encodingError) {
    return encodingError;
  }
  return exceedsRowLimit(splitLines(text)) ? "tooManyRows" : null;
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
  const earlyError = checkEmptyAndEncoding(csvText);
  if (earlyError) {
    return { fileError: earlyError, rows: [] };
  }

  const lines = splitLines(csvText);
  const headerCells = splitCsvLine(lines[0]);
  const headerMatches =
    headerCells.length === EXPECTED_HEADER.length &&
    headerCells.every((cell, index) => cell === EXPECTED_HEADER[index]);

  if (!headerMatches) {
    return { fileError: "headerMismatch", rows: [] };
  }

  // 行番号は物理行から振る（空行を飛ばしても「データ行1＝ヘッダーの次の行」がずれない）。
  const dataLines = lines
    .slice(1)
    .map((line, index) => ({ line, rowNumber: index + 1 }))
    .filter(({ line }) => line.trim() !== "");

  if (dataLines.length === 0) {
    return { fileError: "noDataRows", rows: [] };
  }

  // 件数超過は行ごとの検証より前に打ち切る。
  if (exceedsRowLimit(lines)) {
    return { fileError: "tooManyRows", rows: [] };
  }

  const existingCodeSet = new Set(
    existingCodes.map((code) => code.trim()).filter((code) => code !== "")
  );

  const parsedRows = dataLines.map(({ line, rowNumber }) => {
    const cells = splitCsvLine(line);
    const [rawName = "", rawCountry = "", rawCompanyCode = ""] = cells;

    return {
      rowNumber,
      hasExtraColumns: cells.length > EXPECTED_HEADER.length,
      name: rawName.trim(),
      country: rawCountry.trim().toUpperCase(),
      companyCode: rawCompanyCode.trim(),
    };
  });

  const codeOccurrences = new Map<string, number>();
  for (const row of parsedRows) {
    if (row.companyCode && !row.hasExtraColumns) {
      codeOccurrences.set(
        row.companyCode,
        (codeOccurrences.get(row.companyCode) ?? 0) + 1
      );
    }
  }

  const rows: CompanyCsvRowResult[] = parsedRows.map((row) => {
    const errors: CompanyCsvRowErrorCode[] = [];

    // 列数超過（引用符なしでカンマを含む値など）は列がずれているため、他の検証は意味を持たない。
    if (row.hasExtraColumns) {
      return {
        rowNumber: row.rowNumber,
        name: row.name,
        country: row.country,
        companyCode: row.companyCode,
        status: "error" as const,
        errors: ["columnCount" as const],
      };
    }

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
