import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/manuals", () => ({
  createManual: vi.fn(),
  updateManual: vi.fn(),
  deleteManual: vi.fn(),
  getManualByIdForHelpdesk: vi.fn(),
}));
vi.mock("@/lib/server/auto-translation", () => ({
  autoTranslateFields: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createManual,
  deleteManual,
  getManualByIdForHelpdesk,
  updateManual,
} from "@/lib/api/manuals";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import {
  createManualAction,
  deleteManualAction,
  retranslateManualAction,
  updateManualAction,
} from "@/lib/actions/manuals";
import type { ManualFormInput as CreateManualInput, Manual } from "@/types/manual";

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

const ALL_LOCALES = ["en", "pt", "th", "zh-TW", "zh", "vi"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(autoTranslateFields).mockResolvedValue({
    translations: Object.fromEntries(
      ALL_LOCALES.map((locale) => [locale, { title: `[${locale}]タイトル` }])
    ),
    failedLocales: [],
  });
});

describe("createManualAction", () => {
  it("有効な入力でマニュアルを作成し、ルートを再検証する", async () => {
    vi.mocked(createManual).mockResolvedValue(manual());

    const result = await createManualAction(buildInput());

    expect(createManual).toHaveBeenCalled();
    expect(result.manual.id).toBe("manual-1");
    expect(result.failedLocales).toEqual([]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("jaの原文を全言語へ自動翻訳し、翻訳行として保存する", async () => {
    vi.mocked(createManual).mockResolvedValue(manual());

    await createManualAction(buildInput({ description: "説明" }));

    expect(autoTranslateFields).toHaveBeenCalledWith(
      { title: "アクション経由の新規作成", description: "説明" },
      undefined
    );
    const saved = vi.mocked(createManual).mock.calls[0][0];
    expect(saved.translations.map((t) => t.locale)).toEqual(ALL_LOCALES);
    expect(saved.translations[0]).toEqual({
      locale: "en",
      title: "[en]タイトル",
      description: undefined,
    });
  });

  it("翻訳に失敗してもjaのみで保存を続行し、failedLocalesを返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });
    vi.mocked(createManual).mockResolvedValue(manual());

    const result = await createManualAction(buildInput());

    expect(createManual).toHaveBeenCalledWith(expect.objectContaining({ translations: [] }));
    expect(result.failedLocales).toEqual(ALL_LOCALES);
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
  it("jaの原文が変更された場合は再翻訳して更新し、ルートを再検証する", async () => {
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(
      manual({ title: "旧タイトル", translations: [{ locale: "en", title: "Old" }] })
    );
    vi.mocked(updateManual).mockResolvedValue(manual({ title: "更新後タイトル" }));

    const result = await updateManualAction("manual-1", buildInput());

    expect(autoTranslateFields).toHaveBeenCalled();
    expect(updateManual).toHaveBeenCalledWith(
      "manual-1",
      expect.objectContaining({
        translations: expect.arrayContaining([
          expect.objectContaining({ locale: "pt", title: "[pt]タイトル" }),
        ]),
      })
    );
    expect(result.manual.title).toBe("更新後タイトル");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("jaの原文が変わらない場合は再翻訳せず既存の翻訳を維持する", async () => {
    const existingTranslations = [{ locale: "en", title: "Existing" }];
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(
      manual({ title: "アクション経由の新規作成", translations: existingTranslations })
    );
    vi.mocked(updateManual).mockResolvedValue(manual());

    const result = await updateManualAction("manual-1", buildInput());

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateManual).toHaveBeenCalledWith(
      "manual-1",
      expect.objectContaining({ translations: existingTranslations })
    );
    expect(result.failedLocales).toEqual([]);
  });

  it("再翻訳に失敗しても更新を続行し、failedLocalesを返す", async () => {
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(manual({ title: "旧タイトル" }));
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });
    vi.mocked(updateManual).mockResolvedValue(manual());

    const result = await updateManualAction("manual-1", buildInput());

    expect(updateManual).toHaveBeenCalledWith(
      "manual-1",
      expect.objectContaining({ translations: [] })
    );
    expect(result.failedLocales).toEqual(ALL_LOCALES);
  });
});

describe("retranslateManualAction", () => {
  it("不足しているlocaleだけを翻訳し、既存の翻訳に追加して保存する", async () => {
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(
      manual({ translations: [{ locale: "en", title: "Existing" }] })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { pt: { title: "PT" } },
      failedLocales: ["th", "zh-TW", "zh", "vi"],
    });
    vi.mocked(updateManual).mockResolvedValue(manual());

    const result = await retranslateManualAction("manual-1");

    expect(autoTranslateFields).toHaveBeenCalledWith(expect.anything(), {
      locales: ["pt", "th", "zh-TW", "zh", "vi"],
    });
    const saved = vi.mocked(updateManual).mock.calls[0][1];
    expect(saved.translations.map((t) => t.locale)).toEqual(["en", "pt"]);
    expect("id" in saved).toBe(false);
    expect(result.failedLocales).toEqual(["th", "zh-TW", "zh", "vi"]);
  });

  it("全言語の翻訳が揃っていればAPIを呼ばない", async () => {
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(
      manual({ translations: ALL_LOCALES.map((locale) => ({ locale, title: locale })) })
    );

    const result = await retranslateManualAction("manual-1");

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateManual).not.toHaveBeenCalled();
    expect(result.failedLocales).toEqual([]);
  });

  it("全て失敗した場合は保存せずfailedLocalesを返す", async () => {
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(manual());
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });

    const result = await retranslateManualAction("manual-1");

    expect(updateManual).not.toHaveBeenCalled();
    expect(result.failedLocales).toEqual(ALL_LOCALES);
  });

  it("存在しないマニュアルは例外になる", async () => {
    vi.mocked(getManualByIdForHelpdesk).mockResolvedValue(null);

    await expect(retranslateManualAction("nope")).rejects.toThrow();
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
