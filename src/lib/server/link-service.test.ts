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

vi.mock("@/lib/server/link-category-service", () => ({
  assertLinkCategoryPair: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { assertLinkCategoryPair } from "@/lib/server/link-category-service";
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
    categoryId: string | null;
    subCategoryId: string | null;
    description: string | null;
    createdAt: Date;
  }> = {}
) {
  return {
    id: "link-1",
    title: "リンク",
    url: "https://example.com",
    categoryId: "category-1",
    subCategoryId: null,
    description: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(assertLinkCategoryPair).mockResolvedValue(undefined);
});

describe("listLinks", () => {
  it("Prisma経由で全件をcreatedAt降順で取得し、createdAtを含む形で返す", async () => {
    vi.mocked(prisma.link.findMany).mockResolvedValue([
      {
        id: "1",
        title: "リンク1",
        url: "https://example.com/1",
        categoryId: "category-1",
        subCategoryId: null,
        description: "説明1",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
      },
      {
        id: "2",
        title: "リンク2",
        url: "https://example.com/2",
        categoryId: null,
        subCategoryId: null,
        description: null,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      },
    ] as never);

    const result = await listLinks();

    expect(prisma.link.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([
      {
        id: "1",
        title: "リンク1",
        url: "https://example.com/1",
        categoryId: "category-1",
        subCategoryId: null,
        description: "説明1",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "2",
        title: "リンク2",
        url: "https://example.com/2",
        categoryId: null,
        subCategoryId: null,
        description: undefined,
        createdAt: "2026-07-01T00:00:00.000Z",
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
        categoryId: "category-1",
        subCategoryId: null,
        description: undefined,
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "2",
        title: "リンク",
        url: "https://example.com",
        categoryId: "category-1",
        subCategoryId: null,
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
  it("入力内容でリンクを作成する（大分類・中分類の親子整合を検証してから作成する）", async () => {
    vi.mocked(prisma.link.create).mockResolvedValue(
      baseLinkRecord({ id: "1", title: "新規リンク" }) as never
    );

    const result = await createLinkRecord({
      title: "新規リンク",
      url: "https://example.com",
      categoryId: "category-1",
      subCategoryId: null,
      description: "説明",
    });

    expect(assertLinkCategoryPair).toHaveBeenCalledWith("category-1", null);
    expect(prisma.link.create).toHaveBeenCalledWith({
      data: {
        title: "新規リンク",
        url: "https://example.com",
        categoryId: "category-1",
        subCategoryId: null,
        description: "説明",
      },
    });
    expect(result.id).toBe("1");
  });

  it("大分類・中分類の親子整合が不正なときは作成せず例外を送出する", async () => {
    vi.mocked(assertLinkCategoryPair).mockRejectedValue(new Error("invalid pair"));

    await expect(
      createLinkRecord({
        title: "新規リンク",
        url: "https://example.com",
        categoryId: "category-1",
        subCategoryId: "unrelated-sub",
      })
    ).rejects.toThrow("invalid pair");
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it("既存リンクを更新する（大分類・中分類の親子整合を検証してから更新する）", async () => {
    vi.mocked(prisma.link.update).mockResolvedValue(
      baseLinkRecord({ id: "1", title: "更新後" }) as never
    );

    const result = await updateLinkRecord("1", {
      title: "更新後",
      url: "https://example.com",
      categoryId: "category-1",
      subCategoryId: undefined,
      description: undefined,
    });

    expect(assertLinkCategoryPair).toHaveBeenCalledWith("category-1", null);
    expect(prisma.link.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        title: "更新後",
        url: "https://example.com",
        categoryId: "category-1",
        subCategoryId: null,
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
        categoryId: "category-1",
      })
    ).rejects.toThrow(LinkNotFoundError);
  });

  it("更新時のDB接続エラー等はLinkNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.link.update).mockRejectedValue(new Error("connection lost"));

    await expect(
      updateLinkRecord("1", {
        title: "t",
        url: "https://example.com",
        categoryId: "category-1",
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
