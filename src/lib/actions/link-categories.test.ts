import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api/link-categories", () => ({
  createLinkCategory: vi.fn(),
  updateLinkCategory: vi.fn(),
  deleteLinkCategory: vi.fn(),
  moveLinkCategory: vi.fn(),
  getLinkCategoryById: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn(),
}));
vi.mock("@/lib/server/auto-translation", () => ({
  autoTranslateFields: vi.fn(),
}));
vi.mock("@/lib/server/link-category-service", () => ({
  addLinkCategoryTranslations: vi.fn(),
  LinkCategoryNotFoundError: class LinkCategoryNotFoundError extends Error {},
}));

import {
  createLinkCategory,
  getLinkCategoryById,
  updateLinkCategory,
} from "@/lib/api/link-categories";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { addLinkCategoryTranslations } from "@/lib/server/link-category-service";
import {
  createLinkCategoryAction,
  retranslateLinkCategoryAction,
  updateLinkCategoryAction,
} from "@/lib/actions/link-categories";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import type { LinkCategory } from "@/types/link-category";

function category(overrides: Partial<LinkCategory> = {}): LinkCategory {
  return { id: "c1", parentId: null, name: "社内", displayOrder: 0, translations: [], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(autoTranslateFields).mockResolvedValue({
    translations: { en: { name: "Internal" } },
    failedLocales: [],
  });
});

describe("createLinkCategoryAction", () => {
  it("jaの名称を自動翻訳して翻訳行と一緒に作成する", async () => {
    vi.mocked(createLinkCategory).mockResolvedValue(category());

    const result = await createLinkCategoryAction({ parentId: null, name: "社内" });

    expect(autoTranslateFields).toHaveBeenCalledWith({ name: "社内" });
    expect(createLinkCategory).toHaveBeenCalledWith({
      parentId: null,
      name: "社内",
      translations: [{ locale: "en", name: "Internal" }],
    });
    expect(result.failedLocales).toEqual([]);
  });

  it("翻訳が失敗しても保存し、failedLocalesを返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ["en"],
    });
    vi.mocked(createLinkCategory).mockResolvedValue(category());

    const result = await createLinkCategoryAction({ parentId: null, name: "社内" });

    expect(createLinkCategory).toHaveBeenCalledWith(
      expect.objectContaining({ translations: [] })
    );
    expect(result.failedLocales).toEqual(["en"]);
  });

  it("名称が空なら保存しない", async () => {
    await expect(createLinkCategoryAction({ parentId: null, name: "" })).rejects.toThrow();
    expect(createLinkCategory).not.toHaveBeenCalled();
  });
});

describe("updateLinkCategoryAction", () => {
  it("名称が変わったときのみ再翻訳する", async () => {
    vi.mocked(getLinkCategoryById).mockResolvedValue(category({ name: "旧" }));
    vi.mocked(updateLinkCategory).mockResolvedValue(category({ name: "社内" }));

    await updateLinkCategoryAction("c1", { name: "社内" });

    expect(autoTranslateFields).toHaveBeenCalledWith({ name: "社内" });
    expect(updateLinkCategory).toHaveBeenCalledWith("c1", {
      name: "社内",
      translations: [{ locale: "en", name: "Internal" }],
    });
  });

  it("名称が変わらないときは再翻訳せず翻訳行を変更しない", async () => {
    vi.mocked(getLinkCategoryById).mockResolvedValue(
      category({
        translations: TRANSLATED_LOCALES.map((locale) => ({ locale, name: "x" })),
      })
    );
    vi.mocked(updateLinkCategory).mockResolvedValue(category());

    const result = await updateLinkCategoryAction("c1", { name: "社内" });

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(updateLinkCategory).toHaveBeenCalledWith("c1", {
      name: "社内",
      translations: undefined,
    });
    expect(result.failedLocales).toEqual([]);
  });
});

describe("retranslateLinkCategoryAction", () => {
  it("不足localeだけ翻訳して追加保存する", async () => {
    vi.mocked(getLinkCategoryById).mockResolvedValue(
      category({ translations: [{ locale: "en", name: "Internal" }] })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { th: { name: "ไทย" } },
      failedLocales: ["vi"],
    });
    vi.mocked(addLinkCategoryTranslations).mockResolvedValue(category());

    const result = await retranslateLinkCategoryAction("c1");

    expect(autoTranslateFields).toHaveBeenCalledWith(
      { name: "社内" },
      { locales: TRANSLATED_LOCALES.filter((locale) => locale !== "en") }
    );
    expect(addLinkCategoryTranslations).toHaveBeenCalledWith("c1", [
      { locale: "th", name: "ไทย" },
    ]);
    expect(result.failedLocales).toEqual(["vi"]);
  });

  it("カテゴリが存在しないときは例外を送出する", async () => {
    vi.mocked(getLinkCategoryById).mockResolvedValue(null);
    await expect(retranslateLinkCategoryAction("x")).rejects.toThrow();
  });
});

describe("認証（翻訳APIを呼ぶ前に拒否する）", () => {
  beforeEach(() => {
    vi.mocked(autoTranslateFields).mockClear();
    vi.mocked(requireHelpdeskStaffSession).mockRejectedValueOnce(new Error("unauthorized"));
  });

  it("作成は、未認証なら翻訳APIも保存も呼ばずに拒否する", async () => {
    await expect(createLinkCategoryAction({ parentId: null, name: "x" } as never)).rejects.toThrow("unauthorized");
    expect(autoTranslateFields).not.toHaveBeenCalled();
  });

  it("更新は、未認証なら翻訳APIも保存も呼ばずに拒否する", async () => {
    await expect(updateLinkCategoryAction("cat-1", { name: "x" } as never)).rejects.toThrow("unauthorized");
    expect(autoTranslateFields).not.toHaveBeenCalled();
  });
});
