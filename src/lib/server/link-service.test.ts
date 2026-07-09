import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    link: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { listLinks } from "@/lib/server/link-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listLinks", () => {
  it("Prisma経由で全件を取得し、Link型に整形する", async () => {
    vi.mocked(prisma.link.findMany).mockResolvedValue([
      {
        id: "1",
        title: "リンク1",
        url: "https://example.com/1",
        category: "internal",
        description: "説明1",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      },
      {
        id: "2",
        title: "リンク2",
        url: "https://example.com/2",
        category: "other",
        description: null,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
      },
    ] as never);

    const result = await listLinks();

    expect(prisma.link.findMany).toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: "1",
        title: "リンク1",
        url: "https://example.com/1",
        category: "internal",
        description: "説明1",
      },
      {
        id: "2",
        title: "リンク2",
        url: "https://example.com/2",
        category: "other",
        description: undefined,
      },
    ]);
  });

  it("0件のときは空配列を返す", async () => {
    vi.mocked(prisma.link.findMany).mockResolvedValue([]);

    const result = await listLinks();

    expect(result).toEqual([]);
  });
});
