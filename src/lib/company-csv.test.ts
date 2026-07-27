import { describe, expect, it } from "vitest";

import {
  isFullyValidCompanyCsv,
  parseAndValidateCompanyCsv,
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
