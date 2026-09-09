import { describe, expect, it } from "vitest";

import { monthlyMaterialFormSchema } from "@/lib/validation/monthly-material";
import { DOCUMENT_MAX_FILE_SIZE_BYTES } from "@/lib/constants/document";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildValidUploadInput(overrides: Record<string, unknown> = {}) {
  return {
    category: "salesFloorMeeting",
    department: "seasonalEvent",
    year: 2026,
    month: 9,
    sourceType: "upload",
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
    category: "pop",
    department: "other",
    year: 2026,
    month: 9,
    sourceType: "google",
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
    targeting: { scope: "all" },
    ...overrides,
  };
}

describe("monthlyMaterialFormSchema", () => {
  it("アップロード方式・全体公開かつ必須項目が入力されていれば検証を通過する", () => {
    const result = monthlyMaterialFormSchema.safeParse(buildValidUploadInput());

    expect(result.success).toBe(true);
  });

  it("Google方式かつ有効な共有リンクであれば検証を通過する", () => {
    const result = monthlyMaterialFormSchema.safeParse(buildValidGoogleInput());

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を1件以上指定していれば検証を通過する", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({ targeting: { scope: "countries", countries: ["VN", "TH"] } })
    );

    expect(result.success).toBe(true);
  });

  it("特定の販社を1件以上指定していれば検証を通過する", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({
        targeting: { scope: "companies", companyCodes: ["vn-daiso-vietnam"] },
      })
    );

    expect(result.success).toBe(true);
  });

  it("特定の国・地域を選択したのに1件も指定されていない場合は検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({ targeting: { scope: "countries", countries: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("特定の販社を選択したのに1件も指定されていない場合は検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({ targeting: { scope: "companies", companyCodes: [] } })
    );

    expect(result.success).toBe(false);
  });

  it("PDF以外のファイル形式は検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({ fileType: "image/png" })
    );

    expect(result.success).toBe(false);
  });

  it("ファイルサイズが上限を超える場合は検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({ fileSize: DOCUMENT_MAX_FILE_SIZE_BYTES + 1 })
    );

    expect(result.success).toBe(false);
  });

  it("Googleドキュメント・スプレッドシート・スライド以外のURLパターンは検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidGoogleInput({ googleUrl: "https://example.com/not-google" })
    );

    expect(result.success).toBe(false);
  });

  it("月が範囲外（0や13）の場合は検証エラーになる", () => {
    expect(monthlyMaterialFormSchema.safeParse(buildValidUploadInput({ month: 0 })).success).toBe(
      false
    );
    expect(monthlyMaterialFormSchema.safeParse(buildValidUploadInput({ month: 13 })).success).toBe(
      false
    );
  });

  it("年が範囲外の場合は検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(buildValidUploadInput({ year: 1999 }));

    expect(result.success).toBe(false);
  });

  it("departmentが未定義の値の場合は検証エラーになる", () => {
    const result = monthlyMaterialFormSchema.safeParse(
      buildValidUploadInput({ department: "unknown-department" })
    );

    expect(result.success).toBe(false);
  });

  it("必須項目（ファイル）が欠落している場合は検証エラーになる", () => {
    const input = buildValidUploadInput();
    delete (input as Record<string, unknown>).fileName;
    const result = monthlyMaterialFormSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});
