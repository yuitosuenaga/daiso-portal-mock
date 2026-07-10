import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/announcements", () => ({
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/api/announcements";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from "@/lib/actions/announcements";
import type { Announcement } from "@/types/announcement";

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "announcement-1",
    title: "タイトル",
    publishedAt: "2026-07-01T00:00:00.000Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAnnouncementAction", () => {
  it("有効な入力でお知らせを作成し、ルートを再検証する", async () => {
    vi.mocked(createAnnouncement).mockResolvedValue(announcement());

    const result = await createAnnouncementAction({
      title: "アクション経由の新規作成",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(createAnnouncement).toHaveBeenCalled();
    expect(result.id).toBe("announcement-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(
      createAnnouncementAction({
        title: "",
        body: "本文",
        category: "other",
        targeting: { scope: "all" },
        actionRequired: false,
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
        targeting: { scope: "countries", countries: [] },
        actionRequired: false,
      })
    ).rejects.toThrow();

    expect(createAnnouncement).not.toHaveBeenCalled();
  });

  it("日付フィールドがnullで渡されても保存できる", async () => {
    const created = await createAnnouncementAction({
      title: "日付nullテスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: null,
      publishEndDate: null,
      dueDate: null,
    });

    expect(created.publishStartDate).toBeNull();
    expect(created.publishEndDate).toBeNull();
    expect(created.dueDate).toBeNull();
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
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(updateAnnouncement).toHaveBeenCalledWith(
      "announcement-1",
      expect.objectContaining({ title: "更新後" })
    );
    expect(result.title).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("既存お知らせを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteAnnouncement).mockResolvedValue(undefined);

    await deleteAnnouncementAction("announcement-1");

    expect(deleteAnnouncement).toHaveBeenCalledWith("announcement-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});
