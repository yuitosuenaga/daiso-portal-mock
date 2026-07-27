import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/faq-service", () => ({
  listFaqs: vi.fn(),
  listFaqsForHelpdesk: vi.fn(),
  findFaqById: vi.fn(),
  createFaqRecord: vi.fn(),
  updateFaqRecord: vi.fn(),
  deleteFaqRecord: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createFaqRecord,
  deleteFaqRecord,
  findFaqById,
  listFaqs,
  listFaqsForHelpdesk as listFaqsForHelpdeskService,
  updateFaqRecord,
} from "@/lib/server/faq-service";
import {
  createFaq,
  deleteFaq,
  getFaqByIdForHelpdesk,
  getFaqs,
  getFaqsForHelpdesk,
  updateFaq,
} from "@/lib/api/faqs";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import type { Faq } from "@/types/faq";

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中 太郎",
  },
};

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "test-co",
    country: "VN",
  },
};

function faq(overrides: Partial<Faq> = {}): Faq {
  return {
    id: "faq-1",
    category: "other",
    question: "テスト質問",
    answer: "テスト回答",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    translations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

const TIMESTAMP = {
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const MOCK_FAQS: Faq[] = [
  { id: "1", category: "inquiry_method", question: "q1", answer: "a1", translations: [], ...TIMESTAMP },
  { id: "2", category: "inquiry_method", question: "q2", answer: "a2", translations: [], ...TIMESTAMP },
  { id: "3", category: "inquiry_method", question: "q3", answer: "a3", translations: [], ...TIMESTAMP },
  { id: "4", category: "form_input", question: "q4", answer: "a4", translations: [], ...TIMESTAMP },
  { id: "5", category: "form_input", question: "q5", answer: "a5", translations: [], ...TIMESTAMP },
  { id: "6", category: "form_input", question: "q6", answer: "a6", translations: [], ...TIMESTAMP },
  { id: "7", category: "status", question: "q7", answer: "a7", translations: [], ...TIMESTAMP },
  { id: "8", category: "status", question: "q8", answer: "a8", translations: [], ...TIMESTAMP },
  { id: "9", category: "status", question: "q9", answer: "a9", translations: [], ...TIMESTAMP },
  { id: "10", category: "other", question: "q10", answer: "a10", translations: [], ...TIMESTAMP },
  { id: "11", category: "other", question: "q11", answer: "a11", translations: [], ...TIMESTAMP },
  { id: "12", category: "other", question: "q12", answer: "a12", translations: [], ...TIMESTAMP },
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

  it("options.localeをlistFaqsへ転送する（要件12.5）", async () => {
    vi.mocked(listFaqs).mockResolvedValue(MOCK_FAQS);

    await getFaqs({ locale: "en" });

    expect(listFaqs).toHaveBeenCalledWith("en");
  });
});

describe("getFaqsForHelpdesk", () => {
  it("ヘルプデスクセッションでlistFaqsForHelpdeskに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listFaqsForHelpdeskService).mockResolvedValue([
      { ...faq(), createdAt: "2026-07-01T00:00:00.000Z" },
    ]);

    const result = await getFaqsForHelpdesk();

    expect(listFaqsForHelpdeskService).toHaveBeenCalled();
    expect(result[0].id).toBe("faq-1");
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getFaqsForHelpdesk()).rejects.toThrow();
  });
});

describe("getFaqByIdForHelpdesk", () => {
  it("ヘルプデスクセッションでfindFaqByIdに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findFaqById).mockResolvedValue(faq());

    const result = await getFaqByIdForHelpdesk("faq-1");

    expect(findFaqById).toHaveBeenCalledWith("faq-1");
    expect(result?.id).toBe("faq-1");
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findFaqById).mockResolvedValue(null);

    const result = await getFaqByIdForHelpdesk("missing");

    expect(result).toBeNull();
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getFaqByIdForHelpdesk("faq-1")).rejects.toThrow();
  });
});

describe("createFaq / updateFaq / deleteFaq", () => {
  it("ヘルプデスクセッションでcreateFaqRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createFaqRecord).mockResolvedValue(faq());

    const result = await createFaq({
      category: "other",
      question: "新しい質問",
      answer: "新しい回答",
      translations: [],
    });

    expect(createFaqRecord).toHaveBeenCalled();
    expect(result.id).toBe("faq-1");
  });

  it("申請者セッションでのcreateFaqは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      createFaq({ category: "other", question: "q", answer: "a", translations: [] })
    ).rejects.toThrow();
  });

  it("ヘルプデスクセッションでupdateFaqRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateFaqRecord).mockResolvedValue(faq({ question: "更新後の質問" }));

    const result = await updateFaq("faq-1", {
      category: "other",
      question: "更新後の質問",
      answer: "更新後の回答",
      translations: [],
    });

    expect(updateFaqRecord).toHaveBeenCalledWith("faq-1", {
      category: "other",
      question: "更新後の質問",
      answer: "更新後の回答",
      translations: [],
    });
    expect(result.question).toBe("更新後の質問");
  });

  it("ヘルプデスクセッションでdeleteFaqRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(deleteFaqRecord).mockResolvedValue(undefined);

    await deleteFaq("faq-1");

    expect(deleteFaqRecord).toHaveBeenCalledWith("faq-1");
  });

  it("申請者セッションでのdeleteFaqは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(deleteFaq("faq-1")).rejects.toThrow();
    expect(deleteFaqRecord).not.toHaveBeenCalled();
  });
});
