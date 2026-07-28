import { describe, expect, it } from "vitest";

import {
  mapDocumentCategory,
  resolveDocumentCategoryContent,
} from "@/lib/server/document-category-mapper";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "category-1",
    parentId: null as string | null,
    name: "大分類",
    displayOrder: 0,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
    createdAt: new Date("2026-07-28T00:00:00.000Z"),
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    translations: [] as { locale: string; name: string }[],
    ...overrides,
  };
}

describe("mapDocumentCategory", () => {
  it("翻訳・公開範囲・表示順・親子関係を正しくマッピングする", () => {
    const result = mapDocumentCategory(
      baseRecord({
        parentId: "parent-1",
        displayOrder: 3,
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
        translations: [{ locale: "en", name: "Major Category" }],
      }) as never
    );

    expect(result).toEqual({
      id: "category-1",
      parentId: "parent-1",
      name: "大分類",
      displayOrder: 3,
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      translations: [{ locale: "en", name: "Major Category" }],
    });
  });

  it("targetingScope: companiesのとき、companyCodesを含むtargetingへマッピングする", () => {
    const result = mapDocumentCategory(
      baseRecord({
        targetingScope: "companies",
        targetingCompanyCodes: ["vn-daiso-vietnam"],
      }) as never
    );

    expect(result.targeting).toEqual({
      scope: "companies",
      companyCodes: ["vn-daiso-vietnam"],
    });
  });
});

describe("resolveDocumentCategoryContent", () => {
  function category(
    overrides: Partial<{
      name: string;
      translations: { locale: string; name: string }[];
    }> = {}
  ) {
    return {
      name: "日本語名称",
      translations: [{ locale: "en", name: "English name" }],
      ...overrides,
    };
  }

  it("localeがjaのとき親列（name）を返す", () => {
    expect(resolveDocumentCategoryContent(category(), "ja")).toEqual({
      name: "日本語名称",
    });
  });

  it("localeに一致する翻訳があればその内容を返す", () => {
    const result = resolveDocumentCategoryContent(
      category({
        translations: [
          { locale: "en", name: "English name" },
          { locale: "vi", name: "Vietnamese name" },
        ],
      }),
      "vi"
    );

    expect(result).toEqual({ name: "Vietnamese name" });
  });

  it("localeに一致する翻訳が無い場合はenにフォールバックする", () => {
    expect(resolveDocumentCategoryContent(category(), "vi")).toEqual({
      name: "English name",
    });
  });

  it("localeに一致する翻訳もenも無い場合は既定言語（ja＝親列）にフォールバックする", () => {
    const result = resolveDocumentCategoryContent(
      category({ translations: [] }),
      "vi"
    );

    expect(result).toEqual({ name: "日本語名称" });
  });
});
