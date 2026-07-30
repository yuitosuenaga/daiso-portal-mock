import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    linkCategory: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    link: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  LinkCategoryDepthError,
  LinkCategoryInUseError,
  LinkCategoryNameConflictError,
  LinkCategoryNotFoundError,
  LinkCategoryPairError,
  assertLinkCategoryPair,
  createLinkCategoryRecord,
  deleteLinkCategoryRecord,
  getLinkCategoriesForApplicant,
  listLinkCategoriesForHelpdesk,
  moveLinkCategoryRecord,
  updateLinkCategoryRecord,
} from "@/lib/server/link-category-service";

function baseCategoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "category-1",
    parentId: null as string | null,
    name: "大分類",
    displayOrder: 0,
    createdAt: new Date("2026-07-29T00:00:00.000Z"),
    updatedAt: new Date("2026-07-29T00:00:00.000Z"),
    translations: [] as { locale: string; name: string }[],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createLinkCategoryRecord", () => {
  it("親を指定しない場合、同一階層（大分類同士）の末尾へdisplayOrderを採番する", async () => {
    vi.mocked(prisma.linkCategory.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.linkCategory.aggregate).mockResolvedValue({
      _max: { displayOrder: 2 },
    } as never);
    vi.mocked(prisma.linkCategory.create).mockResolvedValue(
      baseCategoryRecord({ displayOrder: 3 }) as never
    );

    await createLinkCategoryRecord({
      parentId: null,
      name: "新規大分類",
      translations: [{ locale: "en", name: "New Category" }],
    });

    expect(prisma.linkCategory.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: null } })
    );
    expect(prisma.linkCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayOrder: 3, parentId: null }),
      })
    );
  });

  it("親が存在しない場合はLinkCategoryDepthErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(null);

    await expect(
      createLinkCategoryRecord({
        parentId: "missing-parent",
        name: "中分類",
        translations: [{ locale: "en", name: "Child" }],
      })
    ).rejects.toThrow(LinkCategoryDepthError);
    expect(prisma.linkCategory.create).not.toHaveBeenCalled();
  });

  it("指定した親が既に中分類（parentId非null）の場合はLinkCategoryDepthErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "child-as-parent", parentId: "grandparent" }) as never
    );

    await expect(
      createLinkCategoryRecord({
        parentId: "child-as-parent",
        name: "孫カテゴリ",
        translations: [{ locale: "en", name: "Grandchild" }],
      })
    ).rejects.toThrow(LinkCategoryDepthError);
    expect(prisma.linkCategory.create).not.toHaveBeenCalled();
  });

  it("同一階層で既定言語（ja）の名称が重複する場合はLinkCategoryNameConflictErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findFirst).mockResolvedValue(
      baseCategoryRecord({ id: "existing" }) as never
    );

    await expect(
      createLinkCategoryRecord({
        parentId: null,
        name: "大分類",
        translations: [{ locale: "en", name: "Duplicate" }],
      })
    ).rejects.toThrow(LinkCategoryNameConflictError);
    expect(prisma.linkCategory.create).not.toHaveBeenCalled();
  });
});

describe("updateLinkCategoryRecord", () => {
  it("名称重複判定は自分自身を除外する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1" }) as never
    );
    vi.mocked(prisma.linkCategory.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.linkCategory.update).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", name: "更新後" }) as never
    );

    await updateLinkCategoryRecord("category-1", {
      name: "更新後",
      translations: [{ locale: "en", name: "Updated" }],
    });

    expect(prisma.linkCategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "category-1" } }),
      })
    );
    expect(prisma.linkCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            deleteMany: {},
            create: [{ locale: "en", name: "Updated" }],
          },
        }),
      })
    );
  });

  it("存在しないIDの更新はLinkCategoryNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(null);

    await expect(
      updateLinkCategoryRecord("missing", {
        name: "更新後",
        translations: [],
      })
    ).rejects.toThrow(LinkCategoryNotFoundError);
  });

  it("他の既存カテゴリと名称が重複する場合はLinkCategoryNameConflictErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1" }) as never
    );
    vi.mocked(prisma.linkCategory.findFirst).mockResolvedValue(
      baseCategoryRecord({ id: "other-category" }) as never
    );

    await expect(
      updateLinkCategoryRecord("category-1", {
        name: "重複名",
        translations: [],
      })
    ).rejects.toThrow(LinkCategoryNameConflictError);
    expect(prisma.linkCategory.update).not.toHaveBeenCalled();
  });
});

describe("deleteLinkCategoryRecord", () => {
  it("紐づくリンクが1件以上ある大分類は、正しい件数を伴ってLinkCategoryInUseErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );
    vi.mocked(prisma.link.count).mockResolvedValue(3);
    vi.mocked(prisma.linkCategory.count).mockResolvedValue(0);

    const error = await deleteLinkCategoryRecord("category-1").catch((e) => e);

    expect(error).toBeInstanceOf(LinkCategoryInUseError);
    expect((error as InstanceType<typeof LinkCategoryInUseError>).linkCount).toBe(3);
    expect((error as InstanceType<typeof LinkCategoryInUseError>).childCount).toBe(0);
    expect(prisma.linkCategory.delete).not.toHaveBeenCalled();
  });

  it("配下に中分類が1件以上ある大分類は、正しい件数を伴ってLinkCategoryInUseErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );
    vi.mocked(prisma.link.count).mockResolvedValue(0);
    vi.mocked(prisma.linkCategory.count).mockResolvedValue(2);

    const error = await deleteLinkCategoryRecord("category-1").catch((e) => e);

    expect(error).toBeInstanceOf(LinkCategoryInUseError);
    expect((error as InstanceType<typeof LinkCategoryInUseError>).childCount).toBe(2);
    expect(prisma.linkCategory.delete).not.toHaveBeenCalled();
  });

  it("紐づくリンク・配下の中分類がいずれも0件のときのみ削除する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );
    vi.mocked(prisma.link.count).mockResolvedValue(0);
    vi.mocked(prisma.linkCategory.count).mockResolvedValue(0);
    vi.mocked(prisma.linkCategory.delete).mockResolvedValue(
      baseCategoryRecord() as never
    );

    await deleteLinkCategoryRecord("category-1");

    expect(prisma.linkCategory.delete).toHaveBeenCalledWith({
      where: { id: "category-1" },
    });
  });

  it("中分類の削除判定はsubCategoryId一致件数で行い、配下中分類件数は数えない", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "sub-1", parentId: "category-1" }) as never
    );
    vi.mocked(prisma.link.count).mockResolvedValue(0);
    vi.mocked(prisma.linkCategory.delete).mockResolvedValue(
      baseCategoryRecord() as never
    );

    await deleteLinkCategoryRecord("sub-1");

    expect(prisma.link.count).toHaveBeenCalledWith({
      where: { subCategoryId: "sub-1" },
    });
    expect(prisma.linkCategory.count).not.toHaveBeenCalled();
    expect(prisma.linkCategory.delete).toHaveBeenCalled();
  });

  it("存在しないIDの削除はLinkCategoryNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(null);

    await expect(deleteLinkCategoryRecord("missing")).rejects.toThrow(
      LinkCategoryNotFoundError
    );
  });
});

describe("moveLinkCategoryRecord", () => {
  it("隣接レコードとdisplayOrderをトランザクションで入れ替える", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "b", displayOrder: 1 }) as never
    );
    vi.mocked(prisma.linkCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "a", displayOrder: 0 }),
      baseCategoryRecord({ id: "b", displayOrder: 1 }),
      baseCategoryRecord({ id: "c", displayOrder: 2 }),
    ] as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    await moveLinkCategoryRecord("b", "up");

    expect(prisma.$transaction).toHaveBeenCalled();
    const transactionArg = vi.mocked(prisma.$transaction).mock.calls[0]?.[0];
    expect(Array.isArray(transactionArg)).toBe(true);
  });

  it("先頭で「上へ」を指定した場合は何も変更しない", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "a", displayOrder: 0 }) as never
    );
    vi.mocked(prisma.linkCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "a", displayOrder: 0 }),
      baseCategoryRecord({ id: "b", displayOrder: 1 }),
    ] as never);

    await moveLinkCategoryRecord("a", "up");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("末尾で「下へ」を指定した場合は何も変更しない", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "b", displayOrder: 1 }) as never
    );
    vi.mocked(prisma.linkCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "a", displayOrder: 0 }),
      baseCategoryRecord({ id: "b", displayOrder: 1 }),
    ] as never);

    await moveLinkCategoryRecord("b", "down");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("同一階層（同一parentId）のレコードのみを対象にする", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "sub-1", parentId: "category-1", displayOrder: 0 }) as never
    );
    vi.mocked(prisma.linkCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "sub-1", parentId: "category-1", displayOrder: 0 }),
    ] as never);

    await moveLinkCategoryRecord("sub-1", "down");

    expect(prisma.linkCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: "category-1" } })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("assertLinkCategoryPair", () => {
  it("存在しない大分類を指定した場合はLinkCategoryPairErrorを送出する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(null);

    await expect(assertLinkCategoryPair("missing", null)).rejects.toThrow(
      LinkCategoryPairError
    );
  });

  it("大分類として指定されたIDが実は中分類（parentId非null）の場合は拒否する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "sub-1", parentId: "category-1" }) as never
    );

    await expect(assertLinkCategoryPair("sub-1", null)).rejects.toThrow(
      LinkCategoryPairError
    );
  });

  it("subCategoryIdがnullのときは受理する", async () => {
    vi.mocked(prisma.linkCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );

    await expect(
      assertLinkCategoryPair("category-1", null)
    ).resolves.toBeUndefined();
  });

  it("親が一致しない中分類を指定した場合は拒否する", async () => {
    vi.mocked(prisma.linkCategory.findUnique)
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "category-1", parentId: null }) as never
      )
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "sub-1", parentId: "other-category" }) as never
      );

    await expect(
      assertLinkCategoryPair("category-1", "sub-1")
    ).rejects.toThrow(LinkCategoryPairError);
  });

  it("正しい親子関係の組み合わせは受理する", async () => {
    vi.mocked(prisma.linkCategory.findUnique)
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "category-1", parentId: null }) as never
      )
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "sub-1", parentId: "category-1" }) as never
      );

    await expect(
      assertLinkCategoryPair("category-1", "sub-1")
    ).resolves.toBeUndefined();
  });
});

describe("listLinkCategoriesForHelpdesk", () => {
  it("大分類をdisplayOrder昇順・件数付きで返し、中分類も同順序でincludeする", async () => {
    vi.mocked(prisma.linkCategory.findMany).mockResolvedValue([
      {
        ...baseCategoryRecord({ id: "category-1", displayOrder: 0 }),
        _count: { links: 2 },
        children: [
          {
            ...baseCategoryRecord({ id: "sub-1", parentId: "category-1", displayOrder: 0 }),
            _count: { subCategoryLinks: 1 },
          },
        ],
      },
    ] as never);

    const result = await listLinkCategoriesForHelpdesk();

    expect(result).toEqual([
      {
        id: "category-1",
        parentId: null,
        name: "大分類",
        displayOrder: 0,
        translations: [],
        linkCount: 2,
        children: [
          {
            id: "sub-1",
            parentId: "category-1",
            name: "大分類",
            displayOrder: 0,
            translations: [],
            linkCount: 1,
          },
        ],
      },
    ]);
  });
});

describe("getLinkCategoriesForApplicant", () => {
  it("大分類・中分類の名前をlocaleで解決した状態で全件返す", async () => {
    vi.mocked(prisma.linkCategory.findMany).mockResolvedValue([
      {
        ...baseCategoryRecord({
          id: "category-1",
          displayOrder: 0,
          translations: [{ locale: "en", name: "Major Category" }],
        }),
        children: [
          baseCategoryRecord({
            id: "sub-1",
            parentId: "category-1",
            displayOrder: 0,
            translations: [{ locale: "en", name: "Sub Category" }],
          }),
        ],
      },
    ] as never);

    const result = await getLinkCategoriesForApplicant("en");

    expect(result).toEqual([
      {
        id: "category-1",
        name: "Major Category",
        displayOrder: 0,
        subCategories: [
          { id: "sub-1", name: "Sub Category", displayOrder: 0 },
        ],
      },
    ]);
  });
});
