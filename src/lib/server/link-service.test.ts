import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "test",
  });
}

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    link: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  createLinkRecord,
  deleteLinkRecord,
  findLinkById,
  LinkNotFoundError,
  listLinks,
  listLinksForHelpdesk,
  updateLinkRecord,
} from "@/lib/server/link-service";

function baseLinkRecord(
  overrides: Partial<{
    id: string;
    title: string;
    url: string;
    category: "internal" | "external" | "document" | "other";
    description: string | null;
    createdAt: Date;
  }> = {}
) {
  return {
    id: "link-1",
    title: "リンク",
    url: "https://example.com",
    category: "other" as const,
    description: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

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

describe("listLinksForHelpdesk", () => {
  it("createdAt降順で全件を取得し、createdAtを含む形で返す", async () => {
    vi.mocked(prisma.link.findMany).mockResolvedValue([
      baseLinkRecord({ id: "1", createdAt: new Date("2026-07-02T00:00:00.000Z") }),
      baseLinkRecord({ id: "2", createdAt: new Date("2026-07-01T00:00:00.000Z") }),
    ] as never);

    const result = await listLinksForHelpdesk();

    expect(prisma.link.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([
      {
        id: "1",
        title: "リンク",
        url: "https://example.com",
        category: "other",
        description: undefined,
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "2",
        title: "リンク",
        url: "https://example.com",
        category: "other",
        description: undefined,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("findLinkById", () => {
  it("存在するIDのときLinkを返す", async () => {
    vi.mocked(prisma.link.findUnique).mockResolvedValue(
      baseLinkRecord({ id: "1" }) as never
    );

    const result = await findLinkById("1");

    expect(result?.id).toBe("1");
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(prisma.link.findUnique).mockResolvedValue(null);

    const result = await findLinkById("missing");

    expect(result).toBeNull();
  });
});

describe("createLinkRecord / updateLinkRecord / deleteLinkRecord", () => {
  it("入力内容でリンクを作成する", async () => {
    vi.mocked(prisma.link.create).mockResolvedValue(
      baseLinkRecord({ id: "1", title: "新規リンク" }) as never
    );

    const result = await createLinkRecord({
      title: "新規リンク",
      url: "https://example.com",
      category: "other",
      description: "説明",
    });

    expect(prisma.link.create).toHaveBeenCalledWith({
      data: {
        title: "新規リンク",
        url: "https://example.com",
        category: "other",
        description: "説明",
      },
    });
    expect(result.id).toBe("1");
  });

  it("既存リンクを更新する", async () => {
    vi.mocked(prisma.link.update).mockResolvedValue(
      baseLinkRecord({ id: "1", title: "更新後" }) as never
    );

    const result = await updateLinkRecord("1", {
      title: "更新後",
      url: "https://example.com",
      category: "other",
      description: undefined,
    });

    expect(prisma.link.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        title: "更新後",
        url: "https://example.com",
        category: "other",
        description: undefined,
      },
    });
    expect(result.title).toBe("更新後");
  });

  it("存在しないIDの更新はLinkNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.link.update).mockRejectedValue(notFoundPrismaError());

    await expect(
      updateLinkRecord("missing", {
        title: "t",
        url: "https://example.com",
        category: "other",
      })
    ).rejects.toThrow(LinkNotFoundError);
  });

  it("更新時のDB接続エラー等はLinkNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.link.update).mockRejectedValue(new Error("connection lost"));

    await expect(
      updateLinkRecord("1", {
        title: "t",
        url: "https://example.com",
        category: "other",
      })
    ).rejects.toThrow("connection lost");
  });

  it("リンクを削除する", async () => {
    vi.mocked(prisma.link.delete).mockResolvedValue(baseLinkRecord() as never);

    await deleteLinkRecord("1");

    expect(prisma.link.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("存在しないIDの削除はLinkNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.link.delete).mockRejectedValue(notFoundPrismaError());

    await expect(deleteLinkRecord("missing")).rejects.toThrow(LinkNotFoundError);
  });

  it("削除時のDB接続エラー等はLinkNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.link.delete).mockRejectedValue(new Error("connection lost"));

    await expect(deleteLinkRecord("1")).rejects.toThrow("connection lost");
  });
});
