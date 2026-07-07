import { describe, expect, it } from "vitest";

import { announcementFormSchema } from "@/lib/validation/announcement";

describe("announcementFormSchema", () => {
  it("全体一律の配信対象で必須項目が入力されていれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: true,
    });

    expect(result.success).toBe(true);
  });

  it("対応要否(actionRequired)が真偽値でない場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: "yes",
    });

    expect(result.success).toBe(false);
  });

  it("タイトルが空文字列の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
    });

    expect(result.success).toBe(false);
  });

  it("本文が空文字列の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "",
      category: "maintenance",
      targeting: { scope: "all" },
    });

    expect(result.success).toBe(false);
  });

  it("種別が不正な値の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "not-a-real-category",
      targeting: { scope: "all" },
    });

    expect(result.success).toBe(false);
  });

  it("特定の国・地域を指定したのに0件の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "countries", countries: [] },
    });

    expect(result.success).toBe(false);
  });
});
