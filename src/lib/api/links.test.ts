import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/link-service", () => ({ listLinks: vi.fn() }));

import { listLinks } from "@/lib/server/link-service";
import { getLinks } from "@/lib/api/links";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";
import type { Link } from "@/types/link";

const MOCK_LINKS: Link[] = [
  { id: "1", title: "t1", url: "https://example.com/1", category: "internal" },
  { id: "2", title: "t2", url: "https://example.com/2", category: "internal" },
  { id: "3", title: "t3", url: "https://example.com/3", category: "external" },
  { id: "4", title: "t4", url: "https://example.com/4", category: "external" },
  { id: "5", title: "t5", url: "https://example.com/5", category: "document" },
  { id: "6", title: "t6", url: "https://example.com/6", category: "document" },
  { id: "7", title: "t7", url: "https://example.com/7", category: "other" },
  { id: "8", title: "t8", url: "https://example.com/8", category: "other" },
];

describe("getLinks", () => {
  it("listLinksに委譲し、Link配列を返す", async () => {
    vi.mocked(listLinks).mockResolvedValue(MOCK_LINKS);

    const result = await getLinks();

    expect(listLinks).toHaveBeenCalled();
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
      vi.mocked(listLinks).mockResolvedValue(MOCK_LINKS);

      const result = await getLinks();

      const categoryLinks = result.filter((link) => link.category === category);

      expect(categoryLinks.length).toBeGreaterThanOrEqual(1);
    }
  );
});
