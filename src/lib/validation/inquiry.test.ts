import { describe, expect, it } from "vitest";

import {
  inquiryFormSchema,
  ORIGINAL_TEXT_MAX_LENGTH,
  type InquiryFormValues,
} from "@/lib/validation/inquiry";

/** バリデーション対象の有効な入力値（各テストのベースとして複製して使用する）。 */
const VALID_INPUT: InquiryFormValues = {
  category: "defect",
  urgency: "high",
  storeRegion: "Tokyo",
  originalText: "問い合わせ内容のテストです。",
  originalLanguage: "ja",
  companyName: "Daiso",
  country: "JP",
};

describe("inquiryFormSchema", () => {
  it("有効な入力ではバリデーションが成功する", () => {
    const result = inquiryFormSchema.safeParse(VALID_INPUT);

    expect(result.success).toBe(true);
  });

  it("category が未入力の場合はエラーになる", () => {
    const rest: Partial<InquiryFormValues> = { ...VALID_INPUT };
    delete rest.category;
    const result = inquiryFormSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("category が選択肢以外の値の場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      category: "invalid-category",
    });

    expect(result.success).toBe(false);
  });

  it("urgency が未入力の場合はエラーになる", () => {
    const rest: Partial<InquiryFormValues> = { ...VALID_INPUT };
    delete rest.urgency;
    const result = inquiryFormSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("storeRegion が空文字の場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      storeRegion: "",
    });

    expect(result.success).toBe(false);
  });

  it("storeRegion が空白のみの場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      storeRegion: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("originalText が空文字の場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      originalText: "",
    });

    expect(result.success).toBe(false);
  });

  it("originalText が最大文字数を超える場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      originalText: "a".repeat(ORIGINAL_TEXT_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it("originalText が最大文字数と等しい場合は成功する", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      originalText: "a".repeat(ORIGINAL_TEXT_MAX_LENGTH),
    });

    expect(result.success).toBe(true);
  });

  it("originalLanguage が未入力の場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      originalLanguage: "",
    });

    expect(result.success).toBe(false);
  });

  it("companyName が空文字の場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      companyName: "",
    });

    expect(result.success).toBe(false);
  });

  it("country が未入力の場合はエラーになる", () => {
    const result = inquiryFormSchema.safeParse({
      ...VALID_INPUT,
      country: "",
    });

    expect(result.success).toBe(false);
  });
});
