import { describe, expect, it } from "vitest";

import { announcementFormSchema } from "@/lib/validation/announcement";

describe("announcementFormSchema", () => {
  it("全体一律の配信対象で必須項目が入力されていれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(true);
  });

  it("publishWithoutTranslationは省略時false、指定すればその値になり、真偽値以外はエラーになる", () => {
    const base = {
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    };

    const omitted = announcementFormSchema.parse(base);
    expect(omitted.publishWithoutTranslation).toBe(false);
    expect(
      announcementFormSchema.parse({ ...base, publishWithoutTranslation: true })
        .publishWithoutTranslation
    ).toBe(true);
    expect(
      announcementFormSchema.safeParse({ ...base, publishWithoutTranslation: "yes" }).success
    ).toBe(false);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: true,
      sendEmailNotification: false,
      dueDate: "2026-08-01",
    });

    expect(result.success).toBe(true);
  });

  it("対応要否(actionRequired)が真偽値でない場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      sendEmailNotification: false,
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
      status: "published",
      targeting: { scope: "all" },
    });

    expect(result.success).toBe(false);
  });

  it("本文が空文字列の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
    });

    expect(result.success).toBe(false);
  });

  it("種別が不正な値の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "not-a-real-category",
      status: "published",
      targeting: { scope: "all" },
    });

    expect(result.success).toBe(false);
  });

  it("特定の国・地域を指定したのに0件の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "countries", countries: [] },
    });

    expect(result.success).toBe(false);
  });

  it("公開期間・対応期限が未入力の場合はnullとして検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
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
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
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
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
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
      status: "published",
      targeting: { scope: "all" },
      actionRequired: true,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(false);
  });

  it("対応要否が偽の場合は対応期限が未入力でも検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(true);
  });

  it("対応要否が偽の場合は対応期限が入力されていてもnullに正規化する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      dueDate: "2026-08-01",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueDate).toBeNull();
    }
  });

  it("公開状態が下書きの場合は検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "draft",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(true);
  });

  it("公開状態が不正な値の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "not-a-real-status",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(false);
  });

  it("公開状態が未指定の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(false);
  });

  it("attachments・linkedDocumentIdsが未指定の場合は空配列として検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachments).toEqual([]);
      expect(result.data.linkedDocumentIds).toEqual([]);
    }
  });

  it("添付ファイルが6件以上の場合はエラーになる", () => {
    const attachments = Array.from({ length: 6 }, (_, i) => ({
      id: `att-${i}`,
      fileName: `file-${i}.pdf`,
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
    }));

    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments,
    });

    expect(result.success).toBe(false);
  });

  it("添付ファイルの形式が許可されていない場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [
        {
          id: "att-1",
          fileName: "malicious.exe",
          fileType: "application/x-msdownload",
          fileSize: 1024,
          dataUrl: "data:application/x-msdownload;base64,AAAA",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("添付ファイルのサイズが上限を超える場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [
        {
          id: "att-1",
          fileName: "large.pdf",
          fileType: "application/pdf",
          fileSize: 6 * 1024 * 1024,
          dataUrl: "data:application/pdf;base64,AAAA",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("紐づけドキュメントIDが6件以上の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      linkedDocumentIds: ["1", "2", "3", "4", "5", "6"],
    });

    expect(result.success).toBe(false);
  });

  it("紐づけドキュメントIDが5件以下であれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      linkedDocumentIds: ["1", "2", "3", "4", "5"],
    });

    expect(result.success).toBe(true);
  });

  it("翻訳関連の入力（titleEn・bodyEn・translations）は無視され、出力に含まれない", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      translations: [{ locale: "th", title: "a", body: "b" }],
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("translations");
      expect(result.data).not.toHaveProperty("titleEn");
    }
  });
});
