import { describe, expect, it, vi } from "vitest";

import { toCreateInquiryInput } from "@/lib/inquiry-form-mapper";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

const FORM_VALUES: InquiryFormValues = {
  category: "defect",
  urgency: "high",
  storeRegion: "Tokyo",
  originalText: "問い合わせ内容のテストです。",
  originalLanguage: "ja",
  companyName: "Daiso",
  country: "JP",
};

describe("toCreateInquiryInput", () => {
  it("companyName・country を submittedBy にネストする", () => {
    const result = toCreateInquiryInput(FORM_VALUES);

    expect(result.submittedBy).toEqual({
      companyName: "Daiso",
      country: "JP",
    });
  });

  it("フラットな companyName・country フィールドを結果に含めない", () => {
    const result = toCreateInquiryInput(FORM_VALUES);

    expect(result).not.toHaveProperty("companyName");
    expect(result).not.toHaveProperty("country");
  });

  it("category・urgency・storeRegion・originalText・originalLanguage をそのまま引き継ぐ", () => {
    const result = toCreateInquiryInput(FORM_VALUES);

    expect(result.category).toBe(FORM_VALUES.category);
    expect(result.urgency).toBe(FORM_VALUES.urgency);
    expect(result.storeRegion).toBe(FORM_VALUES.storeRegion);
    expect(result.originalText).toBe(FORM_VALUES.originalText);
    expect(result.originalLanguage).toBe(FORM_VALUES.originalLanguage);
  });

  it("status に \"new\" を設定する", () => {
    const result = toCreateInquiryInput(FORM_VALUES);

    expect(result.status).toBe("new");
  });

  it("createdAt に現在時刻の ISO 8601 文字列を設定する", () => {
    const fixedDate = new Date("2026-07-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);

    const result = toCreateInquiryInput(FORM_VALUES);

    expect(result.createdAt).toBe(fixedDate.toISOString());

    vi.useRealTimers();
  });
});
