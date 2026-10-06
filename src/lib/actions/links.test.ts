import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/links", () => ({
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  getLinkByIdForHelpdesk: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn(),
}));
vi.mock("@/lib/server/auto-translation", () => ({
  autoTranslateFields: vi.fn(),
}));
vi.mock("@/lib/server/link-service", () => ({
  addLinkTranslations: vi.fn(),
  LinkNotFoundError: class LinkNotFoundError extends Error {},
}));

import { revalidatePath } from "next/cache";
import {
  createLink,
  deleteLink,
  getLinkByIdForHelpdesk,
  updateLink,
} from "@/lib/api/links";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import { addLinkTranslations } from "@/lib/server/link-service";
import {
  createLinkAction,
  deleteLinkAction,
  retranslateLinkAction,
  updateLinkAction,
} from "@/lib/actions/links";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import type { CreateLinkInput, Link } from "@/types/link";

function buildInput(overrides: Partial<CreateLinkInput> = {}): CreateLinkInput {
  return {
    title: "社内ポータル",
    url: "https://example.com/portal",
    categoryId: "category-internal",
    ...overrides,
  };
}

function link(overrides: Partial<Link> = {}): Link {
  return {
    id: "link-1",
    title: "タイトル",
    url: "https://example.com",
    categoryId: "category-internal",
    subCategoryId: null,
    ...overrides,
  };
}

const allTranslated = {
  translations: { en: { title: "Portal", description: "" } },
  failedLocales: [] as string[],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(autoTranslateFields).mockResolvedValue(allTranslated);
});

describe("createLinkAction", () => {
  it("有効な入力で自動翻訳結果と一緒にリンクを作成し、ルートを再検証する", async () => {
    vi.mocked(createLink).mockResolvedValue(link());

    const result = await createLinkAction(buildInput({ description: "説明" }));

    expect(autoTranslateFields).toHaveBeenCalledWith({
      title: "社内ポータル",
      description: "説明",
    });
    expect(createLink).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: [{ locale: "en", title: "Portal", description: undefined }],
      })
    );
    expect(result.link.id).toBe("link-1");
    expect(result.failedLocales).toEqual([]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("翻訳が失敗しても保存を継続し、failedLocalesを返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: ["en", "th"],
    });
    vi.mocked(createLink).mockResolvedValue(link());

    const result = await createLinkAction(buildInput());

    expect(createLink).toHaveBeenCalledWith(expect.objectContaining({ translations: [] }));
    expect(result.failedLocales).toEqual(["en", "th"]);
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(createLinkAction(buildInput({ title: "" }))).rejects.toThrow();

    expect(createLink).not.toHaveBeenCalled();
  });

  it("不正なURL形式の入力は例外になり、保存されない", async () => {
    await expect(createLinkAction(buildInput({ url: "not-a-url" }))).rejects.toThrow();

    expect(createLink).not.toHaveBeenCalled();
  });

  it("http(s)以外のスキームのURLは例外になり、保存されない", async () => {
    await expect(
      createLinkAction(buildInput({ url: "javascript:alert(1)" }))
    ).rejects.toThrow();

    expect(createLink).not.toHaveBeenCalled();
  });
});

describe("updateLinkAction / deleteLinkAction", () => {
  it("jaの原文が変わったときは再翻訳して翻訳行を置き換える", async () => {
    vi.mocked(getLinkByIdForHelpdesk).mockResolvedValue(link({ title: "旧", translations: [] }));
    vi.mocked(updateLink).mockResolvedValue(link({ title: "更新後" }));

    const result = await updateLinkAction("link-1", buildInput({ title: "更新後" }));

    expect(autoTranslateFields).toHaveBeenCalled();
    expect(updateLink).toHaveBeenCalledWith(
      "link-1",
      expect.objectContaining({
        title: "更新後",
        translations: [{ locale: "en", title: "Portal", description: undefined }],
      })
    );
    expect(result.link.title).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("jaの原文が変わらないときは再翻訳せず翻訳行を変更しない", async () => {
    vi.mocked(getLinkByIdForHelpdesk).mockResolvedValue(
      link({
        title: "社内ポータル",
        translations: TRANSLATED_LOCALES.map((locale) => ({ locale, title: "x" })),
      })
    );
    vi.mocked(updateLink).mockResolvedValue(link());

    const result = await updateLinkAction("link-1", buildInput());

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(vi.mocked(updateLink).mock.calls[0][1].translations).toBeUndefined();
    expect(result.failedLocales).toEqual([]);
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(updateLinkAction("link-1", buildInput({ title: "" }))).rejects.toThrow();

    expect(updateLink).not.toHaveBeenCalled();
  });

  it("既存リンクを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteLink).mockResolvedValue(undefined);

    await deleteLinkAction("link-1");

    expect(deleteLink).toHaveBeenCalledWith("link-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("retranslateLinkAction", () => {
  it("不足しているlocaleだけを翻訳して追加保存する", async () => {
    vi.mocked(getLinkByIdForHelpdesk).mockResolvedValue(
      link({ translations: [{ locale: "en", title: "Portal" }] })
    );
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { th: { title: "ไทย" } },
      failedLocales: ["vi"],
    });
    vi.mocked(addLinkTranslations).mockResolvedValue(link());

    const result = await retranslateLinkAction("link-1");

    expect(requireHelpdeskStaffSession).toHaveBeenCalled();
    const missing = TRANSLATED_LOCALES.filter((locale) => locale !== "en");
    expect(autoTranslateFields).toHaveBeenCalledWith(
      { title: "タイトル", description: undefined },
      { locales: missing }
    );
    expect(addLinkTranslations).toHaveBeenCalledWith("link-1", [
      { locale: "th", title: "ไทย", description: undefined },
    ]);
    expect(result.failedLocales).toEqual(["vi"]);
  });

  it("全localeが保存済みなら翻訳を呼ばない", async () => {
    vi.mocked(getLinkByIdForHelpdesk).mockResolvedValue(
      link({ translations: TRANSLATED_LOCALES.map((locale) => ({ locale, title: "x" })) })
    );

    const result = await retranslateLinkAction("link-1");

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(result.failedLocales).toEqual([]);
  });

  it("リンクが存在しないときは例外を送出する", async () => {
    vi.mocked(getLinkByIdForHelpdesk).mockResolvedValue(null);

    await expect(retranslateLinkAction("missing")).rejects.toThrow();
  });
});

describe("認証（翻訳APIを呼ぶ前に拒否する）", () => {
  beforeEach(() => {
    vi.mocked(autoTranslateFields).mockClear();
    vi.mocked(requireHelpdeskStaffSession).mockRejectedValueOnce(new Error("unauthorized"));
  });

  it("作成は、未認証なら翻訳APIも保存も呼ばずに拒否する", async () => {
    await expect(createLinkAction({} as never)).rejects.toThrow("unauthorized");
    expect(autoTranslateFields).not.toHaveBeenCalled();
  });

  it("更新は、未認証なら翻訳APIも保存も呼ばずに拒否する", async () => {
    await expect(updateLinkAction("link-1", {} as never)).rejects.toThrow("unauthorized");
    expect(autoTranslateFields).not.toHaveBeenCalled();
  });
});
