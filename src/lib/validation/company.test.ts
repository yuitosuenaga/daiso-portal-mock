import { describe, expect, it } from "vitest";

import { companyFormSchema } from "@/lib/validation/company";

describe("companyFormSchema", () => {
  it("会社名・国・販社コードが入力されていれば検証を通過する", () => {
    const result = companyFormSchema.safeParse({
      name: "Daiso Thailand",
      country: "TH",
      companyCode: "TH-001",
    });

    expect(result.success).toBe(true);
  });

  it("会社名が空文字列の場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "",
      country: "TH",
      companyCode: "TH-001",
    });

    expect(result.success).toBe(false);
  });

  it("会社名が空白文字のみの場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "   ",
      country: "TH",
      companyCode: "TH-001",
    });

    expect(result.success).toBe(false);
  });

  it("国が未選択の場合はエラーになる", () => {
    const result = companyFormSchema.safeParse({
      name: "Daiso Thailand",
      country: "",
      companyCode: "TH-001",
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
});
