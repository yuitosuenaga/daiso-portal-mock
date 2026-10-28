/**
 * CSV共通部品（エクスポート・インポート共用）。
 * 出力はUTF-8 BOM付き・CRLF・全セルをダブルクォートで囲む形式（Excelでの文字化け・型推測を避ける）。
 */

const BOM = "\uFEFF";
// OWASP準拠の数式開始文字。先頭空白+`=`や`\n=`はExcelで数式にならずOWASPの対象外のため対象外とする。
const NEUTRALIZE_RE = /^'*[=+\-@\t\r]/;
const RESTORE_RE = /^'+[=+\-@\t\r]/;

/** CSVの構文エラー。`code`で種別を判別できる(インポート側でfileErrorにするため)。 */
export class CsvParseError extends Error {
  readonly code: "unclosedQuote";
  constructor(code: "unclosedQuote", message?: string) {
    super(message ?? code);
    this.name = "CsvParseError";
    this.code = code;
  }
}

/** 行列をCSV文字列にする。全セルを`"`で囲み、`"`は`""`にエスケープ。先頭にBOM、各行末はCRLF。 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",") + "\r\n")
    .join("");
  return BOM + body;
}

/**
 * CSVインジェクション対策。先頭が`'`の連続(0個以上)+`= + - @`・タブ・CRのセルは、
 * 表計算ソフトが数式として解釈しないよう先頭に`'`を1つ足す。`'=x`のように既に`'`が付いた値も
 * 足すことで、`restoreFormulaCell`と可逆(`restore(neutralize(v)) === v`)になる。
 */
export function neutralizeFormulaCell(value: string): string {
  return NEUTRALIZE_RE.test(value) ? `'${value}` : value;
}

/**
 * `neutralizeFormulaCell`の逆変換。先頭が`'`の連続+数式開始文字のときだけ`'`を1つ外す。
 * （エクスポートしたCSVをインポートしても値が変わらないようにするため）
 */
export function restoreFormulaCell(value: string): string {
  return RESTORE_RE.test(value) ? value.slice(1) : value;
}

/**
 * RFC4180準拠のCSVパーサ。クォート内の改行・`""`・先頭BOMに対応する。
 * 改行はCRLF/LF/CRを許容し、末尾の改行は空行として扱わない。
 *
 * 仕様(テストで固定):
 * - 閉じていないクォートは`CsvParseError`(code=`unclosedQuote`)を投げる。
 * - クォートなしセルの途中の`"`(`ab"c`)は寛容に通常の文字として読む(別PRで厳格化する余地あり)。
 * - 区切り・文字のない行は空行としてスキップする。クォートされた空セル`""`の行はスキップしない。
 */
export function parseCsv(text: string): string[][] {
  const src = text.startsWith(BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  // 現在の行に何か（セル区切り・クォート・文字）が出現したか。空行の判定に使う。
  let touched = false;
  // 現在のセルに文字またはクォートが出現したか。セル先頭の`"`だけをクォート開始と見なす。
  let cellStarted = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
    cellStarted = false;
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
    touched = false;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && !cellStarted) {
      inQuotes = true;
      cellStarted = true;
      touched = true;
    } else if (ch === ",") {
      endCell();
      touched = true;
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      if (touched || cell !== "") endRow();
    } else {
      cell += ch;
      cellStarted = true;
      touched = true;
    }
  }
  if (inQuotes) throw new CsvParseError("unclosedQuote", "CSV has an unclosed quote");
  if (touched || cell !== "") endRow();
  return rows;
}
