import { describe, expect, it } from "vitest";

import { getFaqs } from "@/lib/api/faqs";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";

describe("getFaqs", () => {
  it("Faq配列を返し、各要素が必須フィールド（id・category・question・answer）を持つ", async () => {
    const result = await getFaqs();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(8);
    expect(result.length).toBeLessThanOrEqual(12);

    for (const faq of result) {
      expect(typeof faq.id).toBe("string");
      expect(faq.id.length).toBeGreaterThan(0);
      expect(typeof faq.question).toBe("string");
      expect(faq.question.length).toBeGreaterThan(0);
      expect(typeof faq.answer).toBe("string");
      expect(faq.answer.length).toBeGreaterThan(0);
      expect(FAQ_CATEGORY_CODES).toContain(faq.category);
    }
  });

  it.each(FAQ_CATEGORY_CODES)(
    "カテゴリ「%s」のFAQが少なくとも1件存在する",
    async (category) => {
      const result = await getFaqs();

      const categoryFaqs = result.filter((faq) => faq.category === category);

      expect(categoryFaqs.length).toBeGreaterThanOrEqual(1);
    }
  );

  it("全件のidが重複しない", async () => {
    const result = await getFaqs();

    const ids = result.map((faq) => faq.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
