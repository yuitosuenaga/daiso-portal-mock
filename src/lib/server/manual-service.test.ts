import { describe, expect, it, vi, beforeEach } from "vitest";

import { Prisma } from "@prisma/client";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("prisma error", {
    code,
    clientVersion: "test",
  });
}

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    manual: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  ManualNotFoundError,
  createManualRecord,
  deleteManualRecord,
  findManualById,
  findManualFileById,
  findManualFileMetaById,
  findManualFileMetaVisibleTo,
  findManualFileVisibleTo,
  getManualFileStats,
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
      baseManualRecord({ id: "1", fileName: null }),
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
    vi.mocked(prisma.manual.update).mockRejectedValue(prismaError("P2025"));

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

  it.each([
    ["P2003", prismaError("P2003")],
    ["接続断", new Error("connection lost")],
  ])("更新でP2025以外(%s)はNotFoundに変換せず元の例外を送出する", async (_label, err) => {
    vi.mocked(prisma.manual.update).mockRejectedValue(err);

    await expect(
      updateManualRecord("1", {
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
    ).rejects.toBe(err);
  });

  it.each([
    ["P2003", prismaError("P2003")],
    ["接続断", new Error("connection lost")],
  ])("削除でP2025以外(%s)はNotFoundに変換せず元の例外を送出する", async (_label, err) => {
    vi.mocked(prisma.manual.delete).mockRejectedValue(err);

    await expect(deleteManualRecord("1")).rejects.toBe(err);
  });

  it("存在しないIDの削除はManualNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.manual.delete).mockRejectedValue(prismaError("P2025"));

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

function selectArg(mock: unknown): Record<string, unknown> {
  const calls = (mock as { mock: { calls: unknown[][] } }).mock.calls;
  const arg = calls[0]?.[0] as { select?: Record<string, unknown> } | undefined;
  expect(arg?.select).toBeDefined();
  return arg?.select as Record<string, unknown>;
}

const UPLOAD_INPUT = {
  sourceType: "upload" as const,
  title: "t",
  category: "storeOperations" as const,
  year: 2026,
  month: 9,
  fileName: "t.pdf",
  fileType: "application/pdf" as const,
  fileSize: 1,
  dataUrl: "data:application/pdf;base64,AAAA",
  targeting: { scope: "all" as const },
  translations: [],
};

const VISIBLE_WHERE = {
  OR: [
    { targetingScope: "all" },
    { targetingScope: "countries", targetingCountries: { has: "VN" } },
    { targetingScope: "companies", targetingCompanyCodes: { has: "vn-co" } },
  ],
};

describe("一覧・保存系はファイル本体(dataUrl)を読まず、返さない", () => {
  it("listManualsVisibleToはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.manual.findMany).mockResolvedValue([baseManualRecord({ id: "1" })] as never);

    const result = await listManualsVisibleTo("VN", "vn");

    const select = selectArg(prisma.manual.findMany);
    expect(select).not.toHaveProperty("dataUrl");
    expect(select).toHaveProperty("translations");
    expect(vi.mocked(prisma.manual.findMany).mock.calls[0]?.[0]).not.toHaveProperty("include");
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("listAllManualsはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.manual.findMany).mockResolvedValue([baseManualRecord({ id: "1" })] as never);

    const result = await listAllManuals();

    expect(selectArg(prisma.manual.findMany)).not.toHaveProperty("dataUrl");
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("createManualRecordはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.manual.create).mockResolvedValue(baseManualRecord({ id: "1" }) as never);

    const result = await createManualRecord(UPLOAD_INPUT);

    expect(selectArg(prisma.manual.create)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });

  it("updateManualRecordはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.manual.update).mockResolvedValue(baseManualRecord({ id: "1" }) as never);

    const result = await updateManualRecord("1", UPLOAD_INPUT);

    expect(selectArg(prisma.manual.update)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });
});

describe("findManualFileVisibleTo", () => {
  it("可視性述語を再利用したwhereと、ファイル用selectで1件取得する", async () => {
    vi.mocked(prisma.manual.findFirst).mockResolvedValue(baseManualRecord() as never);

    const result = await findManualFileVisibleTo("manual-1", "VN", "vn-co");

    expect(prisma.manual.findFirst).toHaveBeenCalledWith({
      where: { id: "manual-1", ...VISIBLE_WHERE },
      select: { sourceType: true, fileName: true, fileType: true, dataUrl: true },
    });
    expect(result).toEqual({ fileName: "test.pdf", dataUrl: "data:application/pdf;base64,AAAA" });
  });

  it("存在しない・google型・dataUrlなしはnull", async () => {
    vi.mocked(prisma.manual.findFirst).mockResolvedValueOnce(null);
    expect(await findManualFileVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.manual.findFirst).mockResolvedValueOnce(
      baseManualRecord({ sourceType: "google", dataUrl: null, fileName: null }) as never
    );
    expect(await findManualFileVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.manual.findFirst).mockResolvedValueOnce(
      baseManualRecord({ dataUrl: null }) as never
    );
    expect(await findManualFileVisibleTo("x", "VN", "vn-co")).toBeNull();
  });
});

describe("findManualFileById", () => {
  it("公開範囲で絞らずIDだけで取得する", async () => {
    vi.mocked(prisma.manual.findUnique).mockResolvedValue(baseManualRecord() as never);

    const result = await findManualFileById("manual-1");

    expect(prisma.manual.findUnique).toHaveBeenCalledWith({
      where: { id: "manual-1" },
      select: { sourceType: true, fileName: true, fileType: true, dataUrl: true },
    });
    expect(result).toEqual({ fileName: "test.pdf", dataUrl: "data:application/pdf;base64,AAAA" });
  });

  it("存在しない・google型・dataUrlなしはnull", async () => {
    vi.mocked(prisma.manual.findUnique).mockResolvedValueOnce(null);
    expect(await findManualFileById("x")).toBeNull();
    vi.mocked(prisma.manual.findUnique).mockResolvedValueOnce(
      baseManualRecord({ sourceType: "google", dataUrl: null }) as never
    );
    expect(await findManualFileById("x")).toBeNull();
    vi.mocked(prisma.manual.findUnique).mockResolvedValueOnce(
      baseManualRecord({ dataUrl: null }) as never
    );
    expect(await findManualFileById("x")).toBeNull();
  });
});

describe("findManualFileMetaVisibleTo / ById（本体を読まない認可確認）", () => {
  it("可視性述語を再利用し、selectにdataUrlを含めない", async () => {
    vi.mocked(prisma.manual.findFirst).mockResolvedValue(baseManualRecord() as never);

    const result = await findManualFileMetaVisibleTo("manual-1", "VN", "vn-co");

    expect(prisma.manual.findFirst).toHaveBeenCalledWith({
      where: { id: "manual-1", ...VISIBLE_WHERE },
      select: { id: true, sourceType: true, fileName: true },
    });
    expect(result).toEqual({ id: "manual-1", fileName: "test.pdf" });
  });

  it("存在しない・google型はnull", async () => {
    vi.mocked(prisma.manual.findFirst).mockResolvedValueOnce(null);
    expect(await findManualFileMetaVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.manual.findFirst).mockResolvedValueOnce(
      baseManualRecord({ sourceType: "google" }) as never
    );
    expect(await findManualFileMetaVisibleTo("x", "VN", "vn-co")).toBeNull();
  });

  it("ById: IDだけで取得しselectにdataUrlを含めない", async () => {
    vi.mocked(prisma.manual.findUnique).mockResolvedValue(baseManualRecord() as never);
    expect(await findManualFileMetaById("manual-1")).toEqual({ id: "manual-1", fileName: "test.pdf" });
    expect(prisma.manual.findUnique).toHaveBeenCalledWith({
      where: { id: "manual-1" },
      select: { id: true, sourceType: true, fileName: true },
    });
    vi.mocked(prisma.manual.findUnique).mockResolvedValueOnce(null);
    expect(await findManualFileMetaById("x")).toBeNull();
  });
});

describe("getManualFileStats", () => {
  it("DB側集計の結果を数値に変換して返す（bigintも許容）", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        head: "data:application/pdf;base64,AA",
        clean_length: BigInt(8),
        clean_tail: "A=",
        first_pad: BigInt(8),
      },
    ] as never);
    expect(await getManualFileStats("manual-1")).toEqual({
      head: "data:application/pdf;base64,AA",
      cleanLength: 8,
      cleanTail: "A=",
      firstPad: 8,
    });
  });

  it("行がない（dataUrlなし・存在しない）場合はnull", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    expect(await getManualFileStats("x")).toBeNull();
  });

  it("Manualテーブルに対するタグ付きテンプレートで集計し、IDはパラメータ化される", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    await getManualFileStats("m'; DROP TABLE x;--");
    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(sql.sql).toContain('FROM "Manual"');
    expect(sql.sql).not.toContain("DROP TABLE");
    expect(sql.values).toContain("m'; DROP TABLE x;--");
  });
});
