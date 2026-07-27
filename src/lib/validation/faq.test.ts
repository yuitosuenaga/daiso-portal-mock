import { describe, expect, it } from "vitest";

import { faqFormSchema } from "@/lib/validation/faq";

describe("faqFormSchema", () => {
  it("カテゴリ・質問・回答（ja/en）が入力されていれば検証を通過する", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "テスト質問",
      answer: "テスト回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(true);
  });

  it("カテゴリが未選択の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "",
      question: "テスト質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(false);
  });

  it("質問が空文字列の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(false);
  });

  it("質問が空白文字のみの場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "   ",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(false);
  });

  it("回答が空文字列の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(false);
  });

  it("回答が空白文字のみの場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "   ",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(false);
  });

  it("questionEnが未入力の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(false);
  });

  it("answerEnが未入力の場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "",
    });

    expect(result.success).toBe(false);
  });

  it("translationsが未指定の場合は空配列として扱われ、en行が合成される", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations).toEqual([
        { locale: "en", question: "Test question (EN)", answer: "Test answer (EN)" },
      ]);
    }
  });

  it("追加言語（ja/en以外）を1件以上指定していれば検証を通過し、en行と合成される", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
      translations: [{ locale: "th", question: "คำถาม", answer: "คำตอบ" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations).toEqual([
        { locale: "en", question: "Test question (EN)", answer: "Test answer (EN)" },
        { locale: "th", question: "คำถาม", answer: "คำตอบ" },
      ]);
    }
  });

  it("追加言語にjaを指定した場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
      translations: [{ locale: "ja", question: "重複", answer: "重複" }],
    });

    expect(result.success).toBe(false);
  });

  it("追加言語にenを指定した場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
      translations: [{ locale: "en", question: "重複", answer: "重複" }],
    });

    expect(result.success).toBe(false);
  });

  it("追加言語同士で言語コードが重複している場合はエラーになる", () => {
    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
      translations: [
        { locale: "th", question: "1", answer: "1" },
        { locale: "th", question: "2", answer: "2" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("サーバーアクション側の再検証（questionEn/answerEn省略、translationsにen行を含む）でも検証を通過する（冪等性）", () => {
    const firstPass = faqFormSchema.parse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
      translations: [{ locale: "th", question: "คำถาม", answer: "คำตอบ" }],
    });

    const secondPass = faqFormSchema.safeParse(firstPass);

    expect(secondPass.success).toBe(true);
    if (secondPass.success) {
      expect(secondPass.data.translations).toEqual(firstPass.translations);
      expect(secondPass.data.question).toBe(firstPass.question);
    }
  });

  it("追加言語が21件以上の場合はエラーになる", () => {
    const translations = Array.from({ length: 21 }, (_, i) => ({
      locale: `l${i}`,
      question: `question-${i}`,
      answer: `answer-${i}`,
    }));

    const result = faqFormSchema.safeParse({
      category: "other",
      question: "質問",
      answer: "回答",
      questionEn: "Test question (EN)",
      answerEn: "Test answer (EN)",
      translations,
    });

    expect(result.success).toBe(false);
  });
});
