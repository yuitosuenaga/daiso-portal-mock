import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/link-service", () => ({
  listLinks: vi.fn(),
  listLinksForHelpdesk: vi.fn(),
  findLinkById: vi.fn(),
  createLinkRecord: vi.fn(),
  updateLinkRecord: vi.fn(),
  deleteLinkRecord: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createLinkRecord,
  deleteLinkRecord,
  findLinkById,
  listLinks,
  listLinksForHelpdesk as listLinksForHelpdeskService,
  updateLinkRecord,
} from "@/lib/server/link-service";
import {
  createLink,
  deleteLink,
  getLinkByIdForHelpdesk,
  getLinks,
  getLinksForHelpdesk,
  updateLink,
} from "@/lib/api/links";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";
import type { Link, LinkWithTimestamp } from "@/types/link";

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

function link(overrides: Partial<Link> = {}): Link {
  return {
    id: "link-1",
    title: "テストリンク",
    url: "https://example.com",
    category: "other",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

const MOCK_LINKS: LinkWithTimestamp[] = [
  { id: "1", title: "t1", url: "https://example.com/1", category: "internal", createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "2", title: "t2", url: "https://example.com/2", category: "internal", createdAt: "2026-07-02T00:00:00.000Z" },
  { id: "3", title: "t3", url: "https://example.com/3", category: "external", createdAt: "2026-07-03T00:00:00.000Z" },
  { id: "4", title: "t4", url: "https://example.com/4", category: "external", createdAt: "2026-07-04T00:00:00.000Z" },
  { id: "5", title: "t5", url: "https://example.com/5", category: "document", createdAt: "2026-07-05T00:00:00.000Z" },
  { id: "6", title: "t6", url: "https://example.com/6", category: "document", createdAt: "2026-07-06T00:00:00.000Z" },
  { id: "7", title: "t7", url: "https://example.com/7", category: "other", createdAt: "2026-07-07T00:00:00.000Z" },
  { id: "8", title: "t8", url: "https://example.com/8", category: "other", createdAt: "2026-07-08T00:00:00.000Z" },
];

describe("getLinks", () => {
  it("listLinksに委譲し、createdAtを含むLink配列を返す", async () => {
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
      expect(typeof link.createdAt).toBe("string");
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

describe("getLinksForHelpdesk", () => {
  it("ヘルプデスクセッションでlistLinksForHelpdeskに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listLinksForHelpdeskService).mockResolvedValue([
      { ...link(), createdAt: "2026-07-01T00:00:00.000Z" },
    ]);

    const result = await getLinksForHelpdesk();

    expect(listLinksForHelpdeskService).toHaveBeenCalled();
    expect(result[0].id).toBe("link-1");
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getLinksForHelpdesk()).rejects.toThrow();
  });
});

describe("getLinkByIdForHelpdesk", () => {
  it("ヘルプデスクセッションでfindLinkByIdに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findLinkById).mockResolvedValue(link());

    const result = await getLinkByIdForHelpdesk("link-1");

    expect(findLinkById).toHaveBeenCalledWith("link-1");
    expect(result?.id).toBe("link-1");
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findLinkById).mockResolvedValue(null);

    const result = await getLinkByIdForHelpdesk("missing");

    expect(result).toBeNull();
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getLinkByIdForHelpdesk("link-1")).rejects.toThrow();
  });
});

describe("createLink / updateLink / deleteLink", () => {
  it("ヘルプデスクセッションでcreateLinkRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createLinkRecord).mockResolvedValue(link());

    const result = await createLink({
      title: "新しいリンク",
      url: "https://example.com",
      category: "other",
    });

    expect(createLinkRecord).toHaveBeenCalled();
    expect(result.id).toBe("link-1");
  });

  it("申請者セッションでのcreateLinkは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      createLink({ title: "t", url: "https://example.com", category: "other" })
    ).rejects.toThrow();
  });

  it("ヘルプデスクセッションでupdateLinkRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateLinkRecord).mockResolvedValue(link({ title: "更新後" }));

    const result = await updateLink("link-1", {
      title: "更新後",
      url: "https://example.com",
      category: "other",
    });

    expect(updateLinkRecord).toHaveBeenCalledWith("link-1", {
      title: "更新後",
      url: "https://example.com",
      category: "other",
    });
    expect(result.title).toBe("更新後");
  });

  it("ヘルプデスクセッションでdeleteLinkRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(deleteLinkRecord).mockResolvedValue(undefined);

    await deleteLink("link-1");

    expect(deleteLinkRecord).toHaveBeenCalledWith("link-1");
  });

  it("申請者セッションでのdeleteLinkは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(deleteLink("link-1")).rejects.toThrow();
    expect(deleteLinkRecord).not.toHaveBeenCalled();
  });
});
