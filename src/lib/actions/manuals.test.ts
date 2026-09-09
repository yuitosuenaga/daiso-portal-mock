import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/manuals", () => ({
  createManual: vi.fn(),
  updateManual: vi.fn(),
  deleteManual: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createManual, deleteManual, updateManual } from "@/lib/api/manuals";
import {
  createManualAction,
  deleteManualAction,
  updateManualAction,
} from "@/lib/actions/manuals";
import type { CreateManualInput, Manual } from "@/types/manual";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildInput(overrides: Partial<CreateManualInput> = {}): CreateManualInput {
  return {
    sourceType: "upload",
    title: "アクション経由の新規作成",
    category: "storeOperations",
    year: 2026,
    month: 9,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    translations: [{ locale: "en", title: "New manual via action" }],
    ...overrides,
  } as CreateManualInput;
}

function buildGoogleInput(
  overrides: Partial<CreateManualInput> = {}
): CreateManualInput {
  return {
    sourceType: "google",
    title: "Google経由の新規作成",
    category: "accounting",
    year: 2026,
    month: 9,
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/should-be-ignored/preview",
    targeting: { scope: "all" },
    translations: [{ locale: "en", title: "New manual via Google link" }],
    ...overrides,
  } as CreateManualInput;
}

function manual(overrides: Partial<Manual> = {}): Manual {
  return {
    id: "manual-1",
    title: "タイトル",
    sourceType: "upload",
    category: "storeOperations",
    year: 2026,
    month: 9,
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    translations: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as Manual;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createManualAction", () => {
  it("有効な入力でマニュアルを作成し、ルートを再検証する", async () => {
    vi.mocked(createManual).mockResolvedValue(manual());

    const result = await createManualAction(buildInput());

    expect(createManual).toHaveBeenCalled();
    expect(result.id).toBe("manual-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(createManualAction(buildInput({ title: "" }))).rejects.toThrow();

    expect(createManual).not.toHaveBeenCalled();
  });

  it("公開範囲を国指定にしたのに0件の不正な入力は例外になる", async () => {
    await expect(
      createManualAction(buildInput({ targeting: { scope: "countries", countries: [] } }))
    ).rejects.toThrow();

    expect(createManual).not.toHaveBeenCalled();
  });

  it("不正なカテゴリの入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      category: "not-a-category",
    } as unknown as CreateManualInput;

    await expect(createManualAction(invalidInput)).rejects.toThrow();

    expect(createManual).not.toHaveBeenCalled();
  });

  it("PDF以外のファイル形式の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      fileType: "image/png",
    } as unknown as CreateManualInput;

    await expect(createManualAction(invalidInput)).rejects.toThrow();

    expect(createManual).not.toHaveBeenCalled();
  });

  it("Googleリンクの有効な入力で作成し、googleEmbedUrlをgoogleUrlからサーバー側で再計算する", async () => {
    vi.mocked(createManual).mockResolvedValue(
      manual({
        sourceType: "google",
        fileName: undefined,
        fileType: undefined,
        fileSize: undefined,
        dataUrl: undefined,
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      } as unknown as Partial<Manual>)
    );

    await createManualAction(buildGoogleInput());

    expect(createManual).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "google",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      })
    );
  });

  it("不正なGoogleリンクの入力は例外になる", async () => {
    await expect(
      createManualAction(buildGoogleInput({ googleUrl: "https://example.com/not-google" }))
    ).rejects.toThrow();

    expect(createManual).not.toHaveBeenCalled();
  });
});

describe("updateManualAction", () => {
  it("有効な入力でマニュアルを更新し、ルートを再検証する", async () => {
    vi.mocked(updateManual).mockResolvedValue(manual({ title: "更新後タイトル" }));

    const result = await updateManualAction("manual-1", buildInput());

    expect(updateManual).toHaveBeenCalledWith("manual-1", expect.anything());
    expect(result.title).toBe("更新後タイトル");
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("deleteManualAction", () => {
  it("削除し、ルートを再検証する", async () => {
    vi.mocked(deleteManual).mockResolvedValue(undefined);

    await deleteManualAction("manual-1");

    expect(deleteManual).toHaveBeenCalledWith("manual-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});
