import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from "@/lib/actions/announcements";
import { getAnnouncementByIdForHelpdesk } from "@/lib/api/announcements";

describe("createAnnouncementAction", () => {
  it("有効な入力でお知らせを作成し、ルートを再検証する", async () => {
    const created = await createAnnouncementAction({
      title: "アクション経由の新規作成",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(created.id).toBeTruthy();
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
  it("既存お知らせを更新する", async () => {
    const created = await createAnnouncementAction({
      title: "更新前",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    await updateAnnouncementAction(created.id, {
      title: "更新後",
      body: "本文",
      category: "policy",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    const result = await getAnnouncementByIdForHelpdesk(created.id);
    expect(result?.title).toBe("更新後");
  });

  it("既存お知らせを削除する", async () => {
    const created = await createAnnouncementAction({
      title: "削除対象",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    await deleteAnnouncementAction(created.id);

    const result = await getAnnouncementByIdForHelpdesk(created.id);
    expect(result).toBeNull();
  });
});
