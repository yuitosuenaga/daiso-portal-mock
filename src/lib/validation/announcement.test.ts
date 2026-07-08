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
      dueDate: "2026-08-01",
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

  it("公開期間・対応期限が未入力の場合はnullとして検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publishStartDate).toBeNull();
      expect(result.data.publishEndDate).toBeNull();
      expect(result.data.dueDate).toBeNull();
    }
  });

  it("公開終了日が公開開始日より前の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: "2026-08-10",
      publishEndDate: "2026-08-01",
    });

    expect(result.success).toBe(false);
  });

  it("公開終了日が公開開始日以降の場合は検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: "2026-08-01",
      publishEndDate: "2026-08-10",
    });

    expect(result.success).toBe(true);
  });

  it("対応要否が真で対応期限が未入力の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: true,
    });

    expect(result.success).toBe(false);
  });

  it("対応要否が偽の場合は対応期限が未入力でも検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
  });
});
