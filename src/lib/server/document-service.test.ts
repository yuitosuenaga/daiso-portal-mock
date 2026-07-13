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
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
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
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
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

  it("存在しないIDはnullを返す", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    const result = await findDocumentById("missing");

    expect(result).toBeNull();
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
      title: "タイトル",
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

  it("存在しないIDの更新はDocumentNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.document.update).mockRejectedValue(new Error("not found"));

    await expect(
      updateDocumentRecord("missing", {
        title: "t",
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
