import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/faq-service", () => ({ listFaqs: vi.fn() }));

import { listFaqs } from "@/lib/server/faq-service";
import { getFaqs } from "@/lib/api/faqs";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import type { Faq } from "@/types/faq";

const MOCK_FAQS: Faq[] = [
  { id: "1", category: "inquiry_method", question: "q1", answer: "a1" },
  { id: "2", category: "inquiry_method", question: "q2", answer: "a2" },
  { id: "3", category: "inquiry_method", question: "q3", answer: "a3" },
  { id: "4", category: "form_input", question: "q4", answer: "a4" },
  { id: "5", category: "form_input", question: "q5", answer: "a5" },
  { id: "6", category: "form_input", question: "q6", answer: "a6" },
  { id: "7", category: "status", question: "q7", answer: "a7" },
  { id: "8", category: "status", question: "q8", answer: "a8" },
  { id: "9", category: "status", question: "q9", answer: "a9" },
  { id: "10", category: "other", question: "q10", answer: "a10" },
  { id: "11", category: "other", question: "q11", answer: "a11" },
  { id: "12", category: "other", question: "q12", answer: "a12" },
];

describe("getFaqs", () => {
  it("listFaqsに委譲し、Faq配列を返す", async () => {
    vi.mocked(listFaqs).mockResolvedValue(MOCK_FAQS);

    const result = await getFaqs();

    expect(listFaqs).toHaveBeenCalled();
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
      vi.mocked(listFaqs).mockResolvedValue(MOCK_FAQS);

      const result = await getFaqs();

      const categoryFaqs = result.filter((faq) => faq.category === category);

      expect(categoryFaqs.length).toBeGreaterThanOrEqual(1);
    }
  );

  it("全件のidが重複しない", async () => {
    vi.mocked(listFaqs).mockResolvedValue(MOCK_FAQS);

    const result = await getFaqs();

    const ids = result.map((faq) => faq.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
