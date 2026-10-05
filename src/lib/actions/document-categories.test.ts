import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api/document-categories", () => ({
  createDocumentCategory: vi.fn(),
  updateDocumentCategory: vi.fn(),
  deleteDocumentCategory: vi.fn(),
  moveDocumentCategory: vi.fn(),
  getDocumentCategoryById: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/server/auto-translation", () => ({ autoTranslateFields: vi.fn() }));
vi.mock("@/lib/server/document-category-service", () => {
  class DocumentCategoryNotFoundError extends Error {}
  return {
    DocumentCategoryNotFoundError,
    findDocumentCategoryForHelpdesk: vi.fn(),
    upsertDocumentCategoryTranslations: vi.fn(),
  };
});

import {
  createDocumentCategory,
  getDocumentCategoryById,
  updateDocumentCategory,
} from "@/lib/api/document-categories";
import {
  createDocumentCategoryAction,
  retranslateDocumentCategoryAction,
  updateDocumentCategoryAction,
} from "@/lib/actions/document-categories";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import {
  findDocumentCategoryForHelpdesk,
  upsertDocumentCategoryTranslations,
} from "@/lib/server/document-category-service";
import type { DocumentCategory } from "@/types/document-category";

const ALL_LOCALES = ["en", "pt", "th", "zh-TW", "zh", "vi"];

function translatedAll() {
  return {
    translations: Object.fromEntries(
      ALL_LOCALES.map((locale) => [locale, { name: `N-${locale}` }])
    ),
    failedLocales: [] as string[],
  };
}

function category(overrides: Partial<DocumentCategory> = {}): DocumentCategory {
  return {
    id: "cat-1",
    parentId: null,
    name: "大分類",
    displayOrder: 0,
    targeting: { scope: "all" },
    translations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(autoTranslateFields).mockResolvedValue(translatedAll());
});

describe("createDocumentCategoryAction", () => {
  it("jaの名称を全言語へ自動翻訳して保存する", async () => {
    vi.mocked(createDocumentCategory).mockResolvedValue(category());

    const result = await createDocumentCategoryAction({
      parentId: null,
      name: "大分類",
      targeting: { scope: "all" },
    });

    expect(autoTranslateFields).toHaveBeenCalledWith(
      { name: "大分類" },
      { locales: ALL_LOCALES }
    );
    const passed = vi.mocked(createDocumentCategory).mock.calls[0][0];
    expect(passed.translations).toHaveLength(6);
    expect(passed.translations).toContainEqual({ locale: "vi", name: "N-vi" });
    expect(result.failedLocales).toEqual([]);
  });

  it("翻訳に失敗しても保存は続行し、failedLocalesを返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });
    vi.mocked(createDocumentCategory).mockResolvedValue(category());

    const result = await createDocumentCategoryAction({
      parentId: null,
      name: "大分類",
      targeting: { scope: "all" },
    });

    expect(createDocumentCategory).toHaveBeenCalledWith(
      expect.objectContaining({ translations: [] })
    );
    expect(result.failedLocales).toEqual(ALL_LOCALES);
  });

  it("名称が空の入力は例外になり保存されない", async () => {
    await expect(
      createDocumentCategoryAction({ parentId: null, name: "", targeting: { scope: "all" } })
    ).rejects.toThrow();
    expect(createDocumentCategory).not.toHaveBeenCalled();
  });
});

describe("updateDocumentCategoryAction", () => {
  it("jaの名称が変わらなければ翻訳APIを呼ばず既存翻訳を維持する", async () => {
    const translations = [{ locale: "en", name: "Existing" }];
    vi.mocked(getDocumentCategoryById).mockResolvedValue(category({ translations }));
    vi.mocked(updateDocumentCategory).mockResolvedValue(category());

    await updateDocumentCategoryAction("cat-1", {
      name: "大分類",
      targeting: { scope: "all" },
    });

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateDocumentCategory).toHaveBeenCalledWith(
      "cat-1",
      expect.objectContaining({ translations })
    );
  });

  it("jaの名称が変わったら再翻訳する", async () => {
    vi.mocked(getDocumentCategoryById).mockResolvedValue(
      category({ translations: [{ locale: "en", name: "Old" }] })
    );
    vi.mocked(updateDocumentCategory).mockResolvedValue(category());

    await updateDocumentCategoryAction("cat-1", {
      name: "新名称",
      targeting: { scope: "all" },
    });

    expect(autoTranslateFields).toHaveBeenCalledWith(
      { name: "新名称" },
      { locales: ALL_LOCALES }
    );
    const passed = vi.mocked(updateDocumentCategory).mock.calls[0][1];
    expect(passed.translations).toHaveLength(6);
  });
});

describe("retranslateDocumentCategoryAction", () => {
  it("不足している言語だけを翻訳して保存する", async () => {
    vi.mocked(findDocumentCategoryForHelpdesk).mockResolvedValue(
      category({
        translations: ALL_LOCALES.filter((l) => l !== "vi").map((locale) => ({
          locale,
          name: "x",
        })),
      })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { vi: { name: "VI" } },
      failedLocales: [],
    });

    const result = await retranslateDocumentCategoryAction("cat-1");

    expect(autoTranslateFields).toHaveBeenCalledWith({ name: "大分類" }, { locales: ["vi"] });
    expect(upsertDocumentCategoryTranslations).toHaveBeenCalledWith("cat-1", [
      { locale: "vi", name: "VI" },
    ]);
    expect(result.failedLocales).toEqual([]);
  });

  it("再翻訳でも失敗した言語を返し、何も保存しない", async () => {
    vi.mocked(findDocumentCategoryForHelpdesk).mockResolvedValue(category());
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ALL_LOCALES,
    });

    const result = await retranslateDocumentCategoryAction("cat-1");

    expect(upsertDocumentCategoryTranslations).not.toHaveBeenCalled();
    expect(result.failedLocales).toEqual(ALL_LOCALES);
  });

  it("存在しないカテゴリは例外になる", async () => {
    vi.mocked(findDocumentCategoryForHelpdesk).mockResolvedValue(null);
    await expect(retranslateDocumentCategoryAction("missing")).rejects.toThrow();
  });
});
