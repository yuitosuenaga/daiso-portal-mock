import { describe, expect, it } from "vitest";

import { TEXT_LIMITS } from "@/lib/constants/text-limits";
import { documentCategoryFormSchema } from "@/lib/validation/document-category";
import { faqFormSchema } from "@/lib/validation/faq";
import { linkCategoryFormSchema } from "@/lib/validation/link-category";
import { replyTemplateFormSchema } from "@/lib/validation/reply-template";

const text = (length: number) => "あ".repeat(length);

describe("翻訳対象テキストの文字数上限", () => {
  it("FAQ: 回答は上限ちょうどなら通り、1文字超えると拒否される", () => {
    const base = { category: "other" as const, question: "質問" };

    expect(faqFormSchema.safeParse({ ...base, answer: text(TEXT_LIMITS.body) }).success).toBe(true);
    expect(faqFormSchema.safeParse({ ...base, answer: text(TEXT_LIMITS.body + 1) }).success).toBe(
      false
    );
  });

  it("FAQ: 質問の上限を超えると拒否される", () => {
    expect(
      faqFormSchema.safeParse({
        category: "other",
        question: text(TEXT_LIMITS.question + 1),
        answer: "回答",
      }).success
    ).toBe(false);
  });

  it("返信テンプレート: 本文の上限を超えると拒否される", () => {
    const base = { category: "other" as const, name: "名称" };

    expect(
      replyTemplateFormSchema.safeParse({ ...base, body: text(TEXT_LIMITS.body) }).success
    ).toBe(true);
    expect(
      replyTemplateFormSchema.safeParse({ ...base, body: text(TEXT_LIMITS.body + 1) }).success
    ).toBe(false);
  });

  it("リンクカテゴリ・資料カテゴリ: 名称の上限を超えると拒否される", () => {
    const over = text(TEXT_LIMITS.categoryName + 1);

    expect(linkCategoryFormSchema.safeParse({ parentId: null, name: over }).success).toBe(false);
    expect(documentCategoryFormSchema.safeParse({ parentId: null, name: over }).success).toBe(
      false
    );
    expect(
      linkCategoryFormSchema.safeParse({ parentId: null, name: text(TEXT_LIMITS.categoryName) })
        .success
    ).toBe(true);
  });
});
