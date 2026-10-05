import { describe, expect, it } from "vitest";

import { documentCategoryFormSchema } from "@/lib/validation/document-category";

function buildValidInput(overrides: Record<string, unknown> = {}) {
  return {
    parentId: null,
    name: "大分類",
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("documentCategoryFormSchema", () => {
  it("ja名称・公開範囲が入力されていれば検証を通過する", () => {
    const result = documentCategoryFormSchema.safeParse(buildValidInput());

    expect(result.success).toBe(true);
  });

  it("中分類（parentId指定）でも検証を通過する", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ parentId: "parent-1" })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBe("parent-1");
    }
  });

  it("ja名称が未入力の場合はエラーになる", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ name: "" })
    );

    expect(result.success).toBe(false);
  });

  it("特定の国・地域を指定したのに0件の場合はエラーになる", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ targeting: { scope: "countries", countries: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("特定の販社を指定したのに0件の場合はエラーになる", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ targeting: { scope: "companies", companyCodes: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({
        targeting: { scope: "countries", countries: ["VN", "TH"] },
      })
    );

    expect(result.success).toBe(true);
  });

  it("クライアントから送られた翻訳（nameEn/translations）は出力に含まれず無視される", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({
        nameEn: "Major Category",
        translations: [{ locale: "vi", name: "Vietnamese name" }],
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect("nameEn" in result.data).toBe(false);
      expect("translations" in result.data).toBe(false);
    }
  });
});
