/**
 * CSV共通部品（エクスポート・インポート共用）。
 * 出力はUTF-8 BOM付き・CRLF・全セルをダブルクォートで囲む形式（Excelでの文字化け・型推測を避ける）。
 */

const BOM = "\uFEFF";
const FORMULA_LEADS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** 行列をCSV文字列にする。全セルを`"`で囲み、`"`は`""`にエスケープ。先頭にBOM、各行末はCRLF。 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",") + "\r\n")
    .join("");
  return BOM + body;
}

/**
 * CSVインジェクション対策。先頭が`= + - @`・タブ・CRのセルは、表計算ソフトが数式として
 * 解釈しないよう先頭に`'`を付ける。
 */
export function neutralizeFormulaCell(value: string): string {
  return value.length > 0 && FORMULA_LEADS.has(value[0]) ? `'${value}` : value;
}

/**
 * `neutralizeFormulaCell`の逆変換。先頭が`'`でその直後が数式開始文字のときだけ`'`を外す。
 * （エクスポートしたCSVをインポートしても値が変わらないようにするため）
 */
export function restoreFormulaCell(value: string): string {
  return value.length >= 2 && value[0] === "'" && FORMULA_LEADS.has(value[1])
    ? value.slice(1)
    : value;
}

/**
 * RFC4180準拠のCSVパーサ。クォート内の改行・`""`・先頭BOMに対応する。
 * 改行はCRLF/LF/CRを許容し、末尾の改行は空行として扱わない。
 */
export function parseCsv(text: string): string[][] {
  const src = text.startsWith(BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  // 現在の行に何か（セル区切り・クォート・文字）が出現したか。空行の判定に使う。
  let touched = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
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
    if (ch === '"') {
      inQuotes = true;
      touched = true;
    } else if (ch === ",") {
      endCell();
      touched = true;
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      if (touched || cell !== "") endRow();
    } else {
      cell += ch;
      touched = true;
    }
  }
  if (touched || cell !== "" || inQuotes) endRow();
  return rows;
}
