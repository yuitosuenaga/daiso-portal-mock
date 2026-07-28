import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    documentCategory: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    document: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  DocumentCategoryDepthError,
  DocumentCategoryInUseError,
  DocumentCategoryNameConflictError,
  DocumentCategoryNotFoundError,
  DocumentCategoryPairError,
  assertDocumentCategoryPair,
  createDocumentCategoryRecord,
  deleteDocumentCategoryRecord,
  findVisibleDocumentCategory,
  listVisibleDocumentCategories,
  moveDocumentCategoryRecord,
  updateDocumentCategoryRecord,
} from "@/lib/server/document-category-service";

function baseCategoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "category-1",
    parentId: null as string | null,
    name: "大分類",
    displayOrder: 0,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
    createdAt: new Date("2026-07-28T00:00:00.000Z"),
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    translations: [] as { locale: string; name: string }[],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDocumentCategoryRecord", () => {
  it("親を指定しない場合、同一階層（大分類同士）の末尾へdisplayOrderを採番する", async () => {
    vi.mocked(prisma.documentCategory.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.documentCategory.aggregate).mockResolvedValue({
      _max: { displayOrder: 2 },
    } as never);
    vi.mocked(prisma.documentCategory.create).mockResolvedValue(
      baseCategoryRecord({ displayOrder: 3 }) as never
    );

    await createDocumentCategoryRecord({
      parentId: null,
      name: "新規大分類",
      targeting: { scope: "all" },
      translations: [{ locale: "en", name: "New Category" }],
    });

    expect(prisma.documentCategory.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: null } })
    );
    expect(prisma.documentCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayOrder: 3, parentId: null }),
      })
    );
  });

  it("親が存在しない場合はDocumentCategoryDepthErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(null);

    await expect(
      createDocumentCategoryRecord({
        parentId: "missing-parent",
        name: "中分類",
        targeting: { scope: "all" },
        translations: [{ locale: "en", name: "Child" }],
      })
    ).rejects.toThrow(DocumentCategoryDepthError);
    expect(prisma.documentCategory.create).not.toHaveBeenCalled();
  });

  it("指定した親が既に中分類（parentId非null）の場合はDocumentCategoryDepthErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "child-as-parent", parentId: "grandparent" }) as never
    );

    await expect(
      createDocumentCategoryRecord({
        parentId: "child-as-parent",
        name: "孫カテゴリ",
        targeting: { scope: "all" },
        translations: [{ locale: "en", name: "Grandchild" }],
      })
    ).rejects.toThrow(DocumentCategoryDepthError);
    expect(prisma.documentCategory.create).not.toHaveBeenCalled();
  });

  it("同一階層で既定言語（ja）の名称が重複する場合はDocumentCategoryNameConflictErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findFirst).mockResolvedValue(
      baseCategoryRecord({ id: "existing" }) as never
    );

    await expect(
      createDocumentCategoryRecord({
        parentId: null,
        name: "大分類",
        targeting: { scope: "all" },
        translations: [{ locale: "en", name: "Duplicate" }],
      })
    ).rejects.toThrow(DocumentCategoryNameConflictError);
    expect(prisma.documentCategory.create).not.toHaveBeenCalled();
  });
});

describe("updateDocumentCategoryRecord", () => {
  it("名称重複判定は自分自身を除外する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1" }) as never
    );
    vi.mocked(prisma.documentCategory.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.documentCategory.update).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", name: "更新後" }) as never
    );

    await updateDocumentCategoryRecord("category-1", {
      name: "更新後",
      targeting: { scope: "all" },
      translations: [{ locale: "en", name: "Updated" }],
    });

    expect(prisma.documentCategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "category-1" } }),
      })
    );
    expect(prisma.documentCategory.update).toHaveBeenCalledWith(
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

  it("存在しないIDの更新はDocumentCategoryNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(null);

    await expect(
      updateDocumentCategoryRecord("missing", {
        name: "更新後",
        targeting: { scope: "all" },
        translations: [],
      })
    ).rejects.toThrow(DocumentCategoryNotFoundError);
  });

  it("他の既存カテゴリと名称が重複する場合はDocumentCategoryNameConflictErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1" }) as never
    );
    vi.mocked(prisma.documentCategory.findFirst).mockResolvedValue(
      baseCategoryRecord({ id: "other-category" }) as never
    );

    await expect(
      updateDocumentCategoryRecord("category-1", {
        name: "重複名",
        targeting: { scope: "all" },
        translations: [],
      })
    ).rejects.toThrow(DocumentCategoryNameConflictError);
    expect(prisma.documentCategory.update).not.toHaveBeenCalled();
  });
});

describe("deleteDocumentCategoryRecord", () => {
  it("紐づくドキュメントが1件以上ある大分類は、正しい件数を伴ってDocumentCategoryInUseErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );
    vi.mocked(prisma.document.count).mockResolvedValue(3);
    vi.mocked(prisma.documentCategory.count).mockResolvedValue(0);

    const error = await deleteDocumentCategoryRecord("category-1").catch((e) => e);

    expect(error).toBeInstanceOf(DocumentCategoryInUseError);
    expect((error as InstanceType<typeof DocumentCategoryInUseError>).documentCount).toBe(3);
    expect((error as InstanceType<typeof DocumentCategoryInUseError>).childCount).toBe(0);
    expect(prisma.documentCategory.delete).not.toHaveBeenCalled();
  });

  it("配下に中分類が1件以上ある大分類は、正しい件数を伴ってDocumentCategoryInUseErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );
    vi.mocked(prisma.document.count).mockResolvedValue(0);
    vi.mocked(prisma.documentCategory.count).mockResolvedValue(2);

    const error = await deleteDocumentCategoryRecord("category-1").catch((e) => e);

    expect(error).toBeInstanceOf(DocumentCategoryInUseError);
    expect((error as InstanceType<typeof DocumentCategoryInUseError>).childCount).toBe(2);
    expect(prisma.documentCategory.delete).not.toHaveBeenCalled();
  });

  it("紐づくドキュメント・配下の中分類がいずれも0件のときのみ削除する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );
    vi.mocked(prisma.document.count).mockResolvedValue(0);
    vi.mocked(prisma.documentCategory.count).mockResolvedValue(0);
    vi.mocked(prisma.documentCategory.delete).mockResolvedValue(
      baseCategoryRecord() as never
    );

    await deleteDocumentCategoryRecord("category-1");

    expect(prisma.documentCategory.delete).toHaveBeenCalledWith({
      where: { id: "category-1" },
    });
  });

  it("中分類の削除判定はsubCategoryId一致件数で行い、配下中分類件数は数えない", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "sub-1", parentId: "category-1" }) as never
    );
    vi.mocked(prisma.document.count).mockResolvedValue(0);
    vi.mocked(prisma.documentCategory.delete).mockResolvedValue(
      baseCategoryRecord() as never
    );

    await deleteDocumentCategoryRecord("sub-1");

    expect(prisma.document.count).toHaveBeenCalledWith({
      where: { subCategoryId: "sub-1" },
    });
    expect(prisma.documentCategory.count).not.toHaveBeenCalled();
    expect(prisma.documentCategory.delete).toHaveBeenCalled();
  });

  it("存在しないIDの削除はDocumentCategoryNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(null);

    await expect(deleteDocumentCategoryRecord("missing")).rejects.toThrow(
      DocumentCategoryNotFoundError
    );
  });
});

describe("moveDocumentCategoryRecord", () => {
  it("隣接レコードとdisplayOrderをトランザクションで入れ替える", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "b", displayOrder: 1 }) as never
    );
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "a", displayOrder: 0 }),
      baseCategoryRecord({ id: "b", displayOrder: 1 }),
      baseCategoryRecord({ id: "c", displayOrder: 2 }),
    ] as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    await moveDocumentCategoryRecord("b", "up");

    expect(prisma.$transaction).toHaveBeenCalled();
    const transactionArg = vi.mocked(prisma.$transaction).mock.calls[0]?.[0];
    expect(Array.isArray(transactionArg)).toBe(true);
  });

  it("先頭で「上へ」を指定した場合は何も変更しない", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "a", displayOrder: 0 }) as never
    );
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "a", displayOrder: 0 }),
      baseCategoryRecord({ id: "b", displayOrder: 1 }),
    ] as never);

    await moveDocumentCategoryRecord("a", "up");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("末尾で「下へ」を指定した場合は何も変更しない", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "b", displayOrder: 1 }) as never
    );
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "a", displayOrder: 0 }),
      baseCategoryRecord({ id: "b", displayOrder: 1 }),
    ] as never);

    await moveDocumentCategoryRecord("b", "down");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("同一階層（同一parentId）のレコードのみを対象にする", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "sub-1", parentId: "category-1", displayOrder: 0 }) as never
    );
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "sub-1", parentId: "category-1", displayOrder: 0 }),
    ] as never);

    await moveDocumentCategoryRecord("sub-1", "down");

    expect(prisma.documentCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: "category-1" } })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("assertDocumentCategoryPair", () => {
  it("存在しない大分類を指定した場合はDocumentCategoryPairErrorを送出する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(null);

    await expect(
      assertDocumentCategoryPair("missing", null)
    ).rejects.toThrow(DocumentCategoryPairError);
  });

  it("大分類として指定されたIDが実は中分類（parentId非null）の場合は拒否する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "sub-1", parentId: "category-1" }) as never
    );

    await expect(
      assertDocumentCategoryPair("sub-1", null)
    ).rejects.toThrow(DocumentCategoryPairError);
  });

  it("subCategoryIdがnullのときは受理する", async () => {
    vi.mocked(prisma.documentCategory.findUnique).mockResolvedValue(
      baseCategoryRecord({ id: "category-1", parentId: null }) as never
    );

    await expect(
      assertDocumentCategoryPair("category-1", null)
    ).resolves.toBeUndefined();
  });

  it("親が一致しない中分類を指定した場合は拒否する", async () => {
    vi.mocked(prisma.documentCategory.findUnique)
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "category-1", parentId: null }) as never
      )
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "sub-1", parentId: "other-category" }) as never
      );

    await expect(
      assertDocumentCategoryPair("category-1", "sub-1")
    ).rejects.toThrow(DocumentCategoryPairError);
  });

  it("正しい親子関係の組み合わせは受理する", async () => {
    vi.mocked(prisma.documentCategory.findUnique)
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "category-1", parentId: null }) as never
      )
      .mockResolvedValueOnce(
        baseCategoryRecord({ id: "sub-1", parentId: "category-1" }) as never
      );

    await expect(
      assertDocumentCategoryPair("category-1", "sub-1")
    ).resolves.toBeUndefined();
  });
});

describe("listVisibleDocumentCategories", () => {
  it("カテゴリ自体が可視かつ配下に自社可視の公開済みドキュメントが1件以上ある大分類のみを返す", async () => {
    vi.mocked(prisma.document.groupBy).mockResolvedValue([
      { categoryId: "category-1", _count: { _all: 2 } },
    ] as never);
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "category-1", displayOrder: 0 }),
      baseCategoryRecord({ id: "category-2", displayOrder: 1 }),
    ] as never);

    const result = await listVisibleDocumentCategories("VN", "vn-daiso-vietnam");

    expect(result).toEqual([
      { id: "category-1", name: "大分類", documentCount: 2 },
    ]);
  });

  it("未分類（categoryId: null）のドキュメントはどの大分類にも計上しない", async () => {
    vi.mocked(prisma.document.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "category-1" }),
    ] as never);

    const result = await listVisibleDocumentCategories("VN", "vn-daiso-vietnam");

    expect(result).toEqual([]);
    expect(prisma.document.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: { not: null } }),
      })
    );
  });
});

describe("findVisibleDocumentCategory", () => {
  it("非可視カテゴリ・存在しないIDに対してnullを返す", async () => {
    vi.mocked(prisma.documentCategory.findFirst).mockResolvedValue(null);

    const result = await findVisibleDocumentCategory(
      "missing",
      "VN",
      "vn-daiso-vietnam"
    );

    expect(result).toBeNull();
  });

  it("配下の中分類は可視のもののみ、displayOrder昇順で返す", async () => {
    vi.mocked(prisma.documentCategory.findFirst).mockResolvedValue(
      baseCategoryRecord({ id: "category-1" }) as never
    );
    vi.mocked(prisma.documentCategory.findMany).mockResolvedValue([
      baseCategoryRecord({ id: "sub-1", parentId: "category-1", displayOrder: 0 }),
      baseCategoryRecord({ id: "sub-2", parentId: "category-1", displayOrder: 1 }),
    ] as never);

    const result = await findVisibleDocumentCategory(
      "category-1",
      "VN",
      "vn-daiso-vietnam"
    );

    expect(result?.subCategories).toEqual([
      { id: "sub-1", name: "大分類" },
      { id: "sub-2", name: "大分類" },
    ]);
    expect(prisma.documentCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ parentId: "category-1" }) })
    );
  });
});
