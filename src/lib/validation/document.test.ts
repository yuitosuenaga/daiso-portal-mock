import { describe, expect, it } from "vitest";

import { documentFormSchema } from "@/lib/validation/document";
import { DOCUMENT_MAX_FILE_SIZE_BYTES } from "@/lib/constants/document";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildValidInput(overrides: Record<string, unknown> = {}) {
  return {
    sourceType: "upload",
    title: "テストタイトル",
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
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("documentFormSchema", () => {
  it("全体公開かつ必須項目が入力されていれば検証を通過する", () => {
    const result = documentFormSchema.safeParse(buildValidInput());

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({ targeting: { scope: "countries", countries: ["VN", "TH"] } })
    );

    expect(result.success).toBe(true);
  });

  it("特定の販社を1件以上指定していれば検証を通過する", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({
        targeting: { scope: "companies", companyCodes: ["vn-daiso-vietnam"] },
      })
    );

    expect(result.success).toBe(true);
  });

  it("タイトルが空文字列の場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(buildValidInput({ title: "" }));

    expect(result.success).toBe(false);
  });

  it("特定の国・地域を指定したのに0件の場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({ targeting: { scope: "countries", countries: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("特定の販社を指定したのに0件の場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({ targeting: { scope: "companies", companyCodes: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("PDF以外のファイル形式の場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({ fileType: "image/png" })
    );

    expect(result.success).toBe(false);
  });

  it("ファイルサイズが上限を超える場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({ fileSize: DOCUMENT_MAX_FILE_SIZE_BYTES + 1 })
    );

    expect(result.success).toBe(false);
  });

  it("dataUrlがPDFのデータURL形式でない場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(
      buildValidInput({ dataUrl: "data:image/png;base64,abc" })
    );

    expect(result.success).toBe(false);
  });

  it("fileNameが空文字列の場合はエラーになる", () => {
    const result = documentFormSchema.safeParse(buildValidInput({ fileName: "" }));

    expect(result.success).toBe(false);
  });

  describe("sourceType: google", () => {
    it("有効なGoogleドキュメントの共有リンクであれば検証を通過する", () => {
      const result = documentFormSchema.safeParse(buildValidGoogleInput());

      expect(result.success).toBe(true);
    });

    it("有効なGoogleスプレッドシートの共有リンクであれば検証を通過する", () => {
      const result = documentFormSchema.safeParse(
        buildValidGoogleInput({
          googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
          googleEmbedUrl: "https://docs.google.com/spreadsheets/d/xyz789/preview",
        })
      );

      expect(result.success).toBe(true);
    });

    it("タイトルが空文字列の場合はエラーになる", () => {
      const result = documentFormSchema.safeParse(
        buildValidGoogleInput({ title: "" })
      );

      expect(result.success).toBe(false);
    });

    it("特定の国・地域を指定したのに0件の場合はエラーになる", () => {
      const result = documentFormSchema.safeParse(
        buildValidGoogleInput({ targeting: { scope: "countries", countries: [] } })
      );

      expect(result.success).toBe(false);
    });

    it("googleUrlがGoogleドキュメント/スプレッドシート/スライドの形式でない場合はエラーになる", () => {
      const result = documentFormSchema.safeParse(
        buildValidGoogleInput({ googleUrl: "https://example.com/not-google" })
      );

      expect(result.success).toBe(false);
    });

    it("googleUrlが空文字列の場合はエラーになる", () => {
      const result = documentFormSchema.safeParse(
        buildValidGoogleInput({ googleUrl: "" })
      );

      expect(result.success).toBe(false);
    });

    it("sourceType: googleではfileName等のアップロード方式のフィールドを要求しない", () => {
      const result = documentFormSchema.safeParse(buildValidGoogleInput());

      expect(result.success).toBe(true);
      if (result.success) {
        expect("fileName" in result.data).toBe(false);
      }
    });
  });
});
