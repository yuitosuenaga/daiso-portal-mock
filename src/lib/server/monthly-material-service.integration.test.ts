// 実PostgreSQLでの月次資料の更新（ファイル保持更新・登録方式の切替）の統合テスト。
// updateMonthlyMaterialRecord の updateMany の where 条件（sourceType / dataUrl not null）と
// ファイル列に触れないことを、モックではなく実DBで固定する。
// MONTHLY_MATERIAL_TEST_DATABASE_URL（使い捨てローカルDB。マイグレーション適用済み）がある時のみ実行する。
// 他の統合テスト（helpdesk-staff-service は helpdeskStaff.deleteMany({}) する）と干渉しないよう、
// CI と同じく --no-file-parallelism で実行すること。後片付けは本テストが作った id だけを削除する。
// 例: docker run -d --rm --name monthly-it -e POSTGRES_PASSWORD=test -p 127.0.0.1:5597:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@127.0.0.1:5597/postgres npx prisma migrate deploy
//     MONTHLY_MATERIAL_TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:5597/postgres \
//       npx vitest run integration --no-file-parallelism
//     docker rm -f monthly-it
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.MONTHLY_MATERIAL_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

// next-auth を読み込む import があっても落ちないよう、認可は本テストの対象外としてモックする。
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskAdminSession: vi.fn(),
  requireHelpdeskStaffSession: vi.fn(),
}));

import {
  createMonthlyMaterialRecord,
  deleteMonthlyMaterialRecord,
  MonthlyMaterialNotFoundError,
  updateMonthlyMaterialRecord,
} from "@/lib/server/monthly-material-service";
import type {
  CreateMonthlyMaterialInput,
  UpdateMonthlyMaterialInput,
} from "@/types/monthly-material";

const DATA_URL_A = "data:application/pdf;base64,QUFBQQ==";
const DATA_URL_B = "data:application/pdf;base64,QkJCQkJC";

function uploadInput(
  overrides: Partial<Extract<CreateMonthlyMaterialInput, { sourceType: "upload" }>> = {}
): Extract<CreateMonthlyMaterialInput, { sourceType: "upload" }> {
  return {
    sourceType: "upload",
    category: "salesFloorMeeting",
    department: "kitchen",
    year: 2026,
    month: 4,
    fileName: "a.pdf",
    fileType: "application/pdf",
    fileSize: 4,
    dataUrl: DATA_URL_A,
    targeting: { scope: "all" },
    ...overrides,
  };
}

function googleInput(): Extract<CreateMonthlyMaterialInput, { sourceType: "google" }> {
  return {
    sourceType: "google",
    category: "salesFloorMeeting",
    department: "kitchen",
    year: 2026,
    month: 4,
    googleUrl: "https://docs.google.com/document/d/abc/edit",
    googleEmbedUrl: "https://docs.google.com/document/d/abc/preview",
    targeting: { scope: "all" },
  };
}

describe.skipIf(!url)("月次資料の更新（実DB）", () => {
  const createdIds: string[] = [];

  async function create(input: CreateMonthlyMaterialInput): Promise<string> {
    const summary = await createMonthlyMaterialRecord(input);
    createdIds.push(summary.id);
    return summary.id;
  }

  async function raw(id: string) {
    const rows = await testPrisma!.$queryRaw<
      Array<{
        sourceType: string;
        fileName: string | null;
        fileType: string | null;
        fileSize: number | null;
        dataUrl: string | null;
        dataUrlMd5: string | null;
        googleUrl: string | null;
        googleEmbedUrl: string | null;
        updatedAt: Date;
        year: number;
        month: number;
        targetingScope: string;
        targetingCountries: string[];
      }>
    >`SELECT "sourceType"::text AS "sourceType", "fileName", "fileType", "fileSize", "dataUrl",
        md5("dataUrl") AS "dataUrlMd5", "googleUrl", "googleEmbedUrl", "updatedAt", "year", "month",
        "targetingScope"::text AS "targetingScope", "targetingCountries"
      FROM "MonthlyMaterial" WHERE "id" = ${id}`;
    return rows[0];
  }

  afterEach(async () => {
    if (createdIds.length > 0) {
      await testPrisma!.monthlyMaterial.deleteMany({ where: { id: { in: createdIds } } });
      createdIds.length = 0;
    }
  });

  afterAll(async () => {
    await testPrisma?.$disconnect();
  });

  it("(a) uploadの行をファイル無しで更新すると、ファイル列は不変でupdatedAtと年月・公開範囲が更新される", async () => {
    const id = await create(uploadInput());
    const before = await raw(id);
    await new Promise((r) => setTimeout(r, 20));

    const input: UpdateMonthlyMaterialInput = {
      ...uploadInput({ year: 2027, month: 9, targeting: { scope: "countries", countries: ["US"] } }),
      dataUrl: undefined,
    };
    const result = await updateMonthlyMaterialRecord(id, input);
    expect(result.year).toBe(2027);
    expect(result.targeting).toEqual({ scope: "countries", countries: ["US"] });

    const after = await raw(id);
    expect(after.dataUrlMd5).toBe(before.dataUrlMd5);
    expect(after.dataUrl).toBe(DATA_URL_A);
    expect(after.fileName).toBe("a.pdf");
    expect(after.fileType).toBe("application/pdf");
    expect(after.fileSize).toBe(4);
    expect(after.sourceType).toBe("upload");
    expect(after.year).toBe(2027);
    expect(after.month).toBe(9);
    expect(after.targetingScope).toBe("countries");
    expect(after.targetingCountries).toEqual(["US"]);
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it("(b) googleの行へのdataUrl無しのupload更新はNotFoundで、行は変化しない", async () => {
    const id = await create(googleInput());
    const before = await raw(id);

    await expect(
      updateMonthlyMaterialRecord(id, { ...uploadInput({ year: 2030 }), dataUrl: undefined })
    ).rejects.toBeInstanceOf(MonthlyMaterialNotFoundError);

    const after = await raw(id);
    expect(after.sourceType).toBe("google");
    expect(after.dataUrl).toBeNull();
    expect(after.year).toBe(before.year);
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it("(c) upload→googleでファイル列がnullになり、google列が設定される", async () => {
    const id = await create(uploadInput());
    await updateMonthlyMaterialRecord(id, googleInput());

    const after = await raw(id);
    expect(after.sourceType).toBe("google");
    expect(after.fileName).toBeNull();
    expect(after.fileType).toBeNull();
    expect(after.fileSize).toBeNull();
    expect(after.dataUrl).toBeNull();
    expect(after.googleUrl).toBe("https://docs.google.com/document/d/abc/edit");
    expect(after.googleEmbedUrl).toBe("https://docs.google.com/document/d/abc/preview");
  });

  it("(d) 存在しないid（更新直前に削除された場合を含む）はNotFound", async () => {
    const id = await create(uploadInput());
    await deleteMonthlyMaterialRecord(id);

    await expect(
      updateMonthlyMaterialRecord(id, { ...uploadInput(), dataUrl: undefined })
    ).rejects.toBeInstanceOf(MonthlyMaterialNotFoundError);
    await expect(updateMonthlyMaterialRecord(id, uploadInput())).rejects.toBeInstanceOf(
      MonthlyMaterialNotFoundError
    );
  });

  it("(e) ファイル保持更新ではクライアントが渡すfileName/fileType/fileSizeは無視される", async () => {
    const id = await create(uploadInput());
    await updateMonthlyMaterialRecord(id, {
      ...uploadInput({ fileName: "evil.pdf", fileSize: 999999 }),
      dataUrl: undefined,
    });

    const after = await raw(id);
    expect(after.fileName).toBe("a.pdf");
    expect(after.fileSize).toBe(4);
    expect(after.fileType).toBe("application/pdf");
    expect(after.dataUrl).toBe(DATA_URL_A);
  });

  it("(f) google→uploadはファイルありなら成功し、upload→uploadのファイル差し替えも反映される", async () => {
    const id = await create(googleInput());
    await updateMonthlyMaterialRecord(
      id,
      uploadInput({ fileName: "b.pdf", fileSize: 6, dataUrl: DATA_URL_B })
    );
    const afterSwitch = await raw(id);
    expect(afterSwitch.sourceType).toBe("upload");
    expect(afterSwitch.dataUrl).toBe(DATA_URL_B);
    expect(afterSwitch.fileName).toBe("b.pdf");
    expect(afterSwitch.fileSize).toBe(6);
    expect(afterSwitch.googleUrl).toBeNull();
    expect(afterSwitch.googleEmbedUrl).toBeNull();

    await updateMonthlyMaterialRecord(
      id,
      uploadInput({ fileName: "c.pdf", fileSize: 4, dataUrl: DATA_URL_A })
    );
    const afterReplace = await raw(id);
    expect(afterReplace.dataUrl).toBe(DATA_URL_A);
    expect(afterReplace.fileName).toBe("c.pdf");
    expect(afterReplace.fileSize).toBe(4);
  });

  // where条件の2つ（sourceType / dataUrl not null）はそれぞれ単独でも守れるよう、通常のAPIでは作れない
  // 不整合行を直接投入し、どちらの条件が欠けても落ちることを固定する。
  it("(g) sourceTypeがgoogleだがdataUrlを持つ不整合行は、ファイル保持更新の対象にならない", async () => {
    const row = await testPrisma!.monthlyMaterial.create({
      data: {
        category: "salesFloorMeeting",
        year: 2026,
        month: 4,
        sourceType: "google",
        googleUrl: "https://docs.google.com/document/d/x/edit",
        googleEmbedUrl: "https://docs.google.com/document/d/x/preview",
        dataUrl: DATA_URL_A,
      },
    });
    createdIds.push(row.id);
    await expect(
      updateMonthlyMaterialRecord(row.id, { ...uploadInput({ year: 2031 }), dataUrl: undefined })
    ).rejects.toBeInstanceOf(MonthlyMaterialNotFoundError);
    expect((await raw(row.id)).year).toBe(2026);
  });

  it("(h) sourceTypeがuploadでもdataUrlがnullの不整合行は、ファイル保持更新の対象にならない", async () => {
    const row = await testPrisma!.monthlyMaterial.create({
      data: { category: "salesFloorMeeting", year: 2026, month: 4, sourceType: "upload" },
    });
    createdIds.push(row.id);
    await expect(
      updateMonthlyMaterialRecord(row.id, { ...uploadInput({ year: 2031 }), dataUrl: undefined })
    ).rejects.toBeInstanceOf(MonthlyMaterialNotFoundError);
    expect((await raw(row.id)).year).toBe(2026);
  });
});
