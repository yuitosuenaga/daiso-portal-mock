import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/documents", () => ({
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentByIdForHelpdesk: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/server/auto-translation", () => ({
  autoTranslateFields: vi.fn(),
}));
vi.mock("@/lib/server/document-service", () => {
  class DocumentNotFoundError extends Error {}
  return {
    DocumentNotFoundError,
    findDocumentById: vi.fn(),
    upsertDocumentTranslations: vi.fn(),
  };
});
vi.mock("@/lib/server/document-category-service", () => ({
  assertDocumentCategoryPair: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createDocument,
  deleteDocument,
  getDocumentByIdForHelpdesk,
  updateDocument,
} from "@/lib/api/documents";
import {
  createDocumentAction,
  deleteDocumentAction,
  retranslateDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { findDocumentById, upsertDocumentTranslations } from "@/lib/server/document-service";
import type { Document, DocumentFormInput } from "@/types/document";

const ALL_LOCALES = ["en", "pt", "th", "zh-TW", "zh", "vi"];

function translatedAll(prefix = "T") {
  return {
    translations: Object.fromEntries(
      ALL_LOCALES.map((locale) => [
        locale,
        { title: `${prefix}-${locale}-title`, description: `${prefix}-${locale}-desc` },
      ])
    ),
    failedLocales: [],
  };
}

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildInput(overrides: Partial<DocumentFormInput> = {}): DocumentFormInput {
  return {
    sourceType: "upload",
    title: "アクション経由の新規作成",
    status: "draft",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    categoryId: "category-1",
    subCategoryId: null,
    ...overrides,
  } as DocumentFormInput;
}

function buildGoogleInput(
  overrides: Partial<DocumentFormInput> = {}
): DocumentFormInput {
  return {
    sourceType: "google",
    title: "Google経由の新規作成",
    status: "draft",
    googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
    googleEmbedUrl: "https://docs.google.com/document/d/should-be-ignored/preview",
    targeting: { scope: "all" },
    categoryId: "category-1",
    subCategoryId: null,
    ...overrides,
  } as DocumentFormInput;
}

function document(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    title: "タイトル",
    sourceType: "upload",
    status: "published",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T00:00:00.000Z",
    translations: [],
    ...overrides,
  } as Document;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(autoTranslateFields).mockResolvedValue(translatedAll());
});

describe("createDocumentAction", () => {
  it("有効な入力でドキュメントを作成し、ルートを再検証する", async () => {
    vi.mocked(createDocument).mockResolvedValue(document());

    const result = await createDocumentAction(buildInput());

    expect(createDocument).toHaveBeenCalled();
    expect(result.document.id).toBe("document-1");
    expect(result.failedLocales).toEqual([]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(createDocumentAction(buildInput({ title: "" }))).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("公開範囲を国指定にしたのに0件の不正な入力は例外になる", async () => {
    await expect(
      createDocumentAction(
        buildInput({ targeting: { scope: "countries", countries: [] } })
      )
    ).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("statusが不正な値の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      status: "archived",
    } as unknown as DocumentFormInput;

    await expect(createDocumentAction(invalidInput)).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("PDF以外のファイル形式の不正な入力は例外になる", async () => {
    const invalidInput = {
      ...buildInput(),
      fileType: "image/png",
    } as unknown as DocumentFormInput;

    await expect(createDocumentAction(invalidInput)).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("Googleリンクの有効な入力で作成し、googleEmbedUrlをgoogleUrlからサーバー側で再計算する", async () => {
    vi.mocked(createDocument).mockResolvedValue(
      document({
        sourceType: "google",
        fileName: undefined,
        fileType: undefined,
        fileSize: undefined,
        dataUrl: undefined,
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      } as unknown as Partial<Document>)
    );

    await createDocumentAction(buildGoogleInput());

    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "google",
        googleUrl: "https://docs.google.com/document/d/abc123/edit?usp=sharing",
        googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      })
    );
  });

  it("Googleリンクが無効な形式の場合は例外になり、保存されない", async () => {
    await expect(
      createDocumentAction(
        buildGoogleInput({ googleUrl: "https://example.com/not-google" })
      )
    ).rejects.toThrow();

    expect(createDocument).not.toHaveBeenCalled();
  });

  it("jaのタイトル・説明を全言語へ自動翻訳し、translationsとしてcreateDocumentへ渡す", async () => {
    vi.mocked(createDocument).mockResolvedValue(document());

    await createDocumentAction(buildInput({ description: "説明" }));

    expect(autoTranslateFields).toHaveBeenCalledWith(
      { title: "アクション経由の新規作成", description: "説明" },
      { locales: ALL_LOCALES }
    );
    const passed = vi.mocked(createDocument).mock.calls[0][0];
    expect(passed.translations).toHaveLength(6);
    expect(passed.translations).toContainEqual({
      locale: "vi",
      title: "T-vi-title",
      description: "T-vi-desc",
    });
  });

  it("翻訳に失敗しても保存は続行し、translationsは空・failedLocalesに全言語を返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });
    vi.mocked(createDocument).mockResolvedValue(document());

    const result = await createDocumentAction(buildInput());

    expect(createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ translations: [] })
    );
    expect(result.failedLocales).toEqual(ALL_LOCALES);
  });

  it("一部の言語のみ失敗した場合、成功した言語だけ保存し失敗言語を返す", async () => {
    const all = translatedAll();
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: Object.fromEntries(
        Object.entries(all.translations).filter(([locale]) => locale !== "th")
      ),
      failedLocales: ["th"],
    });
    vi.mocked(createDocument).mockResolvedValue(document());

    const result = await createDocumentAction(buildInput());

    const passed = vi.mocked(createDocument).mock.calls[0][0];
    expect(passed.translations.map((t) => t.locale)).not.toContain("th");
    expect(passed.translations).toHaveLength(5);
    expect(result.failedLocales).toEqual(["th"]);
  });
});

describe("updateDocumentAction / deleteDocumentAction", () => {
  it("既存ドキュメントを更新し、ルートを再検証する", async () => {
    vi.mocked(getDocumentByIdForHelpdesk).mockResolvedValue(document());
    vi.mocked(updateDocument).mockResolvedValue(document({ title: "更新後" }));

    const result = await updateDocumentAction("document-1", buildInput({ title: "更新後" }));

    expect(updateDocument).toHaveBeenCalledWith(
      "document-1",
      expect.objectContaining({ title: "更新後" })
    );
    expect(result.document.title).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("Googleリンクドキュメントの更新時もgoogleEmbedUrlをgoogleUrlから再計算する", async () => {
    vi.mocked(getDocumentByIdForHelpdesk).mockResolvedValue(document());
    vi.mocked(updateDocument).mockResolvedValue(
      document({ sourceType: "google" } as unknown as Partial<Document>)
    );

    await updateDocumentAction(
      "document-1",
      buildGoogleInput({
        googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
      })
    );

    expect(updateDocument).toHaveBeenCalledWith(
      "document-1",
      expect.objectContaining({
        googleUrl: "https://docs.google.com/spreadsheets/d/xyz789/edit",
        googleEmbedUrl: "https://docs.google.com/spreadsheets/d/xyz789/preview",
      })
    );
  });

  it("jaの原文が変わらない更新では翻訳APIを呼ばず、既存翻訳を維持する", async () => {
    const existingTranslations = [{ locale: "en", title: "Existing", description: undefined }];
    vi.mocked(getDocumentByIdForHelpdesk).mockResolvedValue(
      document({
        title: "アクション経由の新規作成",
        description: undefined,
        translations: existingTranslations,
      })
    );
    vi.mocked(updateDocument).mockResolvedValue(document());

    const result = await updateDocumentAction("document-1", buildInput());

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateDocument).toHaveBeenCalledWith(
      "document-1",
      expect.objectContaining({ translations: existingTranslations })
    );
    expect(result.failedLocales).toEqual([]);
  });

  it("jaの原文が変わった更新では再翻訳して翻訳を置き換える", async () => {
    vi.mocked(getDocumentByIdForHelpdesk).mockResolvedValue(
      document({
        title: "古いタイトル",
        translations: [{ locale: "en", title: "Old" }],
      })
    );
    vi.mocked(updateDocument).mockResolvedValue(document());

    await updateDocumentAction("document-1", buildInput({ title: "新しいタイトル" }));

    expect(autoTranslateFields).toHaveBeenCalledTimes(1);
    const passed = vi.mocked(updateDocument).mock.calls[0][1];
    expect(passed.translations).toHaveLength(6);
    expect(passed.translations.find((t) => t.locale === "en")?.title).toBe("T-en-title");
  });

  it("既存ドキュメントを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteDocument).mockResolvedValue(undefined);

    await deleteDocumentAction("document-1");

    expect(deleteDocument).toHaveBeenCalledWith("document-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("retranslateDocumentAction", () => {
  it("不足している言語だけを翻訳して保存する", async () => {
    vi.mocked(findDocumentById).mockResolvedValue(
      document({
        title: "原文",
        translations: ALL_LOCALES.filter((l) => l !== "vi" && l !== "th").map((locale) => ({
          locale,
          title: `x-${locale}`,
        })),
      })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { vi: { title: "VI" }, th: { title: "TH" } },
      failedLocales: [],
    });

    const result = await retranslateDocumentAction("document-1");

    expect(autoTranslateFields).toHaveBeenCalledWith(
      { title: "原文", description: undefined },
      { locales: ["th", "vi"] }
    );
    expect(upsertDocumentTranslations).toHaveBeenCalledWith("document-1", [
      { locale: "th", title: "TH", description: undefined },
      { locale: "vi", title: "VI", description: undefined },
    ]);
    expect(result.failedLocales).toEqual([]);
  });

  it("再翻訳でも失敗した言語はfailedLocalesで返し、何も保存しない", async () => {
    vi.mocked(findDocumentById).mockResolvedValue(document({ translations: [] }));
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });

    const result = await retranslateDocumentAction("document-1");

    expect(upsertDocumentTranslations).not.toHaveBeenCalled();
    expect(result.failedLocales).toEqual(ALL_LOCALES);
  });

  it("全言語が揃っていれば翻訳APIを呼ばない", async () => {
    vi.mocked(findDocumentById).mockResolvedValue(
      document({ translations: ALL_LOCALES.map((locale) => ({ locale, title: "x" })) })
    );

    const result = await retranslateDocumentAction("document-1");

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(result.failedLocales).toEqual([]);
  });

  it("存在しないドキュメントは例外になる", async () => {
    vi.mocked(findDocumentById).mockResolvedValue(null);

    await expect(retranslateDocumentAction("missing")).rejects.toThrow();
  });
});
