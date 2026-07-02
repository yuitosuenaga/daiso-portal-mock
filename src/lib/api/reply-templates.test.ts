import { describe, expect, it } from "vitest";

import {
  createReplyTemplate,
  getReplyTemplateById,
  getReplyTemplates,
  getReplyTemplatesByCategory,
  updateReplyTemplate,
} from "@/lib/api/reply-templates";
import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";

describe("getReplyTemplates / getReplyTemplatesByCategory", () => {
  it("カテゴリごとに最低1件の初期テンプレートを持つ", async () => {
    for (const category of INQUIRY_CATEGORY_CODES) {
      const result = await getReplyTemplatesByCategory(category);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((template) => template.category === category)).toBe(
        true
      );
    }
  });

  it("getReplyTemplatesは全カテゴリ分の合計件数を返す", async () => {
    const all = await getReplyTemplates();
    const byCategory = await Promise.all(
      INQUIRY_CATEGORY_CODES.map((category) =>
        getReplyTemplatesByCategory(category)
      )
    );
    const total = byCategory.reduce((sum, list) => sum + list.length, 0);

    expect(all).toHaveLength(total);
  });
});

describe("createReplyTemplate / updateReplyTemplate / getReplyTemplateById", () => {
  it("作成したテンプレートが該当カテゴリの一覧に反映される", async () => {
    const created = await createReplyTemplate({
      category: "other",
      body: "テスト用テンプレート本文",
    });

    expect(created.id).toBeTruthy();

    const byCategory = await getReplyTemplatesByCategory("other");
    expect(byCategory.some((template) => template.id === created.id)).toBe(
      true
    );
  });

  it("編集した内容がgetReplyTemplateByIdに反映される", async () => {
    const created = await createReplyTemplate({
      category: "system",
      body: "編集前の本文",
    });

    await updateReplyTemplate(created.id, {
      category: "system",
      body: "編集後の本文",
    });

    const result = await getReplyTemplateById(created.id);
    expect(result?.body).toBe("編集後の本文");
  });

  it("存在しないIDの取得はnullを返す", async () => {
    const result = await getReplyTemplateById("does-not-exist");
    expect(result).toBeNull();
  });
});
