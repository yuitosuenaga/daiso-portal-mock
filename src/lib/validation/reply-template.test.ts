import { describe, expect, it } from "vitest";

import {
  TEMPLATE_NAME_MAX_LENGTH,
  replyTemplateFormSchema,
} from "@/lib/validation/reply-template";

describe("replyTemplateFormSchema", () => {
  it("カテゴリ・テンプレート名・本文が入力されていれば検証を通過する", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "defect",
      name: "テストテンプレート名",
      body: "テストテンプレート本文",
    });

    expect(result.success).toBe(true);
  });

  it("カテゴリが未選択の場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "",
      name: "テストテンプレート名",
      body: "本文",
    });

    expect(result.success).toBe(false);
  });

  it("テンプレート名が空文字列の場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      name: "",
      body: "本文",
    });

    expect(result.success).toBe(false);
  });

  it("テンプレート名が空白文字のみの場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      name: "   ",
      body: "本文",
    });

    expect(result.success).toBe(false);
  });

  it("テンプレート名が上限文字数を超える場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      name: "あ".repeat(TEMPLATE_NAME_MAX_LENGTH + 1),
      body: "本文",
    });

    expect(result.success).toBe(false);
  });

  it("本文が空文字列の場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      name: "テストテンプレート名",
      body: "",
    });

    expect(result.success).toBe(false);
  });

  it("本文が空白文字のみの場合はエラーになる", () => {
    const result = replyTemplateFormSchema.safeParse({
      category: "order",
      name: "テストテンプレート名",
      body: "   ",
    });

    expect(result.success).toBe(false);
  });
});
