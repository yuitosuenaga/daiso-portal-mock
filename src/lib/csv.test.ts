import { describe, expect, it } from "vitest";

import {
  CsvParseError,
  neutralizeFormulaCell,
  parseCsv,
  restoreFormulaCell,
  toCsv,
} from "@/lib/csv";

describe("toCsv", () => {
  it("BOM付き・CRLF・全セルをクォートする", () => {
    expect(toCsv([["a", "b"], ["1", "2"]])).toBe('\uFEFF"a","b"\r\n"1","2"\r\n');
  });

  it("ダブルクォートは二重化する", () => {
    expect(toCsv([['say "hi"']])).toBe('\uFEFF"say ""hi"""\r\n');
  });

  it("カンマ・改行を含むセルもそのまま保持する", () => {
    expect(toCsv([["a,b", "x\ny"]])).toBe('\uFEFF"a,b","x\ny"\r\n');
  });

  it("空セルは空クォートになる", () => {
    expect(toCsv([["", "x"]])).toBe('\uFEFF"","x"\r\n');
  });

  it("行が無ければBOMのみ", () => {
    expect(toCsv([])).toBe("\uFEFF");
  });
});

describe("neutralizeFormulaCell / restoreFormulaCell", () => {
  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"])("%j は先頭に ' が付く", (v) => {
    expect(neutralizeFormulaCell(v)).toBe(`'${v}`);
  });

  it.each(["abc", "", "a=b", "'abc", "'", " =x", "\n=x"])("%j は変更されない", (v) => {
    expect(neutralizeFormulaCell(v)).toBe(v);
  });

  it("' で始まり危険文字が続く値は ' を重ねる", () => {
    expect(neutralizeFormulaCell("=x")).toBe("'=x");
    expect(neutralizeFormulaCell("'=x")).toBe("''=x");
    expect(neutralizeFormulaCell("'''=x")).toBe("''''=x");
  });

  const roundTripValues = [
    "'=x", "''=x", "'+1", "'@foo", "'", "'abc", "'\tx", "=x", "+81", "-1", "@a",
    "\tx", "\rx", "", "abc", "'''=x",
  ];
  it.each(roundTripValues)("restore(neutralize(v)) === v: %j", (v) => {
    expect(restoreFormulaCell(neutralizeFormulaCell(v))).toBe(v);
    if (!/^'*[=+\-@\t\r]/.test(v)) expect(neutralizeFormulaCell(v)).toBe(v);
  });

  it("toCsv -> parseCsv -> restore の往復で値が変わらない", () => {
    const values = [...roundTripValues, 'q"uote', "a\r\nb", 'x,"y"', "'=\"z\"\n"];
    const [row] = parseCsv(toCsv([values.map(neutralizeFormulaCell)]));
    expect(row.map(restoreFormulaCell)).toEqual(values);
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx", "abc", ""])("往復で元に戻る: %j", (v) => {
    expect(restoreFormulaCell(neutralizeFormulaCell(v))).toBe(v);
  });

  it("' の直後が危険文字でなければ外さない", () => {
    expect(restoreFormulaCell("'abc")).toBe("'abc");
    expect(restoreFormulaCell("'")).toBe("'");
    expect(restoreFormulaCell("''=x")).toBe("'=x");
    expect(restoreFormulaCell("'''=x")).toBe("''=x");
  });
});

describe("parseCsv", () => {
  it("基本的な行列を読む(CRLF/LF/末尾改行なし)", () => {
    expect(parseCsv("a,b\r\n1,2\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("先頭BOMを除去する", () => {
    expect(parseCsv('\uFEFF"a","b"\r\n')).toEqual([["a", "b"]]);
  });

  it("クォート内の改行・カンマ・二重クォートを扱う", () => {
    expect(parseCsv('"a\r\nb","c,d","e""f"\r\n')).toEqual([["a\r\nb", "c,d", 'e"f']]);
  });

  it("空セルと空クォートを空文字として読む", () => {
    expect(parseCsv('"",,x\r\n')).toEqual([["", "", "x"]]);
  });

  it("末尾の改行で空行を作らない", () => {
    expect(parseCsv("a\r\n")).toEqual([["a"]]);
  });

  it("閉じていないクォートは CsvParseError(code=unclosedQuote)", () => {
    for (const text of ['"abc', 'a,"b\r\nc,d\r\n', '"a""']) {
      let err: unknown;
      try {
        parseCsv(text);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(CsvParseError);
      expect((err as CsvParseError).code).toBe("unclosedQuote");
    }
  });

  it('クォートなしセル途中の " は寛容にそのまま文字として読む(仕様固定)', () => {
    expect(parseCsv('ab"c,d')).toEqual([['ab"c', "d"]]);
  });

  it("区切り・文字のない行は空行としてスキップ。クォートされた空セルの行は残る", () => {
    expect(parseCsv("a\r\n\r\nb\n\n")).toEqual([["a"], ["b"]]);
    expect(parseCsv('"a"\r\n""\r\n"b"')).toEqual([["a"], [""], ["b"]]);
  });

  it("空入力は空配列", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\uFEFF")).toEqual([]);
  });
});

describe("toCsv -> parseCsv の往復", () => {
  it("特殊文字を含む行列が元に戻る", () => {
    const rows = [
      ["email", "name"],
      ["a@example.com", 'He said "yo"'],
      ["b@example.com", "line1\r\nline2, with comma"],
      ["", "日本語"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
