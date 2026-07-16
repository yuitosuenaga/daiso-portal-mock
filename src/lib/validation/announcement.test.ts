import { describe, expect, it } from "vitest";

import { announcementFormSchema } from "@/lib/validation/announcement";

describe("announcementFormSchema", () => {
  it("全体一律の配信対象で必須項目が入力されていれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: "yes",
    });

    expect(result.success).toBe(false);
  });

  it("タイトルが空文字列の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: true,
    });

    expect(result.success).toBe(false);
  });

  it("対応要否が偽の場合は対応期限が未入力でも検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
  });

  it("対応要否が偽の場合は対応期限が入力されていてもnullに正規化する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "draft",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
  });

  it("公開状態が不正な値の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "not-a-real-status",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(false);
  });

  it("公開状態が未指定の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(false);
  });

  it("attachments・linkedDocumentIdsが未指定の場合は空配列として検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      attachments,
    });

    expect(result.success).toBe(false);
  });

  it("添付ファイルの形式が許可されていない場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
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
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      linkedDocumentIds: ["1", "2", "3", "4", "5", "6"],
    });

    expect(result.success).toBe(false);
  });

  it("紐づけドキュメントIDが5件以下であれば検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      linkedDocumentIds: ["1", "2", "3", "4", "5"],
    });

    expect(result.success).toBe(true);
  });

  it("titleEnが未入力の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(false);
  });

  it("bodyEnが未入力の場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(false);
  });

  it("translationsが未指定の場合は空配列として検証を通過する", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // `en`は必須のため常に1件（titleEn/bodyEnから合成）存在する。
      expect(result.data.translations).toEqual([
        { locale: "en", title: "Test title (EN)", body: "Test body (EN)" },
      ]);
    }
  });

  it("追加言語（ja/en以外）を1件以上指定していれば検証を通過し、en行と合成される", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      translations: [{ locale: "th", title: "หัวข้อ", body: "เนื้อหา" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations).toEqual([
        { locale: "en", title: "Test title (EN)", body: "Test body (EN)" },
        { locale: "th", title: "หัวข้อ", body: "เนื้อหา" },
      ]);
    }
  });

  it("追加言語にjaを指定した場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      translations: [{ locale: "ja", title: "重複", body: "重複" }],
    });

    expect(result.success).toBe(false);
  });

  it("追加言語にenを指定した場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      translations: [{ locale: "en", title: "重複", body: "重複" }],
    });

    expect(result.success).toBe(false);
  });

  it("追加言語同士で言語コードが重複している場合はエラーになる", () => {
    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      translations: [
        { locale: "th", title: "1", body: "1" },
        { locale: "th", title: "2", body: "2" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("サーバーアクション側の再検証（titleEn/bodyEn省略、translationsにen行を含む）でも検証を通過する（冪等性）", () => {
    // フォーム送信後の値（titleEn/bodyEnが既にtranslationsへ合成済み）をもう一度
    // このスキーマでparseしても、同じ結果になることを検証する（多重防御としての再検証を想定）。
    const firstPass = announcementFormSchema.parse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      translations: [{ locale: "th", title: "หัวข้อ", body: "เนื้อหา" }],
    });

    const secondPass = announcementFormSchema.safeParse(firstPass);

    expect(secondPass.success).toBe(true);
    if (secondPass.success) {
      expect(secondPass.data.translations).toEqual(firstPass.translations);
      expect(secondPass.data.title).toBe(firstPass.title);
    }
  });

  it("追加言語が21件以上の場合はエラーになる", () => {
    const translations = Array.from({ length: 21 }, (_, i) => ({
      locale: `l${i}`,
      title: `title-${i}`,
      body: `body-${i}`,
    }));

    const result = announcementFormSchema.safeParse({
      title: "テストタイトル",
      body: "テスト本文",
      titleEn: "Test title (EN)",
      bodyEn: "Test body (EN)",
      category: "maintenance",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      translations,
    });

    expect(result.success).toBe(false);
  });
});
