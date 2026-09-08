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
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  MonthlyMaterialNotFoundError,
  createMonthlyMaterialRecord,
  deleteMonthlyMaterialRecord,
  listAllMonthlyMaterials,
  listMonthlyMaterialsVisibleTo,
  updateMonthlyMaterialRecord,
} from "@/lib/server/monthly-material-service";
import type { CreateMonthlyMaterialInput } from "@/types/monthly-material";

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting" as const,
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
