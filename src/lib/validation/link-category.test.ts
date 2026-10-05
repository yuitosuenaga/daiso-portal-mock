import { describe, expect, it } from "vitest";

import { linkCategoryFormSchema } from "@/lib/validation/link-category";

describe("linkCategoryFormSchema", () => {
  it("ja名称のみで検証を通過する（翻訳は保存時に自動生成される）", () => {
    const result = linkCategoryFormSchema.safeParse({ parentId: null, name: "大分類" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ parentId: null, name: "大分類" });
    }
  });

  it("中分類（parentId指定）でも検証を通過する", () => {
    const result = linkCategoryFormSchema.safeParse({ parentId: "parent-1", name: "中分類" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBe("parent-1");
    }
  });

  it("ja名称が未入力・空白のみの場合はエラーになる", () => {
    expect(linkCategoryFormSchema.safeParse({ parentId: null, name: "" }).success).toBe(false);
    expect(linkCategoryFormSchema.safeParse({ parentId: null, name: "   " }).success).toBe(false);
  });
});
