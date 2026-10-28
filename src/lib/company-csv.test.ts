import { describe, expect, it } from "vitest";

import {
  MAX_COMPANY_CSV_ROWS,
  isFullyValidCompanyCsv,
  parseAndValidateCompanyCsv,
  precheckCompanyCsvText,
  toCreateCompanyInputs,
} from "@/lib/company-csv";

describe("parseAndValidateCompanyCsv", () => {
  it("正常なCSVは全行okとして解析し、isFullyValidCompanyCsvがtrueを返す（要件19.4, 19.5, 19.6）", () => {
    const csv = [
      "name,country,companyCode",
      "Daiso Thailand,TH,th-daiso-thailand",
      "Daiso Vietnam,vn,vn-daiso-vietnam",
    ].join("\n");

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.fileError).toBeUndefined();
    expect(result.rows).toEqual([
      {
        rowNumber: 1,
        name: "Daiso Thailand",
        country: "TH",
        companyCode: "th-daiso-thailand",
        status: "ok",
        errors: [],
      },
      {
        rowNumber: 2,
        name: "Daiso Vietnam",
        country: "VN",
        companyCode: "vn-daiso-vietnam",
        status: "ok",
        errors: [],
      },
    ]);
    expect(isFullyValidCompanyCsv(result)).toBe(true);
  });

  it("ダブルクォート囲みの値を基本対応で解釈する", () => {
    const csv = [
      "name,country,companyCode",
      '"Daiso Thailand",TH,"th-daiso-thailand"',
    ].join("\n");

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.rows[0]).toMatchObject({
      name: "Daiso Thailand",
      companyCode: "th-daiso-thailand",
    });
  });

  it("ヘッダー行が期待する列と一致しないときfileError='headerMismatch'を返す（要件19.12）", () => {
    const csv = ["name,country", "Daiso Thailand,TH"].join("\n");

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.fileError).toBe("headerMismatch");
    expect(result.rows).toEqual([]);
  });

  it("空ファイルのときfileError='empty'を返す（要件19.12）", () => {
    const result = parseAndValidateCompanyCsv("");

    expect(result.fileError).toBe("empty");
    expect(result.rows).toEqual([]);
  });

  it("空白のみのファイルのときfileError='empty'を返す", () => {
    const result = parseAndValidateCompanyCsv("   \n  \n");

    expect(result.fileError).toBe("empty");
  });

  it("ヘッダー行のみでデータ行が0件のときfileError='noDataRows'を返す（要件19.12）", () => {
    const csv = "name,country,companyCode";

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.fileError).toBe("noDataRows");
    expect(result.rows).toEqual([]);
  });

  it("国コードがINQUIRY_COUNTRY_CODESに含まれないとき'invalidCountry'エラーを付与する（要件19.5）", () => {
    const csv = ["name,country,companyCode", "Daiso Nowhere,XX,xx-daiso-nowhere"].join(
      "\n"
    );

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.rows[0].status).toBe("error");
    expect(result.rows[0].errors).toContain("invalidCountry");
  });

  it("必須項目が空のとき'required'エラーを付与する（要件19.6）", () => {
    const csv = [",TH,th-daiso-thailand"].join("\n");
    const withHeader = ["name,country,companyCode", csv].join("\n");

    const result = parseAndValidateCompanyCsv(withHeader);

    expect(result.rows[0].status).toBe("error");
    expect(result.rows[0].errors).toContain("required");
  });

  it("販社コードが命名規則に違反するとき'companyCodeFormat'エラーを付与する（要件19.6）", () => {
    const csv = ["name,country,companyCode", "Daiso Thailand,TH,TH_001"].join("\n");

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.rows[0].status).toBe("error");
    expect(result.rows[0].errors).toContain("companyCodeFormat");
  });

  it("既存Companyの販社コードと重複するとき'companyCodeDuplicate'エラーを付与する（要件19.7）", () => {
    const csv = ["name,country,companyCode", "Daiso Thailand,TH,th-daiso-thailand"].join(
      "\n"
    );

    const result = parseAndValidateCompanyCsv(csv, ["th-daiso-thailand"]);

    expect(result.rows[0].status).toBe("error");
    expect(result.rows[0].errors).toContain("companyCodeDuplicate");
  });

  it("同一ファイル内で販社コードが重複するとき、該当する全行に'duplicateInFile'エラーを付与する（要件19.7）", () => {
    const csv = [
      "name,country,companyCode",
      "Daiso Thailand,TH,th-daiso-thailand",
      "Daiso Thailand 2,TH,th-daiso-thailand",
    ].join("\n");

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.rows[0].errors).toContain("duplicateInFile");
    expect(result.rows[1].errors).toContain("duplicateInFile");
  });

  it("一部の行にエラーがある混在CSVはisFullyValidCompanyCsvがfalseを返す（要件19.9）", () => {
    const csv = [
      "name,country,companyCode",
      "Daiso Thailand,TH,th-daiso-thailand",
      "Daiso Bad,XX,bad_code",
    ].join("\n");

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.rows[0].status).toBe("ok");
    expect(result.rows[1].status).toBe("error");
    expect(isFullyValidCompanyCsv(result)).toBe(false);
  });

  it("小文字の国コードは大文字化して受理する（要件19.5）", () => {
    const csv = ["name,country,companyCode", "Daiso Vietnam,vn,vn-daiso-vietnam"].join(
      "\n"
    );

    const result = parseAndValidateCompanyCsv(csv);

    expect(result.rows[0].country).toBe("VN");
    expect(result.rows[0].status).toBe("ok");
  });
});

describe("toCreateCompanyInputs", () => {
  it("行結果からCreateCompanyInputの配列を組み立てる", () => {
    const parsed = parseAndValidateCompanyCsv(
      ["name,country,companyCode", "Daiso Thailand,TH,th-daiso-thailand"].join("\n")
    );

    expect(toCreateCompanyInputs(parsed.rows)).toEqual([
      { name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" },
    ]);
  });
});

function buildCsv(rowCount: number): string {
  const lines = ["name,country,companyCode"];
  for (let i = 1; i <= rowCount; i += 1) {
    lines.push(`Company ${i},TH,code-${i}`);
  }
  return lines.join("\n");
}

describe("parseAndValidateCompanyCsv: 堅牢化", () => {
  it("Shift_JISのバイト列をUTF-8として読んだ文字列（U+FFFD含む）はinvalidEncodingで拒否する", () => {
    const sjisBytes = new Uint8Array([
      ...new TextEncoder().encode("name,country,companyCode\n"),
      0x8a, 0x94, 0x8e, 0xae, 0x89, 0xef, 0x8e, 0xd0, // 「株式会社」(Shift_JIS)
      ...new TextEncoder().encode(",JP,jp-001\n"),
    ]);
    const text = new TextDecoder("utf-8").decode(sjisBytes);
    expect(text).toContain("\uFFFD");

    expect(parseAndValidateCompanyCsv(text)).toEqual({
      fileError: "invalidEncoding",
      rows: [],
    });
  });

  it("BOM付きUTF-8は正常に読める（回帰）", () => {
    const result = parseAndValidateCompanyCsv(
      "\uFEFFname,country,companyCode\nDaiso,TH,th-daiso"
    );
    expect(result.fileError).toBeUndefined();
    expect(result.rows[0].status).toBe("ok");
  });

  it("MAX行ちょうどは受け付け、MAX+1行はtooManyRowsで拒否する", () => {
    const ok = parseAndValidateCompanyCsv(buildCsv(MAX_COMPANY_CSV_ROWS));
    expect(ok.fileError).toBeUndefined();
    expect(ok.rows).toHaveLength(MAX_COMPANY_CSV_ROWS);

    expect(parseAndValidateCompanyCsv(buildCsv(MAX_COMPANY_CSV_ROWS + 1))).toEqual({
      fileError: "tooManyRows",
      rows: [],
    });
  });

  it("判定の順序は 空 → 文字コード → ヘッダー → データ0件 → 件数超過", () => {
    expect(parseAndValidateCompanyCsv("   ").fileError).toBe("empty");
    expect(parseAndValidateCompanyCsv("\uFFFD,a,b\nx").fileError).toBe("invalidEncoding");
    expect(
      parseAndValidateCompanyCsv(
        ["bad,header,x", ...Array.from({ length: MAX_COMPANY_CSV_ROWS + 1 }, () => "a,b,c")].join("\n")
      ).fileError
    ).toBe("headerMismatch");
    expect(parseAndValidateCompanyCsv("name,country,companyCode\n\n").fileError).toBe("noDataRows");
  });

  it("4列目以降に値があるとcolumnCount（他の検証エラーは付けない）", () => {
    const result = parseAndValidateCompanyCsv(
      "name,country,companyCode\nDaiso,TH,th-daiso,extra"
    );
    expect(result.rows[0].errors).toEqual(["columnCount"]);
    expect(result.rows[0].status).toBe("error");
  });

  it("引用符なしでカンマを含む会社名はinvalidCountryではなくcolumnCountになる", () => {
    const result = parseAndValidateCompanyCsv(
      "name,country,companyCode\nDaiso, Inc.,TH,th-daiso"
    );
    expect(result.rows[0].errors).toEqual(["columnCount"]);
  });

  it("末尾の空セル（Excelが出す a,b,c,,）はヘッダー・データ行とも許容する", () => {
    const result = parseAndValidateCompanyCsv(
      "name,country,companyCode,,\nDaiso,TH,th-daiso,,\nDaiso2,VN,vn-daiso,"
    );
    expect(result.fileError).toBeUndefined();
    expect(result.rows.map((r) => r.status)).toEqual(["ok", "ok"]);
  });

  it("ヘッダーに空でない余分な列があればheaderMismatch", () => {
    expect(
      parseAndValidateCompanyCsv("name,country,companyCode,memo\nDaiso,TH,th-daiso").fileError
    ).toBe("headerMismatch");
  });

  it("データ行の間に空行があっても行番号は物理行（ヘッダーの次=1）に基づく", () => {
    const result = parseAndValidateCompanyCsv(
      "name,country,companyCode\nA,TH,code-a\n\n,TH,code-b\nC,TH,code-c"
    );
    expect(result.rows.map((r) => r.rowNumber)).toEqual([1, 3, 4]);
    expect(result.rows[1].errors).toContain("required");
  });
});

describe("precheckCompanyCsvText", () => {
  it("正常なテキストはnull", () => {
    expect(precheckCompanyCsvText(buildCsv(3))).toBeNull();
  });
  it("空はempty、U+FFFDはinvalidEncoding、MAX+1行はtooManyRows", () => {
    expect(precheckCompanyCsvText("  \n")).toBe("empty");
    expect(precheckCompanyCsvText("name\uFFFD")).toBe("invalidEncoding");
    expect(precheckCompanyCsvText(buildCsv(MAX_COMPANY_CSV_ROWS + 1))).toBe("tooManyRows");
    expect(precheckCompanyCsvText(buildCsv(MAX_COMPANY_CSV_ROWS))).toBeNull();
  });
});
