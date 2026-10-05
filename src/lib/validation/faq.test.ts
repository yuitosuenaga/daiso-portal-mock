import { describe, expect, it } from "vitest";

import { faqFormSchema } from "@/lib/validation/faq";

const valid = { category: "other", question: "テスト質問", answer: "テスト回答" };

describe("faqFormSchema", () => {
  it("カテゴリ・質問・回答（日本語のみ）が入力されていれば検証を通過する", () => {
    expect(faqFormSchema.safeParse(valid).success).toBe(true);
  });

  it("英語など他言語の入力は不要で、含まれていても出力には残らない", () => {
    const result = faqFormSchema.safeParse({ ...valid, questionEn: "x", answerEn: "y" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(valid);
    }
  });

  it("カテゴリが未選択の場合はエラーになる", () => {
    expect(faqFormSchema.safeParse({ ...valid, category: "" }).success).toBe(false);
  });

  it.each([
    ["質問が空文字列", { question: "" }],
    ["質問が空白のみ", { question: "   " }],
    ["回答が空文字列", { answer: "" }],
    ["回答が空白のみ", { answer: "   " }],
  ])("%sの場合はエラーになる", (_name, override) => {
    expect(faqFormSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
