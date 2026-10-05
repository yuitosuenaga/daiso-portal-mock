import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/announcements", () => ({
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
}));
vi.mock("@/lib/server/announcement-translation", () => ({
  buildAnnouncementTranslations: vi.fn(),
}));
vi.mock("@/lib/server/announcement-service", () => ({
  AnnouncementNotFoundError: class AnnouncementNotFoundError extends Error {},
  findAnnouncementById: vi.fn(async () => null),
  replaceAnnouncementTranslations: vi.fn(),
}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/api/announcements";
import { buildAnnouncementTranslations } from "@/lib/server/announcement-translation";
import {
  findAnnouncementById,
  replaceAnnouncementTranslations,
} from "@/lib/server/announcement-service";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  retranslateAnnouncementAction,
  updateAnnouncementAction,
} from "@/lib/actions/announcements";
import type { Announcement } from "@/types/announcement";

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "announcement-1",
    title: "タイトル",
    status: "published",
    publishedAt: "2026-07-01T00:00:00.000Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    sendEmailNotification: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    attachments: [],
    linkedDocumentIds: [],
    translations: [{ locale: "en", title: "Title", body: "Body" }],
    ...overrides,
  };
}

const EN_ROW = { locale: "en", title: "Title", body: "Body", source: "machine" as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findAnnouncementById).mockResolvedValue(null);
  vi.mocked(buildAnnouncementTranslations).mockResolvedValue({
    translations: [EN_ROW],
    failedLocales: [],
  });
});

describe("createAnnouncementAction", () => {
  it("有効な入力でお知らせを作成し、ルートを再検証する", async () => {
    vi.mocked(createAnnouncement).mockResolvedValue(announcement());

    const result = await createAnnouncementAction({
      title: "アクション経由の新規作成",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
    });

    expect(createAnnouncement).toHaveBeenCalled();
    expect(result.announcement.id).toBe("announcement-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(
      createAnnouncementAction({
        title: "",
        body: "本文",
        category: "other",
        status: "published",
        targeting: { scope: "all" },
        actionRequired: false,
        sendEmailNotification: false,
        attachments: [],
        linkedDocumentIds: [],
      })
    ).rejects.toThrow();

    expect(createAnnouncement).not.toHaveBeenCalled();
  });

  it("配信対象を国指定にしたのに0件の不正な入力は例外になる", async () => {
    await expect(
      createAnnouncementAction({
        title: "テスト",
        body: "本文",
        category: "other",
        status: "published",
        targeting: { scope: "countries", countries: [] },
        actionRequired: false,
        sendEmailNotification: false,
        attachments: [],
        linkedDocumentIds: [],
      })
    ).rejects.toThrow();

    expect(createAnnouncement).not.toHaveBeenCalled();
  });

  it("日付フィールドがnullで渡されても保存できる", async () => {
    vi.mocked(createAnnouncement).mockResolvedValue(
      announcement({ publishStartDate: null, publishEndDate: null, dueDate: null })
    );

    const created = await createAnnouncementAction({
      title: "日付nullテスト",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      publishStartDate: null,
      publishEndDate: null,
      dueDate: null,
      attachments: [],
      linkedDocumentIds: [],
    });

    expect(created.announcement.publishStartDate).toBeNull();
    expect(created.announcement.publishEndDate).toBeNull();
    expect(created.announcement.dueDate).toBeNull();
  });
});

describe("updateAnnouncementAction / deleteAnnouncementAction", () => {
  it("既存お知らせを更新し、ルートを再検証する", async () => {
    vi.mocked(updateAnnouncement).mockResolvedValue(
      announcement({ title: "更新後", category: "policy" })
    );

    const result = await updateAnnouncementAction("announcement-1", {
      title: "更新後",
      body: "本文",
      category: "policy",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
    });

    expect(updateAnnouncement).toHaveBeenCalledWith(
      "announcement-1",
      expect.objectContaining({ title: "更新後" })
    );
    expect(result.announcement.title).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("既存お知らせを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteAnnouncement).mockResolvedValue(undefined);

    await deleteAnnouncementAction("announcement-1");

    expect(deleteAnnouncement).toHaveBeenCalledWith("announcement-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("自動翻訳", () => {
  const input = {
    title: "タイトル",
    body: "本文",
    category: "other" as const,
    status: "published" as const,
    targeting: { scope: "all" as const },
    actionRequired: false,
    sendEmailNotification: false,
    attachments: [],
    linkedDocumentIds: [],
  };

  it("翻訳成功時は指定された公開状態のまま翻訳行を付けて保存する", async () => {
    vi.mocked(createAnnouncement).mockResolvedValue(announcement());

    const result = await createAnnouncementAction(input);

    expect(createAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published", translations: [EN_ROW] })
    );
    expect(result.failedLocales).toEqual([]);
    expect(result.forcedDraft).toBe(false);
  });

  it("翻訳失敗時は下書きに強制して保存し、forcedDraftとfailedLocalesを返す", async () => {
    vi.mocked(buildAnnouncementTranslations).mockResolvedValue({
      translations: [],
      failedLocales: ["en", "th"],
    });
    vi.mocked(createAnnouncement).mockResolvedValue(announcement({ status: "draft" }));

    const result = await createAnnouncementAction(input);

    expect(createAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
    expect(result.failedLocales).toEqual(["en", "th"]);
    expect(result.forcedDraft).toBe(true);
  });

  it("下書き保存で翻訳失敗してもforcedDraftは偽", async () => {
    vi.mocked(buildAnnouncementTranslations).mockResolvedValue({
      translations: [],
      failedLocales: ["en"],
    });
    vi.mocked(createAnnouncement).mockResolvedValue(announcement({ status: "draft" }));

    const result = await createAnnouncementAction({ ...input, status: "draft" });

    expect(result.forcedDraft).toBe(false);
    expect(result.failedLocales).toEqual(["en"]);
  });

  it("編集時は既存の翻訳行を渡して再翻訳要否を判定させ、失敗時は公開済みでも下書きに戻す", async () => {
    const existing = announcement({ translations: [EN_ROW] });
    vi.mocked(findAnnouncementById).mockResolvedValue(existing);
    vi.mocked(buildAnnouncementTranslations).mockResolvedValue({
      translations: [EN_ROW],
      failedLocales: ["vi"],
    });
    vi.mocked(updateAnnouncement).mockResolvedValue(announcement({ status: "draft" }));

    const result = await updateAnnouncementAction("announcement-1", input);

    expect(buildAnnouncementTranslations).toHaveBeenCalledWith(
      { title: "タイトル", body: "本文" },
      [EN_ROW]
    );
    expect(updateAnnouncement).toHaveBeenCalledWith(
      "announcement-1",
      expect.objectContaining({ status: "draft" })
    );
    expect(result.forcedDraft).toBe(true);
  });
});

describe("retranslateAnnouncementAction", () => {
  it("ヘルプデスクセッションを要求し、翻訳行のみ保存してfailedLocalesを返す", async () => {
    vi.mocked(findAnnouncementById).mockResolvedValue(announcement());
    vi.mocked(buildAnnouncementTranslations).mockResolvedValue({
      translations: [EN_ROW],
      failedLocales: ["zh"],
    });

    const result = await retranslateAnnouncementAction("announcement-1");

    expect(requireHelpdeskStaffSession).toHaveBeenCalled();
    expect(buildAnnouncementTranslations).toHaveBeenCalledWith(
      { title: "タイトル", body: "本文" },
      expect.any(Array),
      { keepExistingOnFailure: true }
    );
    expect(replaceAnnouncementTranslations).toHaveBeenCalledWith("announcement-1", [EN_ROW]);
    expect(updateAnnouncement).not.toHaveBeenCalled();
    expect(result).toEqual({ failedLocales: ["zh"] });
  });

  it("お知らせが存在しなければ例外を送出する", async () => {
    vi.mocked(findAnnouncementById).mockResolvedValue(null);

    await expect(retranslateAnnouncementAction("missing")).rejects.toThrow();
    expect(replaceAnnouncementTranslations).not.toHaveBeenCalled();
  });
});
