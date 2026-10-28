import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  DocumentNotFoundError,
  createDocumentRecord,
  deleteDocumentRecord,
  findDocumentById,
  findDocumentFileById,
  findDocumentFileMetaById,
  findDocumentFileMetaVisibleTo,
  findDocumentFileVisibleTo,
  findDocumentVisibleTo,
  getDocumentFileStats,
  listAllDocuments,
  listDocumentsVisibleTo,
  listVisibleDocumentsInCategory,
  updateDocumentRecord,
} from "@/lib/server/document-service";

function baseDocumentRecord(
  overrides: Partial<{
    id: string;
    title: string;
    description: string | null;
    status: "draft" | "published";
    sourceType: "upload" | "google";
    fileName: string | null;
    fileType: string | null;
    fileSize: number | null;
    dataUrl: string | null;
    googleUrl: string | null;
    googleEmbedUrl: string | null;
    uploadedAt: Date;
    targetingScope: "all" | "countries" | "companies";
    targetingCountries: string[];
    targetingCompanyCodes: string[];
    translations: { locale: string; title: string; description: string | null }[];
    categoryId: string | null;
    subCategoryId: string | null;
  }> = {}
) {
  return {
    id: "document-1",
    title: "タイトル",
    description: null,
    status: "published" as const,
    sourceType: "upload" as const,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    googleUrl: null,
    googleEmbedUrl: null,
    uploadedAt: new Date("2026-07-01T09:00:00.000Z"),
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
    translations: [] as { locale: string; title: string; description: string | null }[],
    categoryId: null as string | null,
    subCategoryId: null as string | null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listDocumentsVisibleTo", () => {
  it("アップロード日降順で取得し、全体公開・国・会社コードのOR条件をクエリに含む", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      baseDocumentRecord({ id: "1" }),
    ] as never);

    const result = await listDocumentsVisibleTo("VN", "vn-daiso-vietnam");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          OR: [
            { targetingScope: "all" },
            { targetingScope: "countries", targetingCountries: { has: "VN" } },
            {
              targetingScope: "companies",
              targetingCompanyCodes: { has: "vn-daiso-vietnam" },
            },
          ],
        },
      })
    );
  });

  it("status: publishedをクエリ条件に含み、下書きを除外する（Prisma側でフィルタされる前提）", async () => {
    // `listDocumentsVisibleTo`はPrismaへ`status: "published"`をwhere条件として渡すのみで、
    // 実際の絞り込みはDB側が行う。ここではクエリに条件が含まれることを検証する。
    vi.mocked(prisma.document.findMany).mockResolvedValue([] as never);

    await listDocumentsVisibleTo("VN", "vn-daiso-vietnam");

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      })
    );
  });
});

describe("findDocumentVisibleTo", () => {
  it("公開範囲が国指定に含まれるドキュメントを返す", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(
      baseDocumentRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
      }) as never
    );

    const result = await findDocumentVisibleTo("1", "VN", "vn-daiso-vietnam");

    expect(result?.targeting).toEqual({ scope: "countries", countries: ["VN", "TH"] });
  });

  it("公開範囲が販社指定に含まれるドキュメントを返す", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(
      baseDocumentRecord({
        id: "1",
        targetingScope: "companies",
        targetingCompanyCodes: ["vn-daiso-vietnam"],
      }) as never
    );

    const result = await findDocumentVisibleTo("1", "VN", "vn-daiso-vietnam");

    expect(result?.targeting).toEqual({
      scope: "companies",
      companyCodes: ["vn-daiso-vietnam"],
    });
  });

  it("存在しない、または非公開の場合はnullを返す", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

    const result = await findDocumentVisibleTo("missing", "VN", "vn-daiso-vietnam");

    expect(result).toBeNull();
  });

  it("status: publishedをクエリ条件に含む（下書きは公開範囲外と同様nullとして扱われる）", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

    await findDocumentVisibleTo("draft-doc", "VN", "vn-daiso-vietnam");

    expect(prisma.document.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "draft-doc", status: "published" }),
      })
    );
  });
});

describe("listAllDocuments / findDocumentById", () => {
  it("絞り込みなしで全件を取得する", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      baseDocumentRecord({ id: "1" }),
      baseDocumentRecord({ id: "2" }),
    ] as never);

    const result = await listAllDocuments();

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("status（下書き/公開）で絞り込まず、両方を返す", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      baseDocumentRecord({ id: "1", status: "draft" }),
      baseDocumentRecord({ id: "2", status: "published" }),
    ] as never);

    const result = await listAllDocuments();

    expect(result.map((item) => item.status)).toEqual(["draft", "published"]);
    // whereにstatus条件を含まないことを確認する
    const callArgs = vi.mocked(prisma.document.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where).toBeUndefined();
  });

  it("findDocumentByIdはstatus: draftのドキュメントも返す（絞り込みを行わない）", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(
      baseDocumentRecord({ id: "draft-1", status: "draft" }) as never
    );

    const result = await findDocumentById("draft-1");

    expect(result?.status).toBe("draft");
  });

  it("存在しないIDはnullを返す", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    const result = await findDocumentById("missing");

    expect(result).toBeNull();
  });

  it("sourceType: googleのレコードをGoogle型のDocumentへマッピングする", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(
      baseDocumentRecord({
        id: "2",
        sourceType: "google",
        fileName: null,
        fileType: null,
        fileSize: null,
        dataUrl: null,
        googleUrl: "https://docs.google.com/document/d/abc123/edit",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      }) as never
    );

    const result = await findDocumentById("2");

    expect(result?.sourceType).toBe("google");
    if (result?.sourceType === "google") {
      expect(result.googleUrl).toBe(
        "https://docs.google.com/document/d/abc123/edit"
      );
      expect(result.googleEmbedUrl).toBe(
        "https://docs.google.com/document/d/abc123/preview"
      );
    }
    expect(result && "fileName" in result).toBe(false);
  });
});

describe("createDocumentRecord / updateDocumentRecord / deleteDocumentRecord", () => {
  it("targetingを列に変換して作成する", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(
      baseDocumentRecord({
        id: "1",
        targetingScope: "companies",
        targetingCompanyCodes: ["jp-daiso-japan-trading"],
      }) as never
    );

    const result = await createDocumentRecord({
      sourceType: "upload",
      title: "タイトル",
      status: "published",
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "companies", companyCodes: ["jp-daiso-japan-trading"] },
      translations: [],
      categoryId: "category-1",
      subCategoryId: null,
    });

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetingScope: "companies",
          targetingCompanyCodes: ["jp-daiso-japan-trading"],
        }),
      })
    );
    expect(result.targeting).toEqual({
      scope: "companies",
      companyCodes: ["jp-daiso-japan-trading"],
    });
  });

  it("sourceType: googleの入力でgoogleUrl/googleEmbedUrlを保存し、fileName等をnullにする", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(
      baseDocumentRecord({
        id: "2",
        sourceType: "google",
        fileName: null,
        fileType: null,
        fileSize: null,
        dataUrl: null,
        googleUrl: "https://docs.google.com/document/d/abc123/edit",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      }) as never
    );

    const result = await createDocumentRecord({
      sourceType: "google",
      title: "Googleドキュメント",
      status: "published",
      googleUrl: "https://docs.google.com/document/d/abc123/edit",
      googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      targeting: { scope: "all" },
      translations: [],
      categoryId: "category-1",
      subCategoryId: null,
    });

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "google",
          fileName: null,
          fileType: null,
          fileSize: null,
          dataUrl: null,
          googleUrl: "https://docs.google.com/document/d/abc123/edit",
          googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
        }),
      })
    );
    expect(result.sourceType).toBe("google");
    if (result.sourceType === "google") {
      expect(result.googleEmbedUrl).toBe(
        "https://docs.google.com/document/d/abc123/preview"
      );
    }
  });

  it("sourceType: uploadの入力ではgoogleUrl/googleEmbedUrlをnullにする", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(
      baseDocumentRecord({ id: "1" }) as never
    );

    await createDocumentRecord({
      sourceType: "upload",
      title: "タイトル",
      status: "published",
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [],
      categoryId: "category-1",
      subCategoryId: null,
    });

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleUrl: null,
          googleEmbedUrl: null,
        }),
      })
    );
  });

  it("createDocumentRecordはtranslationsを`create`のみ（deleteManyなし）のネスト書き込みで保存する", async () => {
    // 新規作成時は既存の翻訳行が存在しないため、Prismaの`create`ネスト書き込みは
    // `deleteMany`を含められない（update専用の操作）。誤って含めると
    // `PrismaClientValidationError`（Unknown argument `deleteMany`）が実行時に発生するため、
    // createとupdateのネスト書き込み形状の違いを明示的に検証する。
    vi.mocked(prisma.document.create).mockResolvedValue(
      baseDocumentRecord({ id: "1" }) as never
    );

    await createDocumentRecord({
      sourceType: "upload",
      title: "タイトル",
      status: "published",
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [{ locale: "en", title: "Title" }],
      categoryId: "category-1",
      subCategoryId: null,
    });

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            create: [
              { locale: "en", title: "Title", description: undefined },
            ],
          },
        }),
      })
    );
  });

  it("updateDocumentRecordはtranslationsを`deleteMany`+`create`（全置換）のネスト書き込みで保存する", async () => {
    vi.mocked(prisma.document.update).mockResolvedValue(
      baseDocumentRecord({ id: "1" }) as never
    );

    await updateDocumentRecord("1", {
      sourceType: "upload",
      title: "タイトル",
      status: "published",
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [{ locale: "en", title: "Title" }],
      categoryId: "category-1",
      subCategoryId: null,
    });

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            deleteMany: {},
            create: [
              { locale: "en", title: "Title", description: undefined },
            ],
          },
        }),
      })
    );
  });

  it("存在しないIDの更新はDocumentNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.document.update).mockRejectedValue(new Error("not found"));

    await expect(
      updateDocumentRecord("missing", {
        sourceType: "upload",
        title: "t",
        status: "published",
        fileName: "t.pdf",
        fileType: "application/pdf",
        fileSize: 1,
        dataUrl: "data:application/pdf;base64,AAAA",
        targeting: { scope: "all" },
        translations: [],
        categoryId: "category-1",
        subCategoryId: null,
      })
    ).rejects.toThrow(DocumentNotFoundError);
  });

  it("存在しないIDの削除はDocumentNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.document.delete).mockRejectedValue(new Error("not found"));

    await expect(deleteDocumentRecord("missing")).rejects.toThrow(
      DocumentNotFoundError
    );
  });

  it("削除に子テーブルの制約はなく、単純なdeleteのみを呼ぶ", async () => {
    vi.mocked(prisma.document.delete).mockResolvedValue(
      baseDocumentRecord({ id: "1" }) as never
    );

    await deleteDocumentRecord("1");

    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});

describe("listVisibleDocumentsInCategory", () => {
  it("指定した大分類配下（categoryId一致）かつ自社に可視なドキュメントのみをアップロード日降順で返す", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      baseDocumentRecord({ id: "1", categoryId: "category-1" }),
    ] as never);

    const result = await listVisibleDocumentsInCategory(
      "category-1",
      "VN",
      "vn-daiso-vietnam"
    );

    expect(result).toHaveLength(1);
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: "category-1",
          status: "published",
        }),
        orderBy: { uploadedAt: "desc" },
      })
    );
  });
});

function selectArg(mock: unknown): Record<string, unknown> {
  const calls = (mock as { mock: { calls: unknown[][] } }).mock.calls;
  const arg = calls[0]?.[0] as { select?: Record<string, unknown> } | undefined;
  expect(arg?.select).toBeDefined();
  return arg?.select as Record<string, unknown>;
}

describe("一覧・単件取得・保存系はファイル本体(dataUrl)を読まず、返さない", () => {
  it("listDocumentsVisibleToはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([baseDocumentRecord({ id: "1" })] as never);

    const result = await listDocumentsVisibleTo("VN", "vn");

    const select = selectArg(prisma.document.findMany);
    expect(select).not.toHaveProperty("dataUrl");
    expect(select).toHaveProperty("translations");
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("listAllDocumentsはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([baseDocumentRecord({ id: "1" })] as never);

    const result = await listAllDocuments();

    expect(selectArg(prisma.document.findMany)).not.toHaveProperty("dataUrl");
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("listVisibleDocumentsInCategoryはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([baseDocumentRecord({ id: "1" })] as never);

    const result = await listVisibleDocumentsInCategory("c1", "VN", "vn");

    expect(selectArg(prisma.document.findMany)).not.toHaveProperty("dataUrl");
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("findDocumentVisibleToはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocumentRecord({ id: "1" }) as never);

    const result = await findDocumentVisibleTo("1", "VN", "vn");

    expect(selectArg(prisma.document.findFirst)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });

  it("createDocumentRecordはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue(baseDocumentRecord({ id: "1" }) as never);

    const result = await createDocumentRecord({
      sourceType: "upload",
      title: "t",
      status: "published",
      fileName: "t.pdf",
      fileType: "application/pdf",
      fileSize: 1,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [],
      categoryId: "c1",
      subCategoryId: null,
    });

    expect(selectArg(prisma.document.create)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });

  it("updateDocumentRecordはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.document.update).mockResolvedValue(baseDocumentRecord({ id: "1" }) as never);

    const result = await updateDocumentRecord("1", {
      sourceType: "upload",
      title: "t",
      status: "published",
      fileName: "t.pdf",
      fileType: "application/pdf",
      fileSize: 1,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [],
      categoryId: "c1",
      subCategoryId: null,
    });

    expect(selectArg(prisma.document.update)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });
});

describe("findDocumentFileVisibleTo", () => {
  it("可視性述語を再利用したwhereと、ファイル用selectで1件取得する", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocumentRecord() as never);

    const result = await findDocumentFileVisibleTo("doc-1", "VN", "vn-co");

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: "doc-1",
        status: "published",
        OR: [
          { targetingScope: "all" },
          { targetingScope: "countries", targetingCountries: { has: "VN" } },
          { targetingScope: "companies", targetingCompanyCodes: { has: "vn-co" } },
        ],
      },
      select: { sourceType: true, fileName: true, fileType: true, dataUrl: true },
    });
    expect(result).toEqual({
      fileName: "test.pdf",
      dataUrl: "data:application/pdf;base64,AAAA",
    });
  });

  it("存在しない場合はnullを返す", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);
    expect(await findDocumentFileVisibleTo("x", "VN", "vn-co")).toBeNull();
  });

  it("google型はnullを返す", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(
      baseDocumentRecord({ sourceType: "google", dataUrl: null, fileName: null }) as never
    );
    expect(await findDocumentFileVisibleTo("x", "VN", "vn-co")).toBeNull();
  });

  it("dataUrlがnullのupload型はnullを返す", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(
      baseDocumentRecord({ dataUrl: null }) as never
    );
    expect(await findDocumentFileVisibleTo("x", "VN", "vn-co")).toBeNull();
  });
});

describe("findDocumentFileById", () => {
  it("公開状態・範囲で絞らずIDだけで取得する", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(
      baseDocumentRecord({ status: "draft" }) as never
    );

    const result = await findDocumentFileById("doc-1");

    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      select: { sourceType: true, fileName: true, fileType: true, dataUrl: true },
    });
    expect(result).toEqual({
      fileName: "test.pdf",
      dataUrl: "data:application/pdf;base64,AAAA",
    });
  });

  it("存在しない・google型・dataUrlなしはnull", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(null);
    expect(await findDocumentFileById("x")).toBeNull();
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(
      baseDocumentRecord({ sourceType: "google", dataUrl: null }) as never
    );
    expect(await findDocumentFileById("x")).toBeNull();
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(
      baseDocumentRecord({ dataUrl: null }) as never
    );
    expect(await findDocumentFileById("x")).toBeNull();
  });
});

describe("findDocumentFileMetaVisibleTo / ById（本体を読まない認可確認）", () => {
  it("可視性述語を再利用し、selectにdataUrlを含めない", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocumentRecord() as never);

    const result = await findDocumentFileMetaVisibleTo("doc-1", "VN", "vn-co");

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: "doc-1",
        status: "published",
        OR: [
          { targetingScope: "all" },
          { targetingScope: "countries", targetingCountries: { has: "VN" } },
          { targetingScope: "companies", targetingCompanyCodes: { has: "vn-co" } },
        ],
      },
      select: { id: true, sourceType: true, fileName: true },
    });
    expect(result).toEqual({ id: "document-1", fileName: "test.pdf" });
  });

  it("存在しない・google型はnull", async () => {
    vi.mocked(prisma.document.findFirst).mockResolvedValueOnce(null);
    expect(await findDocumentFileMetaVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.document.findFirst).mockResolvedValueOnce(
      baseDocumentRecord({ sourceType: "google" }) as never
    );
    expect(await findDocumentFileMetaVisibleTo("x", "VN", "vn-co")).toBeNull();
  });

  it("ById: IDだけで取得しselectにdataUrlを含めない", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(
      baseDocumentRecord({ status: "draft" }) as never
    );
    expect(await findDocumentFileMetaById("doc-1")).toEqual({ id: "document-1", fileName: "test.pdf" });
    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      select: { id: true, sourceType: true, fileName: true },
    });
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(null);
    expect(await findDocumentFileMetaById("x")).toBeNull();
  });
});

describe("getDocumentFileStats", () => {
  it("DB側集計の結果を数値に変換して返す（bigintも許容）", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        head: "data:application/pdf;base64,AA",
        clean_length: BigInt(8),
        clean_tail: "A=",
        first_pad: BigInt(8),
      },
    ] as never);
    expect(await getDocumentFileStats("doc-1")).toEqual({
      head: "data:application/pdf;base64,AA",
      cleanLength: 8,
      cleanTail: "A=",
      firstPad: 8,
    });
  });

  it("行がない（dataUrlなし・存在しない）場合はnull", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    expect(await getDocumentFileStats("x")).toBeNull();
  });
});
