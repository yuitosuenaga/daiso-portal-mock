import { describe, expect, it } from "vitest";

import { linkCategoryFormSchema } from "@/lib/validation/link-category";

function buildValidInput(overrides: Record<string, unknown> = {}) {
  return {
    parentId: null,
    name: "大分類",
    nameEn: "Major Category",
    ...overrides,
  };
}

describe("linkCategoryFormSchema", () => {
  it("ja/en名称が入力されていれば検証を通過する", () => {
    const result = linkCategoryFormSchema.safeParse(buildValidInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations).toEqual([
        { locale: "en", name: "Major Category" },
      ]);
      expect("nameEn" in result.data).toBe(false);
    }
  });

  it("中分類（parentId指定）でも検証を通過する", () => {
    const result = linkCategoryFormSchema.safeParse(
      buildValidInput({ parentId: "parent-1" })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBe("parent-1");
    }
  });

  it("ja名称が未入力の場合はエラーになる", () => {
    const result = linkCategoryFormSchema.safeParse(buildValidInput({ name: "" }));

    expect(result.success).toBe(false);
  });

  it("en名称（nameEn）が未入力の場合はエラーになる", () => {
    const input = buildValidInput();
    delete (input as Record<string, unknown>).nameEn;

    const result = linkCategoryFormSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("追加言語の言語コードがjaと重複する場合はエラーになる", () => {
    const result = linkCategoryFormSchema.safeParse(
      buildValidInput({ translations: [{ locale: "ja", name: "重複" }] })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語の言語コードがenと重複する場合はエラーになる", () => {
    const result = linkCategoryFormSchema.safeParse(
      buildValidInput({ translations: [{ locale: "en", name: "重複" }] })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語同士で言語コードが重複する場合はエラーになる", () => {
    const result = linkCategoryFormSchema.safeParse(
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

    const result = linkCategoryFormSchema.safeParse(
      buildValidInput({ translations })
    );

    expect(result.success).toBe(false);
  });

  it("追加言語（例: vi）を1件以上のtranslationsとして受理する", () => {
    const result = linkCategoryFormSchema.safeParse(
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
    const first = linkCategoryFormSchema.safeParse(
      buildValidInput({
        translations: [{ locale: "vi", name: "Vietnamese name" }],
      })
    );
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = linkCategoryFormSchema.safeParse(first.data);
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.data.translations).toEqual(first.data.translations);
    }
  });
});
