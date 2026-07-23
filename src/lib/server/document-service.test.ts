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
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  DocumentNotFoundError,
  createDocumentRecord,
  deleteDocumentRecord,
  findDocumentById,
  findDocumentVisibleTo,
  listAllDocuments,
  listDocumentsVisibleTo,
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
