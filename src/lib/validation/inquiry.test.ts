import { describe, expect, it } from "vitest";

import {
  inquiryAttachmentSchema,
  inquiryAttachmentsArraySchema,
  inquiryFormSchema,
  ORIGINAL_TEXT_MAX_LENGTH,
  type InquiryFormValues,
} from "@/lib/validation/inquiry";
import {
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/attachment";

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

const VALID_ATTACHMENT = {
  id: "att-1",
  fileName: "photo.png",
  fileType: "image/png",
  fileSize: 100,
  dataUrl: "data:image/png;base64,AAAA",
};

describe("inquiryAttachmentSchema", () => {
  it("有効な添付ファイルはバリデーションが成功する", () => {
    expect(inquiryAttachmentSchema.safeParse(VALID_ATTACHMENT).success).toBe(
      true
    );
  });

  it("上限を超えるfileSizeはエラーになる", () => {
    const result = inquiryAttachmentSchema.safeParse({
      ...VALID_ATTACHMENT,
      fileSize: ATTACHMENT_MAX_FILE_SIZE_BYTES + 1,
    });

    expect(result.success).toBe(false);
  });

  it("許可されていないfileTypeはエラーになる", () => {
    const result = inquiryAttachmentSchema.safeParse({
      ...VALID_ATTACHMENT,
      fileType: "text/plain",
    });

    expect(result.success).toBe(false);
  });

  it("data:スキーム以外のdataUrlはエラーになる", () => {
    const result = inquiryAttachmentSchema.safeParse({
      ...VALID_ATTACHMENT,
      dataUrl: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
  });
});

describe("inquiryAttachmentsArraySchema", () => {
  it("上限件数以内であればバリデーションが成功する", () => {
    const attachments = Array.from({ length: ATTACHMENT_MAX_COUNT }, (_, i) => ({
      ...VALID_ATTACHMENT,
      id: `att-${i}`,
    }));

    expect(inquiryAttachmentsArraySchema.safeParse(attachments).success).toBe(
      true
    );
  });

  it("上限件数を超えるとエラーになる", () => {
    const attachments = Array.from(
      { length: ATTACHMENT_MAX_COUNT + 1 },
      (_, i) => ({ ...VALID_ATTACHMENT, id: `att-${i}` })
    );

    expect(inquiryAttachmentsArraySchema.safeParse(attachments).success).toBe(
      false
    );
  });
});
