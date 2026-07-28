import { describe, expect, it } from "vitest";

import { documentCategoryFormSchema } from "@/lib/validation/document-category";

function buildValidInput(overrides: Record<string, unknown> = {}) {
  return {
    parentId: null,
    name: "大分類",
    nameEn: "Major Category",
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("documentCategoryFormSchema", () => {
  it("ja/en名称・公開範囲が入力されていれば検証を通過する", () => {
    const result = documentCategoryFormSchema.safeParse(buildValidInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations).toEqual([
        { locale: "en", name: "Major Category" },
      ]);
      expect("nameEn" in result.data).toBe(false);
    }
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

  it("en名称（nameEn）が未入力の場合はエラーになる", () => {
    const input = buildValidInput();
    delete (input as Record<string, unknown>).nameEn;

    const result = documentCategoryFormSchema.safeParse(input);

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

  it("追加言語の言語コードがjaと重複する場合はエラーになる", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ translations: [{ locale: "ja", name: "重複" }] })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語の言語コードがenと重複する場合はエラーになる", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ translations: [{ locale: "en", name: "重複" }] })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語同士で言語コードが重複する場合はエラーになる", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({
        translations: [
          { locale: "vi", name: "1件目" },
          { locale: "vi", name: "2件目" },
        ],
      })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語が上限（20件）を超える場合はエラーになる", () => {
    const translations = Array.from({ length: 21 }, (_, i) => ({
      locale: `l${i}`,
      name: `名称${i}`,
    }));

    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({ translations })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語（例: vi）を1件以上のtranslationsとして受理する", () => {
    const result = documentCategoryFormSchema.safeParse(
      buildValidInput({
        translations: [{ locale: "vi", name: "Vietnamese name" }],
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations).toEqual([
        { locale: "en", name: "Major Category" },
        { locale: "vi", name: "Vietnamese name" },
      ]);
    }
  });

  it("再パース（transform後の出力を再度safeParseする）が冪等である", () => {
    const first = documentCategoryFormSchema.safeParse(
      buildValidInput({
        translations: [{ locale: "vi", name: "Vietnamese name" }],
      })
    );
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = documentCategoryFormSchema.safeParse(first.data);
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.data.translations).toEqual(first.data.translations);
    }
  });
});
