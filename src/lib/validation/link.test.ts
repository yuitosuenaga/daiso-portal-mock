import { describe, expect, it } from "vitest";

import { linkFormSchema } from "@/lib/validation/link";

describe("linkFormSchema", () => {
  it("タイトル・URL・大分類が入力されていれば検証を通過する", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      categoryId: "category-1",
    });

    expect(result.success).toBe(true);
  });

  it("中分類（subCategoryId）が入力されていれば検証を通過する", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      categoryId: "category-1",
      subCategoryId: "sub-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subCategoryId).toBe("sub-1");
    }
  });

  it("説明（description）が未入力でも検証を通過する", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      categoryId: "category-1",
      description: "",
    });

    expect(result.success).toBe(true);
  });

  it("タイトルが空文字列の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "",
      url: "https://example.com",
      categoryId: "category-1",
    });

    expect(result.success).toBe(false);
  });

  it("URLが未入力の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "",
      categoryId: "category-1",
    });

    expect(result.success).toBe(false);
  });

  it("URLが無効な形式の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "not-a-valid-url",
      categoryId: "category-1",
    });

    expect(result.success).toBe(false);
  });

  it("URLがjavascript:スキームの場合はエラーになる（XSS対策）", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "javascript:alert(1)",
      categoryId: "category-1",
    });

    expect(result.success).toBe(false);
  });

  it("URLがdata:スキームの場合はエラーになる（フィッシング対策）", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "data:text/html,<script>alert(1)</script>",
      categoryId: "category-1",
    });

    expect(result.success).toBe(false);
  });

  it("大分類（categoryId）が未入力の場合はエラーになる（要件12.6）", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      categoryId: "",
    });

    expect(result.success).toBe(false);
  });

  it("中分類が空文字列（未選択）のときnullへ正規化される", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      categoryId: "category-1",
      subCategoryId: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subCategoryId).toBeNull();
    }
  });

  it("中分類を省略したときnullへ正規化される", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      categoryId: "category-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subCategoryId).toBeNull();
    }
  });
});
