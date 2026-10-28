import { describe, expect, it } from "vitest";

import { toCreateInquiryInput } from "@/lib/inquiry-form-mapper";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

const FORM_VALUES: InquiryFormValues = {
  title: "商品破損についての問い合わせ",
  category: "defect",
  urgency: "high",
  storeRegion: "Tokyo",
  originalText: "問い合わせ内容のテストです。",
  originalLanguage: "ja",
};

describe("toCreateInquiryInput", () => {
  it("category・urgency・storeRegion・originalText・originalLanguage をそのまま引き継ぐ", () => {
    const result = toCreateInquiryInput(FORM_VALUES);

    expect(result.title).toBe(FORM_VALUES.title);
    expect(result.category).toBe(FORM_VALUES.category);
    expect(result.urgency).toBe(FORM_VALUES.urgency);
    expect(result.storeRegion).toBe(FORM_VALUES.storeRegion);
    expect(result.originalText).toBe(FORM_VALUES.originalText);
    expect(result.originalLanguage).toBe(FORM_VALUES.originalLanguage);
  });

  it("status・createdAt・submittedBy・mode・targetCompanyId を結果に含めない", () => {
    const result = toCreateInquiryInput({
      ...FORM_VALUES,
      mode: "helpdeskProxy",
      targetCompanyId: "company-1",
    });

    for (const key of ["status", "createdAt", "submittedBy", "mode", "targetCompanyId"]) {
      expect(result).not.toHaveProperty(key);
    }
  });
});
