import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    manual: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  ManualNotFoundError,
  createManualRecord,
  deleteManualRecord,
  findManualById,
  listAllManuals,
  listManualsVisibleTo,
  updateManualRecord,
} from "@/lib/server/manual-service";

function baseManualRecord(
  overrides: Partial<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    year: number;
    month: number;
    sourceType: "upload" | "google";
    fileName: string | null;
    fileType: string | null;
    fileSize: number | null;
    dataUrl: string | null;
    googleUrl: string | null;
    googleEmbedUrl: string | null;
    targetingScope: "all" | "countries" | "companies";
    targetingCountries: string[];
    targetingCompanyCodes: string[];
    translations: { locale: string; title: string; description: string | null }[];
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: "manual-1",
    title: "タイトル",
    description: null,
    category: "storeOperations",
    year: 2026,
    month: 9,
    sourceType: "upload" as const,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    googleUrl: null,
    googleEmbedUrl: null,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingCompanyCodes: [] as string[],
    translations: [] as { locale: string; title: string; description: string | null }[],
    createdAt: new Date("2026-07-01T09:00:00.000Z"),
    updatedAt: new Date("2026-07-01T09:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listManualsVisibleTo", () => {
  it("年月降順で取得し、全体公開・国・会社コードのOR条件をクエリに含む", async () => {
    vi.mocked(prisma.manual.findMany).mockResolvedValue([
      baseManualRecord({ id: "1" }),
    ] as never);

    const result = await listManualsVisibleTo("VN", "vn-daiso-vietnam");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(prisma.manual.findMany).toHaveBeenCalledWith(
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

  it("破損レコード（データ不整合）はスキップし、残りは正常に返す", async () => {
    vi.mocked(prisma.manual.findMany).mockResolvedValue([
      baseManualRecord({ id: "1", dataUrl: null }),
      baseManualRecord({ id: "2" }),
    ] as never);

    const result = await listManualsVisibleTo("VN", "vn-daiso-vietnam");

    expect(result.map((item) => item.id)).toEqual(["2"]);
  });
});

describe("listAllManuals / findManualById", () => {
  it("絞り込みなしで全件を取得する", async () => {
    vi.mocked(prisma.manual.findMany).mockResolvedValue([
      baseManualRecord({ id: "1" }),
      baseManualRecord({ id: "2" }),
    ] as never);

    const result = await listAllManuals();

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
    const callArgs = vi.mocked(prisma.manual.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where).toBeUndefined();
  });

  it("存在しないIDはnullを返す", async () => {
    vi.mocked(prisma.manual.findUnique).mockResolvedValue(null);

    const result = await findManualById("missing");

    expect(result).toBeNull();
  });

  it("sourceType: googleのレコードをGoogle型のManualへマッピングする", async () => {
    vi.mocked(prisma.manual.findUnique).mockResolvedValue(
      baseManualRecord({
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

    const result = await findManualById("2");

    expect(result?.sourceType).toBe("google");
    if (result?.sourceType === "google") {
      expect(result.googleUrl).toBe("https://docs.google.com/document/d/abc123/edit");
      expect(result.googleEmbedUrl).toBe(
        "https://docs.google.com/document/d/abc123/preview"
      );
    }
    expect(result && "fileName" in result).toBe(false);
  });
});

describe("createManualRecord / updateManualRecord / deleteManualRecord", () => {
  it("targetingを列に変換して作成する", async () => {
    vi.mocked(prisma.manual.create).mockResolvedValue(
      baseManualRecord({
        id: "1",
        targetingScope: "companies",
        targetingCompanyCodes: ["jp-daiso-japan-trading"],
      }) as never
    );

    const result = await createManualRecord({
      sourceType: "upload",
      title: "タイトル",
      category: "storeOperations",
      year: 2026,
      month: 9,
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "companies", companyCodes: ["jp-daiso-japan-trading"] },
      translations: [],
    });

    expect(prisma.manual.create).toHaveBeenCalledWith(
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
    vi.mocked(prisma.manual.create).mockResolvedValue(
      baseManualRecord({
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

    const result = await createManualRecord({
      sourceType: "google",
      title: "Googleマニュアル",
      category: "accounting",
      year: 2026,
      month: 9,
      googleUrl: "https://docs.google.com/document/d/abc123/edit",
      googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      targeting: { scope: "all" },
      translations: [],
    });

    expect(prisma.manual.create).toHaveBeenCalledWith(
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
  });

  it("createManualRecordはtranslationsを`create`のみ（deleteManyなし）のネスト書き込みで保存する", async () => {
    vi.mocked(prisma.manual.create).mockResolvedValue(
      baseManualRecord({ id: "1" }) as never
    );

    await createManualRecord({
      sourceType: "upload",
      title: "タイトル",
      category: "storeOperations",
      year: 2026,
      month: 9,
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [{ locale: "en", title: "Title" }],
    });

    expect(prisma.manual.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            create: [{ locale: "en", title: "Title", description: undefined }],
          },
        }),
      })
    );
  });

  it("updateManualRecordはtranslationsを`deleteMany`+`create`（全置換）のネスト書き込みで保存する", async () => {
    vi.mocked(prisma.manual.update).mockResolvedValue(
      baseManualRecord({ id: "1" }) as never
    );

    await updateManualRecord("1", {
      sourceType: "upload",
      title: "タイトル",
      category: "storeOperations",
      year: 2026,
      month: 9,
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      dataUrl: "data:application/pdf;base64,AAAA",
      targeting: { scope: "all" },
      translations: [{ locale: "en", title: "Title" }],
    });

    expect(prisma.manual.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            deleteMany: {},
            create: [{ locale: "en", title: "Title", description: undefined }],
          },
        }),
      })
    );
  });

  it("存在しないIDの更新はManualNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.manual.update).mockRejectedValue(new Error("not found"));

    await expect(
      updateManualRecord("missing", {
        sourceType: "upload",
        title: "t",
        category: "storeOperations",
        year: 2026,
        month: 9,
        fileName: "t.pdf",
        fileType: "application/pdf",
        fileSize: 1,
        dataUrl: "data:application/pdf;base64,AAAA",
        targeting: { scope: "all" },
        translations: [],
      })
    ).rejects.toThrow(ManualNotFoundError);
  });

  it("存在しないIDの削除はManualNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.manual.delete).mockRejectedValue(new Error("not found"));

    await expect(deleteManualRecord("missing")).rejects.toThrow(ManualNotFoundError);
  });

  it("削除は単純なdeleteのみを呼ぶ", async () => {
    vi.mocked(prisma.manual.delete).mockResolvedValue(
      baseManualRecord({ id: "1" }) as never
    );

    await deleteManualRecord("1");

    expect(prisma.manual.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});
