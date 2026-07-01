import { describe, expect, it } from "vitest";

import { getLinks } from "@/lib/api/links";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";

describe("getLinks", () => {
  it("Link配列を返し、各要素が必須フィールド（id・title・url・category）を持つ", async () => {
    const result = await getLinks();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    for (const link of result) {
      expect(typeof link.id).toBe("string");
      expect(link.id.length).toBeGreaterThan(0);
      expect(typeof link.title).toBe("string");
      expect(link.title.length).toBeGreaterThan(0);
      expect(typeof link.url).toBe("string");
      expect(link.url.length).toBeGreaterThan(0);
      expect(LINK_CATEGORY_CODES).toContain(link.category);
    }
  });

  it.each(LINK_CATEGORY_CODES)(
    "カテゴリ「%s」のリンクが少なくとも1件存在する",
    async (category) => {
      const result = await getLinks();

      const categoryLinks = result.filter((link) => link.category === category);

      expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
    }
  );
});
