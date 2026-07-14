import { describe, expect, it } from "vitest";

import { faqFormSchema } from "@/lib/validation/faq";

describe("faqFormSchema", () => {
  it("カテゴリ・質問・回答が入力されていれば検証を通過する", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "テスト質問",
      answer: "テスト回答",
    });

    expect(result.success).toBe(true);
  });

  it("カテゴリが未選択の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "",
      question: "テスト質問",
      answer: "回答",
    });

    expect(result.success).toBe(false);
  });

  it("質問が空文字列の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "",
      answer: "回答",
    });

    expect(result.success).toBe(false);
  });

  it("質問が空白文字のみの場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "   ",
      answer: "回答",
    });

    expect(result.success).toBe(false);
  });

  it("回答が空文字列の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "",
    });

    expect(result.success).toBe(false);
  });

  it("回答が空白文字のみの場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "   ",
    });

    expect(result.success).toBe(false);
  });
});
