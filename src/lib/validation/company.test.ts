import { describe, expect, it } from "vitest";

import { companyFormSchema } from "@/lib/validation/company";

describe("companyFormSchema", () => {
  it("会社名・国・販社コードが入力されていれば検証を通過する", () => {
    const result = companyFormSchema.safeParse({
      name: "Daiso Thailand",
      country: "TH",
      companyCode: "th-daiso-thailand",
    });

    expect(result.success).toBe(true);
  });

  it("会社名が空文字列の場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "",
      country: "TH",
      companyCode: "th-daiso-thailand",
    });

    expect(result.success).toBe(false);
  });

  it("会社名が空白文字のみの場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "   ",
      country: "TH",
      companyCode: "th-daiso-thailand",
    });

    expect(result.success).toBe(false);
  });

  it("国が未選択の場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "Daiso Thailand",
      country: "",
      companyCode: "th-daiso-thailand",
    });

    expect(result.success).toBe(false);
  });

  it("販社コードが空文字列の場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "Daiso Thailand",
      country: "TH",
      companyCode: "",
    });

    expect(result.success).toBe(false);
  });

  it("販社コードが空白文字のみの場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "Daiso Thailand",
      country: "TH",
      companyCode: "   ",
    });

    expect(result.success).toBe(false);
  });

  describe("販社コードのフォーマット検証（要件18）", () => {
    it.each([
      "vn-daiso-vietnam",
      "jp-daiso-japan-trading",
      "a-1",
      "abc123",
    ])("正しい形式（%s）は検証を通過する", (companyCode) => {
      const result = companyFormSchema.safeParse({
        name: "Daiso Thailand",
        country: "TH",
        companyCode,
      });

      expect(result.success).toBe(true);
    });

    it.each([
      ["大文字を含む", "VN-daiso-vietnam"],
      ["先頭がハイフン", "-vn-daiso-vietnam"],
      ["末尾がハイフン", "vn-daiso-vietnam-"],
      ["連続したハイフン", "vn--daiso-vietnam"],
      ["許可されない記号を含む", "vn_daiso_vietnam"],
      ["全角文字を含む", "ベトナム"],
    ])("不正な形式（%s: %s）はエラーになる", (_label, companyCode) => {
      const result = companyFormSchema.safeParse({
        name: "Daiso Thailand",
        country: "TH",
        companyCode,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.path.includes("companyCode")
        );
        expect(issue?.code).toBe("invalid_format");
      }
    });
  });
});
