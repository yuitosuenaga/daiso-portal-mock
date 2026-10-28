import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/monthly-materials", () => ({
  createMonthlyMaterial: vi.fn(),
  updateMonthlyMaterial: vi.fn(),
  deleteMonthlyMaterial: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createMonthlyMaterial,
  deleteMonthlyMaterial,
  updateMonthlyMaterial,
} from "@/lib/api/monthly-materials";
import {
  createMonthlyMaterialAction,
  deleteMonthlyMaterialAction,
  updateMonthlyMaterialAction,
} from "@/lib/actions/monthly-materials";
import type { CreateMonthlyMaterialInput, MonthlyMaterial } from "@/types/monthly-material";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildInput(
  overrides: Partial<CreateMonthlyMaterialInput> = {}
): CreateMonthlyMaterialInput {
  return {
    category: "salesFloorMeeting",
    department: "other",
    year: 2026,
    month: 9,
    sourceType: "upload",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    ...overrides,
  } as CreateMonthlyMaterialInput;
}

function buildGoogleInput(
  overrides: Partial<CreateMonthlyMaterialInput> = {}
): CreateMonthlyMaterialInput {
  return {
    category: "pop",
    department: "other",
    year: 2026,
    month: 9,
    sourceType: "google",
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/should-be-ignored/preview",
    targeting: { scope: "all" },
    ...overrides,
  } as CreateMonthlyMaterialInput;
}

function monthlyMaterial(overrides: Partial<MonthlyMaterial> = {}): MonthlyMaterial {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting",
    department: "other",
    year: 2026,
    month: 9,
    sourceType: "upload",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  } as MonthlyMaterial;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createMonthlyMaterialAction", () => {
  it("有効な入力で資料を作成し、ルートを再検証する", async () => {
    vi.mocked(createMonthlyMaterial).mockResolvedValue(monthlyMaterial());

    const result = await createMonthlyMaterialAction(buildInput());

    expect(createMonthlyMaterial).toHaveBeenCalled();
    expect(result.id).toBe("monthly-material-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("月が範囲外の不正な入力は例外になり、保存されない", async () => {
    await expect(createMonthlyMaterialAction(buildInput({ month: 13 }))).rejects.toThrow();

    expect(createMonthlyMaterial).not.toHaveBeenCalled();
  });

  it("公開範囲を国指定にしたのに0件の不正な入力は例外になる", async () => {
    await expect(
      createMonthlyMaterialAction(
        buildInput({ targeting: { scope: "countries", countries: [] } })
      )
    ).rejects.toThrow();

    expect(createMonthlyMaterial).not.toHaveBeenCalled();
  });

  it("PDF以外のファイル形式の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      fileType: "image/png",
    } as unknown as CreateMonthlyMaterialInput;

    await expect(createMonthlyMaterialAction(invalidInput)).rejects.toThrow();

    expect(createMonthlyMaterial).not.toHaveBeenCalled();
  });

  it("Googleリンクの有効な入力で作成し、googleEmbedUrlをgoogleUrlからサーバー側で再計算する", async () => {
    vi.mocked(createMonthlyMaterial).mockResolvedValue(
      monthlyMaterial({
        category: "pop",
        sourceType: "google",
        fileName: undefined,
        fileType: undefined,
        fileSize: undefined,
        dataUrl: undefined,
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      } as unknown as Partial<MonthlyMaterial>)
    );

    await createMonthlyMaterialAction(buildGoogleInput());

    expect(createMonthlyMaterial).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "google",
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      })
    );
  });

  it("Googleリンクが無効な形式の場合は例外になり、保存されない", async () => {
    await expect(
      createMonthlyMaterialAction(
        buildGoogleInput({ googleUrl: "https://example.com/not-google" })
      )
    ).rejects.toThrow();

    expect(createMonthlyMaterial).not.toHaveBeenCalled();
  });
});

describe("updateMonthlyMaterialAction / deleteMonthlyMaterialAction", () => {
  it("既存の資料を更新し、ルートを再検証する", async () => {
    vi.mocked(updateMonthlyMaterial).mockResolvedValue(monthlyMaterial({ month: 10 }));

    const result = await updateMonthlyMaterialAction(
      "monthly-material-1",
      buildInput({ month: 10 })
    );

    expect(updateMonthlyMaterial).toHaveBeenCalledWith(
      "monthly-material-1",
      expect.objectContaining({ month: 10 })
    );
    expect(result.month).toBe(10);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("Google共有リンク資料の更新時もgoogleEmbedUrlをgoogleUrlから再計算する", async () => {
    vi.mocked(updateMonthlyMaterial).mockResolvedValue(
      monthlyMaterial({ category: "pop", sourceType: "google" } as unknown as Partial<MonthlyMaterial>)
    );

    await updateMonthlyMaterialAction(
      "monthly-material-1",
      buildGoogleInput({
        googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
      })
    );

    expect(updateMonthlyMaterial).toHaveBeenCalledWith(
      "monthly-material-1",
      expect.objectContaining({
        googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
        googleEmbedUrl: "https://docs.google.com/spreadsheets/d/xyz789/preview",
      })
    );
  });

  it("ファイルを差し替えない更新（dataUrlなし）を許可し、dataUrlなしのままサービスへ渡す", async () => {
    vi.mocked(updateMonthlyMaterial).mockResolvedValue(monthlyMaterial({ month: 10 }));
    const input = buildInput({ month: 10 }) as unknown as Record<string, unknown>;
    delete input.dataUrl;

    await updateMonthlyMaterialAction(
      "monthly-material-1",
      input as unknown as CreateMonthlyMaterialInput
    );

    const passed = vi.mocked(updateMonthlyMaterial).mock.calls[0]![1] as { dataUrl?: string };
    expect(passed.dataUrl).toBeUndefined();
    expect(updateMonthlyMaterial).toHaveBeenCalledWith(
      "monthly-material-1",
      expect.objectContaining({ month: 10, sourceType: "upload" })
    );
  });

  it("更新でもdataUrlを指定する場合は検証し、PDF以外は例外になり保存されない", async () => {
    await expect(
      updateMonthlyMaterialAction(
        "monthly-material-1",
        buildInput({ dataUrl: "data:image/png;base64,AAAA" } as Partial<CreateMonthlyMaterialInput>)
      )
    ).rejects.toThrow();
    expect(updateMonthlyMaterial).not.toHaveBeenCalled();
  });

  it("更新でも年月などの不正な入力は例外になり保存されない", async () => {
    const input = buildInput({ month: 13 }) as unknown as Record<string, unknown>;
    delete input.dataUrl;
    await expect(
      updateMonthlyMaterialAction("monthly-material-1", input as unknown as CreateMonthlyMaterialInput)
    ).rejects.toThrow();
    expect(updateMonthlyMaterial).not.toHaveBeenCalled();
  });

  it("既存の資料を削除し、ルートを再検証する", async () => {
    vi.mocked(deleteMonthlyMaterial).mockResolvedValue(undefined);

    await deleteMonthlyMaterialAction("monthly-material-1", "salesFloorMeeting");

    expect(deleteMonthlyMaterial).toHaveBeenCalledWith("monthly-material-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});
