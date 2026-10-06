import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/faqs", () => ({
  createFaq: vi.fn(),
  updateFaq: vi.fn(),
  deleteFaq: vi.fn(),
  getFaqByIdForHelpdesk: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn(),
}));
vi.mock("@/lib/server/auto-translation", () => ({
  autoTranslateFields: vi.fn(),
}));
vi.mock("@/lib/server/faq-service", () => ({
  FaqNotFoundError: class FaqNotFoundError extends Error {},
  findFaqById: vi.fn(),
  upsertFaqTranslations: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createFaq,
  deleteFaq,
  getFaqByIdForHelpdesk,
  updateFaq,
} from "@/lib/api/faqs";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { findFaqById, upsertFaqTranslations } from "@/lib/server/faq-service";
import {
  createFaqAction,
  deleteFaqAction,
  retranslateFaqAction,
  updateFaqAction,
} from "@/lib/actions/faqs";
import type { Faq } from "@/types/faq";

const input = {
  category: "inquiry_method" as const,
  question: "問い合わせはどこから行えますか？",
  answer: "ダッシュボードの「問い合わせ・申請」から行えます。",
};

function faq(overrides: Partial<Faq> = {}): Faq {
  return {
    id: "faq-1",
    category: "inquiry_method",
    question: input.question,
    answer: input.answer,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    translations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createFaqAction", () => {
  it("jaの質問・回答を自動翻訳し、翻訳付きで作成してルートを再検証する", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { en: { question: "Q", answer: "A" }, th: { question: "คำถาม", answer: "คำตอบ" } },
      failedLocales: [],
    });
    vi.mocked(createFaq).mockResolvedValue(faq());

    const result = await createFaqAction(input);

    expect(autoTranslateFields).toHaveBeenCalledWith({
      question: input.question,
      answer: input.answer,
    });
    expect(createFaq).toHaveBeenCalledWith({
      ...input,
      translations: [
        { locale: "en", question: "Q", answer: "A" },
        { locale: "th", question: "คำถาม", answer: "คำตอบ" },
      ],
    });
    expect(result).toEqual({ faq: faq(), failedLocales: [] });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("翻訳が全て失敗してもjaのみで保存を継続し、failedLocalesを返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ["en", "pt"],
    });
    vi.mocked(createFaq).mockResolvedValue(faq());

    const result = await createFaqAction(input);

    expect(createFaq).toHaveBeenCalledWith({ ...input, translations: [] });
    expect(result.failedLocales).toEqual(["en", "pt"]);
  });

  it.each([
    ["質問が空", { question: "" }],
    ["回答が空", { answer: "" }],
    ["不正なカテゴリ", { category: "invalid" }],
  ])("%sの不正な入力は例外になり、翻訳も保存もされない", async (_name, override) => {
    await expect(
      createFaqAction({ ...input, ...override } as never)
    ).rejects.toThrow();

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(createFaq).not.toHaveBeenCalled();
  });
});

describe("updateFaqAction", () => {
  const existingTranslations = [{ locale: "en", question: "Q", answer: "A" }];

  it("jaの原文が変わった場合は再翻訳した結果で置き換える", async () => {
    vi.mocked(getFaqByIdForHelpdesk).mockResolvedValue(
      faq({ translations: existingTranslations })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { en: { question: "Q2", answer: "A2" } },
      failedLocales: ["pt"],
    });
    vi.mocked(updateFaq).mockResolvedValue(faq({ answer: "更新後の回答" }));

    const result = await updateFaqAction("faq-1", { ...input, answer: "更新後の回答" });

    expect(autoTranslateFields).toHaveBeenCalled();
    expect(updateFaq).toHaveBeenCalledWith("faq-1", {
      ...input,
      answer: "更新後の回答",
      translations: [{ locale: "en", question: "Q2", answer: "A2" }],
    });
    expect(result.failedLocales).toEqual(["pt"]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("jaの原文が変わらない場合は再翻訳せず既存の翻訳を維持する", async () => {
    vi.mocked(getFaqByIdForHelpdesk).mockResolvedValue(
      faq({ translations: existingTranslations })
    );
    vi.mocked(updateFaq).mockResolvedValue(faq());

    const result = await updateFaqAction("faq-1", { ...input, category: "status" });

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateFaq).toHaveBeenCalledWith("faq-1", {
      ...input,
      category: "status",
      translations: existingTranslations,
    });
    expect(result.failedLocales).toEqual([]);
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(updateFaqAction("faq-1", { ...input, question: "" })).rejects.toThrow();

    expect(updateFaq).not.toHaveBeenCalled();
  });

  it("対象FAQが存在しない場合は例外になる", async () => {
    vi.mocked(getFaqByIdForHelpdesk).mockResolvedValue(null);

    await expect(updateFaqAction("missing", input)).rejects.toThrow();
    expect(updateFaq).not.toHaveBeenCalled();
  });
});

describe("retranslateFaqAction", () => {
  it("不足しているlocaleだけを翻訳してupsertし、結果のfailedLocalesを返す", async () => {
    vi.mocked(findFaqById).mockResolvedValue(
      faq({ translations: [{ locale: "en", question: "Q", answer: "A" }] })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { pt: { question: "P", answer: "Q" } },
      failedLocales: ["th"],
    });

    const result = await retranslateFaqAction("faq-1");

    expect(requireHelpdeskStaffSession).toHaveBeenCalled();
    const [, options] = vi.mocked(autoTranslateFields).mock.calls[0];
    expect(options?.locales).not.toContain("en");
    expect(options?.locales).toContain("pt");
    expect(upsertFaqTranslations).toHaveBeenCalledWith("faq-1", [
      { locale: "pt", question: "P", answer: "Q" },
    ]);
    expect(result).toEqual({ failedLocales: ["th"] });
  });

  it("全localeが揃っている場合は翻訳しない", async () => {
    const { TRANSLATED_LOCALES } = await import("@/lib/constants/locales");
    vi.mocked(findFaqById).mockResolvedValue(
      faq({
        translations: TRANSLATED_LOCALES.map((locale) => ({ locale, question: "q", answer: "a" })),
      })
    );

    const result = await retranslateFaqAction("faq-1");

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(result).toEqual({ failedLocales: [] });
  });

  it("翻訳が全て失敗した場合は保存せずfailedLocalesを返す", async () => {
    vi.mocked(findFaqById).mockResolvedValue(faq());
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ["en"],
    });

    const result = await retranslateFaqAction("faq-1");

    expect(upsertFaqTranslations).not.toHaveBeenCalled();
    expect(result).toEqual({ failedLocales: ["en"] });
  });

  it("FAQが存在しない場合は例外になる", async () => {
    vi.mocked(findFaqById).mockResolvedValue(null);

    await expect(retranslateFaqAction("missing")).rejects.toThrow();
  });
});

describe("deleteFaqAction", () => {
  it("既存FAQを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteFaq).mockResolvedValue(undefined);

    await deleteFaqAction("faq-1");

    expect(deleteFaq).toHaveBeenCalledWith("faq-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("認証（翻訳APIを呼ぶ前に拒否する）", () => {
  beforeEach(() => {
    vi.mocked(autoTranslateFields).mockClear();
    vi.mocked(requireHelpdeskStaffSession).mockRejectedValueOnce(new Error("unauthorized"));
  });

  it("作成は、未認証なら翻訳APIも保存も呼ばずに拒否する", async () => {
    await expect(createFaqAction({} as never)).rejects.toThrow("unauthorized");
    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(createFaq).not.toHaveBeenCalled();
  });

  it("更新は、未認証なら翻訳APIも保存も呼ばずに拒否する", async () => {
    await expect(updateFaqAction("faq-1", {} as never)).rejects.toThrow("unauthorized");
    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateFaq).not.toHaveBeenCalled();
  });
});
