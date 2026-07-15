import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/faqs", () => ({
  createFaq: vi.fn(),
  updateFaq: vi.fn(),
  deleteFaq: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createFaq, deleteFaq, updateFaq } from "@/lib/api/faqs";
import {
  createFaqAction,
  deleteFaqAction,
  updateFaqAction,
} from "@/lib/actions/faqs";
import type { CreateFaqInput, Faq } from "@/types/faq";

function buildInput(overrides: Partial<CreateFaqInput> = {}): CreateFaqInput {
  return {
    category: "inquiry_method",
    question: "問い合わせはどこから行えますか？",
    answer: "ダッシュボードの「問い合わせ・申請」から行えます。",
    ...overrides,
  };
}

function faq(overrides: Partial<Faq> = {}): Faq {
  return {
    id: "faq-1",
    category: "inquiry_method",
    question: "質問",
    answer: "回答",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createFaqAction", () => {
  it("有効な入力でFAQを作成し、ルートを再検証する", async () => {
    vi.mocked(createFaq).mockResolvedValue(faq());

    const result = await createFaqAction(buildInput());

    expect(createFaq).toHaveBeenCalled();
    expect(result.id).toBe("faq-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("質問が空の不正な入力は例外になり、保存されない", async () => {
    await expect(createFaqAction(buildInput({ question: "" }))).rejects.toThrow();

    expect(createFaq).not.toHaveBeenCalled();
  });

  it("回答が空の不正な入力は例外になり、保存されない", async () => {
    await expect(createFaqAction(buildInput({ answer: "" }))).rejects.toThrow();

    expect(createFaq).not.toHaveBeenCalled();
  });

  it("不正なカテゴリの入力は例外になり、保存されない", async () => {
    const invalidInput = {
      ...buildInput(),
      category: "invalid",
    } as unknown as CreateFaqInput;

    await expect(createFaqAction(invalidInput)).rejects.toThrow();

    expect(createFaq).not.toHaveBeenCalled();
  });
});

describe("updateFaqAction / deleteFaqAction", () => {
  it("既存FAQを更新し、ルートを再検証する", async () => {
    vi.mocked(updateFaq).mockResolvedValue(faq({ answer: "更新後の回答" }));

    const result = await updateFaqAction("faq-1", buildInput({ answer: "更新後の回答" }));

    expect(updateFaq).toHaveBeenCalledWith(
      "faq-1",
      expect.objectContaining({ answer: "更新後の回答" })
    );
    expect(result.answer).toBe("更新後の回答");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(
      updateFaqAction("faq-1", buildInput({ question: "" }))
    ).rejects.toThrow();

    expect(updateFaq).not.toHaveBeenCalled();
  });

  it("既存FAQを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteFaq).mockResolvedValue(undefined);

    await deleteFaqAction("faq-1");

    expect(deleteFaq).toHaveBeenCalledWith("faq-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});
