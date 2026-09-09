import { describe, expect, it } from "vitest";

import { manualFormSchema } from "@/lib/validation/manual";
import { DOCUMENT_MAX_FILE_SIZE_BYTES } from "@/lib/constants/document";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildValidUploadInput(overrides: Record<string, unknown> = {}) {
  return {
    sourceType: "upload",
    title: "テストタイトル",
    titleEn: "Test title",
    category: "storeOperations",
    year: 2026,
    month: 9,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    ...overrides,
  };
}

function buildValidGoogleInput(overrides: Record<string, unknown> = {}) {
  return {
    sourceType: "google",
    title: "テストタイトル",
    titleEn: "Test title",
    category: "accounting",
    year: 2026,
    month: 9,
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("manualFormSchema", () => {
  it("アップロード方式・全体公開かつ必須項目が入力されていれば検証を通過する", () => {
    const result = manualFormSchema.safeParse(buildValidUploadInput());

    expect(result.success).toBe(true);
  });

  it("Google方式かつ有効な共有リンクであれば検証を通過する", () => {
    const result = manualFormSchema.safeParse(buildValidGoogleInput());

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ targeting: { scope: "countries", countries: ["VN", "TH"] } })
    );

    expect(result.success).toBe(true);
  });

  it("特定の販社を1件以上指定していれば検証を通過する", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({
        targeting: { scope: "companies", companyCodes: ["vn-daiso-vietnam"] },
      })
    );

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を選択したのに0件の場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ targeting: { scope: "countries", countries: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("特定の販社を選択したのに0件の場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ targeting: { scope: "companies", companyCodes: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("タイトルが空文字列の場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(buildValidUploadInput({ title: "" }));

    expect(result.success).toBe(false);
  });

  it("不正なカテゴリの場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ category: "not-a-category" })
    );

    expect(result.success).toBe(false);
  });

  it("月が範囲外（0や13）の場合はエラーになる", () => {
    expect(manualFormSchema.safeParse(buildValidUploadInput({ month: 0 })).success).toBe(
      false
    );
    expect(manualFormSchema.safeParse(buildValidUploadInput({ month: 13 })).success).toBe(
      false
    );
  });

  it("年が範囲外の場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(buildValidUploadInput({ year: 1999 }));

    expect(result.success).toBe(false);
  });

  it("PDF以外のファイル形式の場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ fileType: "image/png" })
    );

    expect(result.success).toBe(false);
  });

  it("ファイルサイズが上限を超える場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ fileSize: DOCUMENT_MAX_FILE_SIZE_BYTES + 1 })
    );

    expect(result.success).toBe(false);
  });

  it("dataUrlがPDFのデータURL形式でない場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(
      buildValidUploadInput({ dataUrl: "data:image/png;base64,abc" })
    );

    expect(result.success).toBe(false);
  });

  it("fileNameが空文字列の場合はエラーになる", () => {
    const result = manualFormSchema.safeParse(buildValidUploadInput({ fileName: "" }));

    expect(result.success).toBe(false);
  });

  describe("sourceType: google", () => {
    it("Googleドキュメント・スプレッドシート・スライド以外のURLパターンはエラーになる", () => {
      const result = manualFormSchema.safeParse(
        buildValidGoogleInput({ googleUrl: "https://example.com/not-google" })
      );

      expect(result.success).toBe(false);
    });

    it("googleUrlが空文字列の場合はエラーになる", () => {
      const result = manualFormSchema.safeParse(
        buildValidGoogleInput({ googleUrl: "" })
      );

      expect(result.success).toBe(false);
    });

    it("sourceType: googleではfileName等のアップロード方式のフィールドを要求しない", () => {
      const result = manualFormSchema.safeParse(buildValidGoogleInput());

      expect(result.success).toBe(true);
      if (result.success) {
        expect("fileName" in result.data).toBe(false);
      }
    });
  });

  describe("多言語対応（タイトル・説明、ja/en固定）", () => {
    it("titleEnが未入力の場合はエラーになる（アップロード方式）", () => {
      const input = buildValidUploadInput();
      delete (input as Record<string, unknown>).titleEn;

      const result = manualFormSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("titleEnが未入力の場合はエラーになる（Google方式）", () => {
      const input = buildValidGoogleInput();
      delete (input as Record<string, unknown>).titleEn;

      const result = manualFormSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("titleEnが入力されていれば検証を通過し、transformでtranslationsのen行へ合成される", () => {
      const result = manualFormSchema.safeParse(
        buildValidUploadInput({ titleEn: "English Title", descriptionEn: "English description" })
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.translations).toEqual([
          { locale: "en", title: "English Title", description: "English description" },
        ]);
        expect("titleEn" in result.data).toBe(false);
        expect("descriptionEn" in result.data).toBe(false);
      }
    });

    it("titleEnが未指定でもtranslationsにen行が含まれていれば検証を通過する（二重パース時の冪等性）", () => {
      const result = manualFormSchema.safeParse(
        buildValidUploadInput({
          titleEn: undefined,
          translations: [{ locale: "en", title: "既存の英語タイトル" }],
        })
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.translations).toEqual([
          { locale: "en", title: "既存の英語タイトル", description: undefined },
        ]);
      }
    });

    it("descriptionは全言語で任意である", () => {
      const result = manualFormSchema.safeParse(
        buildValidUploadInput({ titleEn: "English Title" })
      );

      expect(result.success).toBe(true);
    });
  });
});
