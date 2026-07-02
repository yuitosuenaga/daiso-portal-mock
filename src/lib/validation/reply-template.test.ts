import { describe, expect, it } from "vitest";

import { replyTemplateFormSchema } from "@/lib/validation/reply-template";

describe("replyTemplateFormSchema", () => {
  it("カテゴリ・本文が入力されていれば検証を通過する", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "defect",
      body: "テストテンプレート本文",
    });

    expect(result.success).toBe(true);
  });

  it("カテゴリが未選択の場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "",
      body: "本文",
    });

    expect(result.success).toBe(false);
  });

  it("本文が空文字列の場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      body: "",
    });

    expect(result.success).toBe(false);
  });

  it("本文が空白文字のみの場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      body: "   ",
    });

    expect(result.success).toBe(false);
  });
});
