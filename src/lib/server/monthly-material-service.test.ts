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
    monthlyMaterial: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  MonthlyMaterialNotFoundError,
  createMonthlyMaterialRecord,
  deleteMonthlyMaterialRecord,
  findMonthlyMaterialFileById,
  findMonthlyMaterialFileMetaById,
  findMonthlyMaterialFileMetaVisibleTo,
  findMonthlyMaterialFileVisibleTo,
  getMonthlyMaterialFileStats,
  listAllMonthlyMaterials,
  listMonthlyMaterialsVisibleTo,
  updateMonthlyMaterialRecord,
} from "@/lib/server/monthly-material-service";
import { MONTHLY_MATERIAL_SUMMARY_SELECT } from "@/lib/server/monthly-material-mapper";
import type {
  CreateMonthlyMaterialInput,
  UpdateMonthlyMaterialInput,
} from "@/types/monthly-material";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting" as const,
    department: "seasonalEvent" as const,
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
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    updatedAt: new Date("2026-09-01T09:00:00.000Z"),
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<CreateMonthlyMaterialInput> = {}
): CreateMonthlyMaterialInput {
  return {
    category: "salesFloorMeeting",
    department: "seasonalEvent",
    year: 2026,
    month: 9,
    sourceType: "upload",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
    ...overrides,
  } as CreateMonthlyMaterialInput;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listMonthlyMaterialsVisibleTo", () => {
  it("年月の降順で取得し、カテゴリ・全体公開・国・会社コードのOR条件をクエリに含む", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([
      baseRecord({ id: "1" }),
    ] as never);

    const result = await listMonthlyMaterialsVisibleTo(
      "salesFloorMeeting",
      "VN",
      "vn-daiso-vietnam"
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(prisma.monthlyMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: "salesFloorMeeting",
          OR: [
            { targetingScope: "all" },
            { targetingScope: "countries", targetingCountries: { has: "VN" } },
            {
              targetingScope: "companies",
              targetingCompanyCodes: { has: "vn-daiso-vietnam" },
            },
          ],
        },
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "asc" }],
      })
    );
  });

  it("他カテゴリの資料を絞り込み条件に含めない（POPを指定した場合はcategory: popのみ）", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([] as never);

    await listMonthlyMaterialsVisibleTo("pop", "VN", "vn-daiso-vietnam");

    expect(prisma.monthlyMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: "pop" }) })
    );
  });

  it("データ不整合レコードが混入していても、そのレコードのみスキップし残りは返す", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([
      baseRecord({ id: "corrupted", sourceType: "google", googleUrl: null, googleEmbedUrl: null }),
      baseRecord({ id: "ok" }),
    ] as never);

    const result = await listMonthlyMaterialsVisibleTo(
      "salesFloorMeeting",
      "VN",
      "vn-daiso-vietnam"
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ok");
  });
});

describe("listAllMonthlyMaterials", () => {
  it("公開範囲による絞り込みを行わずカテゴリのみで全件取得する", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([
      baseRecord({ id: "1" }),
      baseRecord({ id: "2", year: 2026, month: 8 }),
    ] as never);

    const result = await listAllMonthlyMaterials("salesFloorMeeting");

    expect(result).toHaveLength(2);
    expect(prisma.monthlyMaterial.findMany).toHaveBeenCalledWith({
      where: { category: "salesFloorMeeting" },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "asc" }],
      select: MONTHLY_MATERIAL_SUMMARY_SELECT,
    });
  });

  it("データ不整合レコードが混入していても、そのレコードのみスキップし残りは返す", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([
      baseRecord({ id: "ok" }),
      baseRecord({ id: "corrupted", fileName: null, fileType: null, fileSize: null, dataUrl: null }),
    ] as never);

    const result = await listAllMonthlyMaterials("salesFloorMeeting");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ok");
  });
});

describe("createMonthlyMaterialRecord", () => {
  it("新規作成に成功した場合、作成されたレコードを返す", async () => {
    vi.mocked(prisma.monthlyMaterial.create).mockResolvedValue(baseRecord() as never);

    const result = await createMonthlyMaterialRecord(baseInput());

    expect(result.id).toBe("monthly-material-1");
  });

  it("同一カテゴリ×年月に既に資料が存在していても、別レコードとして作成できる", async () => {
    vi.mocked(prisma.monthlyMaterial.create).mockResolvedValue(
      baseRecord({ id: "monthly-material-2" }) as never
    );

    const result = await createMonthlyMaterialRecord(baseInput());

    expect(result.id).toBe("monthly-material-2");
  });

  it("入力のdepartmentを書き込みデータに含める", async () => {
    vi.mocked(prisma.monthlyMaterial.create).mockResolvedValue(baseRecord() as never);

    await createMonthlyMaterialRecord(baseInput({ department: "kitchen" }));

    expect(prisma.monthlyMaterial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ department: "kitchen" }),
      })
    );
  });
});

describe("updateMonthlyMaterialRecord", () => {
  it("更新に成功した場合、更新されたレコードを返す", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockResolvedValue(baseRecord() as never);

    const result = await updateMonthlyMaterialRecord("monthly-material-1", baseInput());

    expect(result.id).toBe("monthly-material-1");
  });

  it("対象が存在しない場合、MonthlyMaterialNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockRejectedValue(notFoundPrismaError());

    await expect(
      updateMonthlyMaterialRecord("missing", baseInput())
    ).rejects.toThrow(MonthlyMaterialNotFoundError);
  });

  it("入力のdepartmentを書き込みデータに含める", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockResolvedValue(baseRecord() as never);

    await updateMonthlyMaterialRecord(
      "monthly-material-1",
      baseInput({ department: "food" })
    );

    expect(prisma.monthlyMaterial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ department: "food" }),
      })
    );
  });
});

describe("deleteMonthlyMaterialRecord", () => {
  it("削除に成功した場合、例外を送出しない", async () => {
    vi.mocked(prisma.monthlyMaterial.delete).mockResolvedValue(baseRecord() as never);

    await expect(deleteMonthlyMaterialRecord("monthly-material-1")).resolves.toBeUndefined();
  });

  it("対象が存在しない場合、MonthlyMaterialNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.monthlyMaterial.delete).mockRejectedValue(notFoundPrismaError());

    await expect(deleteMonthlyMaterialRecord("missing")).rejects.toThrow(
      MonthlyMaterialNotFoundError
    );
  });
});

function selectArg(fn: unknown): Record<string, unknown> {
  const call = vi.mocked(fn as (...args: unknown[]) => unknown).mock.calls[0]?.[0] as {
    select?: Record<string, unknown>;
  };
  return call?.select ?? {};
}

const VISIBLE_WHERE = {
  OR: [
    { targetingScope: "all" },
    { targetingScope: "countries", targetingCountries: { has: "VN" } },
    { targetingScope: "companies", targetingCompanyCodes: { has: "vn-co" } },
  ],
};

describe("一覧・保存系はファイル本体(dataUrl)を読まず、返さない", () => {
  it("listMonthlyMaterialsVisibleToはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([baseRecord()] as never);

    const result = await listMonthlyMaterialsVisibleTo("salesFloorMeeting", "VN", "vn-co");

    expect(selectArg(prisma.monthlyMaterial.findMany)).not.toHaveProperty("dataUrl");
    expect(selectArg(prisma.monthlyMaterial.findMany)).toHaveProperty("fileName", true);
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("listAllMonthlyMaterialsはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.monthlyMaterial.findMany).mockResolvedValue([baseRecord()] as never);

    const result = await listAllMonthlyMaterials("pop");

    expect(selectArg(prisma.monthlyMaterial.findMany)).not.toHaveProperty("dataUrl");
    expect(result[0]).not.toHaveProperty("dataUrl");
  });

  it("createMonthlyMaterialRecordはselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.monthlyMaterial.create).mockResolvedValue(baseRecord() as never);

    const result = await createMonthlyMaterialRecord(baseInput());

    expect(selectArg(prisma.monthlyMaterial.create)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });

  it("updateMonthlyMaterialRecord（ファイル差し替え）はselectでdataUrlを除外し、結果にdataUrlを含まない", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockResolvedValue(baseRecord() as never);

    const result = await updateMonthlyMaterialRecord("monthly-material-1", baseInput());

    expect(selectArg(prisma.monthlyMaterial.update)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
  });
});

describe("updateMonthlyMaterialRecord: sourceType切替パターン", () => {
  const KEEP_FILE_INPUT = {
    category: "salesFloorMeeting",
    department: "food",
    year: 2027,
    month: 3,
    sourceType: "upload",
    // クライアントから来た値。ファイル保持の更新では無視されなければならない
    fileName: "evil.pdf",
    fileType: "application/pdf",
    fileSize: 999999,
    targeting: { scope: "countries", countries: ["VN"] },
  } as unknown as UpdateMonthlyMaterialInput;

  it("upload→upload（ファイル保持）: dataUrlなしならupdateManyでファイル系の列に触れず、where条件でupload型・本体ありに限定する", async () => {
    vi.mocked(prisma.monthlyMaterial.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValue(
      baseRecord({ year: 2027, month: 3 }) as never
    );

    const result = await updateMonthlyMaterialRecord("monthly-material-1", KEEP_FILE_INPUT);

    expect(prisma.monthlyMaterial.update).not.toHaveBeenCalled();
    const arg = vi.mocked(prisma.monthlyMaterial.updateMany).mock.calls[0]?.[0] as {
      where: unknown;
      data: Record<string, unknown>;
    };
    expect(arg.where).toEqual({
      id: "monthly-material-1",
      sourceType: "upload",
      dataUrl: { not: null },
    });
    expect(arg.data).toEqual({
      category: "salesFloorMeeting",
      department: "food",
      year: 2027,
      month: 3,
      targetingScope: "countries",
      targetingCountries: ["VN"],
      targetingCompanyCodes: [],
    });
    for (const key of [
      "sourceType",
      "fileName",
      "fileType",
      "fileSize",
      "dataUrl",
      "googleUrl",
      "googleEmbedUrl",
    ]) {
      expect(arg.data).not.toHaveProperty(key);
    }
    expect(selectArg(prisma.monthlyMaterial.findUnique)).not.toHaveProperty("dataUrl");
    expect(result).not.toHaveProperty("dataUrl");
    expect(result.year).toBe(2027);
  });

  it("upload→upload（ファイル保持）: 更新件数が0ならNotFound（google型からファイル無しでuploadへ切り替える操作を拒否）", async () => {
    vi.mocked(prisma.monthlyMaterial.updateMany).mockResolvedValue({ count: 0 });

    await expect(
      updateMonthlyMaterialRecord("monthly-material-1", KEEP_FILE_INPUT)
    ).rejects.toThrow(MonthlyMaterialNotFoundError);
    expect(prisma.monthlyMaterial.findUnique).not.toHaveBeenCalled();
    expect(prisma.monthlyMaterial.update).not.toHaveBeenCalled();
  });

  it("upload→upload（ファイル保持）: 更新直後に削除されていた場合もNotFound", async () => {
    vi.mocked(prisma.monthlyMaterial.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValue(null);

    await expect(
      updateMonthlyMaterialRecord("monthly-material-1", KEEP_FILE_INPUT)
    ).rejects.toThrow(MonthlyMaterialNotFoundError);
  });

  it("upload→upload（ファイル差し替え）: dataUrl付きは従来どおりupdateで全列を書く", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockResolvedValue(baseRecord() as never);

    await updateMonthlyMaterialRecord("monthly-material-1", baseInput({ department: "food" }));

    expect(prisma.monthlyMaterial.updateMany).not.toHaveBeenCalled();
    expect(prisma.monthlyMaterial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "monthly-material-1" },
        data: expect.objectContaining({
          sourceType: "upload",
          fileName: "test.pdf",
          dataUrl: "data:application/pdf;base64,AAAA",
          googleUrl: null,
          googleEmbedUrl: null,
        }),
      })
    );
  });

  it("upload→google / google→google: 従来どおりupdateでファイル系をnullにしGoogle列を書く", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockResolvedValue(
      baseRecord({
        sourceType: "google",
        fileName: null,
        fileType: null,
        fileSize: null,
        dataUrl: null,
        googleUrl: "https://docs.google.com/presentation/d/x/edit",
        googleEmbedUrl: "https://docs.google.com/presentation/d/x/embed",
      }) as never
    );

    await updateMonthlyMaterialRecord("monthly-material-1", {
      category: "salesFloorMeeting",
      department: "food",
      year: 2026,
      month: 9,
      sourceType: "google",
      googleUrl: "https://docs.google.com/presentation/d/x/edit",
      googleEmbedUrl: "https://docs.google.com/presentation/d/x/embed",
      targeting: { scope: "all" },
    });

    expect(prisma.monthlyMaterial.updateMany).not.toHaveBeenCalled();
    expect(prisma.monthlyMaterial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "google",
          fileName: null,
          fileType: null,
          fileSize: null,
          dataUrl: null,
          googleUrl: "https://docs.google.com/presentation/d/x/edit",
        }),
      })
    );
  });

  it("google→upload（新しいファイルを選択）: dataUrl付きなのでupdateでファイル列を書く", async () => {
    vi.mocked(prisma.monthlyMaterial.update).mockResolvedValue(baseRecord() as never);

    await updateMonthlyMaterialRecord("monthly-material-1", baseInput());

    expect(prisma.monthlyMaterial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceType: "upload", dataUrl: expect.any(String) }),
      })
    );
  });
});

describe("findMonthlyMaterialFileVisibleTo", () => {
  it("可視性述語を再利用したwhereと、ファイル用selectで1件取得する", async () => {
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValue(baseRecord() as never);

    const result = await findMonthlyMaterialFileVisibleTo("monthly-material-1", "VN", "vn-co");

    expect(prisma.monthlyMaterial.findFirst).toHaveBeenCalledWith({
      where: { id: "monthly-material-1", ...VISIBLE_WHERE },
      select: { sourceType: true, fileName: true, fileType: true, dataUrl: true },
    });
    expect(result).toEqual({ fileName: "test.pdf", dataUrl: "data:application/pdf;base64,AAAA" });
  });

  it("存在しない・google型・dataUrlなしはnull", async () => {
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValueOnce(null);
    expect(await findMonthlyMaterialFileVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValueOnce(
      baseRecord({ sourceType: "google", dataUrl: null, fileName: null }) as never
    );
    expect(await findMonthlyMaterialFileVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValueOnce(
      baseRecord({ dataUrl: null }) as never
    );
    expect(await findMonthlyMaterialFileVisibleTo("x", "VN", "vn-co")).toBeNull();
  });
});

describe("findMonthlyMaterialFileById", () => {
  it("公開範囲で絞らずIDだけで取得する", async () => {
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValue(baseRecord() as never);

    const result = await findMonthlyMaterialFileById("monthly-material-1");

    expect(prisma.monthlyMaterial.findUnique).toHaveBeenCalledWith({
      where: { id: "monthly-material-1" },
      select: { sourceType: true, fileName: true, fileType: true, dataUrl: true },
    });
    expect(result).toEqual({ fileName: "test.pdf", dataUrl: "data:application/pdf;base64,AAAA" });
  });

  it("存在しない・google型・dataUrlなしはnull", async () => {
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValueOnce(null);
    expect(await findMonthlyMaterialFileById("x")).toBeNull();
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValueOnce(
      baseRecord({ sourceType: "google", dataUrl: null }) as never
    );
    expect(await findMonthlyMaterialFileById("x")).toBeNull();
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValueOnce(
      baseRecord({ dataUrl: null }) as never
    );
    expect(await findMonthlyMaterialFileById("x")).toBeNull();
  });
});

describe("findMonthlyMaterialFileMetaVisibleTo / ById（本体を読まない認可確認）", () => {
  it("可視性述語を再利用し、selectにdataUrlを含めない", async () => {
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValue(baseRecord() as never);

    const result = await findMonthlyMaterialFileMetaVisibleTo("monthly-material-1", "VN", "vn-co");

    expect(prisma.monthlyMaterial.findFirst).toHaveBeenCalledWith({
      where: { id: "monthly-material-1", ...VISIBLE_WHERE },
      select: { id: true, sourceType: true, fileName: true },
    });
    expect(result).toEqual({ id: "monthly-material-1", fileName: "test.pdf" });
  });

  it("存在しない・google型はnull", async () => {
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValueOnce(null);
    expect(await findMonthlyMaterialFileMetaVisibleTo("x", "VN", "vn-co")).toBeNull();
    vi.mocked(prisma.monthlyMaterial.findFirst).mockResolvedValueOnce(
      baseRecord({ sourceType: "google" }) as never
    );
    expect(await findMonthlyMaterialFileMetaVisibleTo("x", "VN", "vn-co")).toBeNull();
  });

  it("ById: IDだけで取得しselectにdataUrlを含めない", async () => {
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValue(baseRecord() as never);
    expect(await findMonthlyMaterialFileMetaById("monthly-material-1")).toEqual({
      id: "monthly-material-1",
      fileName: "test.pdf",
    });
    expect(prisma.monthlyMaterial.findUnique).toHaveBeenCalledWith({
      where: { id: "monthly-material-1" },
      select: { id: true, sourceType: true, fileName: true },
    });
    vi.mocked(prisma.monthlyMaterial.findUnique).mockResolvedValueOnce(null);
    expect(await findMonthlyMaterialFileMetaById("x")).toBeNull();
  });
});

describe("getMonthlyMaterialFileStats", () => {
  it("DB側集計の結果を数値に変換して返す（bigintも許容）", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        head: "data:application/pdf;base64,AA",
        clean_length: BigInt(8),
        clean_tail: "A=",
        first_pad: BigInt(8),
      },
    ] as never);
    expect(await getMonthlyMaterialFileStats("monthly-material-1")).toEqual({
      head: "data:application/pdf;base64,AA",
      cleanLength: 8,
      cleanTail: "A=",
      firstPad: 8,
    });
  });

  it("行がない（dataUrlなし・存在しない）場合はnull", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    expect(await getMonthlyMaterialFileStats("x")).toBeNull();
  });

  it("MonthlyMaterialテーブルに対するタグ付きテンプレートで集計し、IDはパラメータ化される。本体は選択しない", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    await getMonthlyMaterialFileStats("m'; DROP TABLE x;--");
    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(sql.sql).toContain('FROM "MonthlyMaterial"');
    expect(sql.sql).not.toContain("DROP TABLE");
    expect(sql.values).toContain("m'; DROP TABLE x;--");
    // 本体（dataUrl）をそのまま返す列は無い（集計・先頭/末尾のみ）
    expect(sql.sql).not.toMatch(/SELECT\s+"dataUrl"/);
  });
});
