import { describe, expect, it } from "vitest";

import { linkFormSchema } from "@/lib/validation/link";

describe("linkFormSchema", () => {
  it("タイトル・URL・カテゴリが入力されていれば検証を通過する", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      category: "other",
    });

    expect(result.success).toBe(true);
  });

  it("説明（description）が未入力でも検証を通過する", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      category: "other",
      description: "",
    });

    expect(result.success).toBe(true);
  });

  it("タイトルが空文字列の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "",
      url: "https://example.com",
      category: "other",
    });

    expect(result.success).toBe(false);
  });

  it("URLが未入力の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "",
      category: "other",
    });

    expect(result.success).toBe(false);
  });

  it("URLが無効な形式の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "not-a-valid-url",
      category: "other",
    });

    expect(result.success).toBe(false);
  });

  it("URLがjavascript:スキームの場合はエラーになる（XSS対策）", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "javascript:alert(1)",
      category: "other",
    });

    expect(result.success).toBe(false);
  });

  it("URLがdata:スキームの場合はエラーになる（フィッシング対策）", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "data:text/html,<script>alert(1)</script>",
      category: "other",
    });

    expect(result.success).toBe(false);
  });

  it("カテゴリが未選択の場合はエラーになる", () => {
    const result = linkFormSchema.safeParse({
      title: "テストリンク",
      url: "https://example.com",
      category: "",
    });

    expect(result.success).toBe(false);
  });
});
