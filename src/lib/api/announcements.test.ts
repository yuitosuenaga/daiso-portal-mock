import { describe, expect, it } from "vitest";

import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  getAnnouncementByIdForHelpdesk,
  getAnnouncements,
  getRecentAnnouncements,
  updateAnnouncement,
} from "@/lib/api/announcements";
import type { CreateAnnouncementInput } from "@/types/announcement";

describe("getAnnouncements", () => {
  it("公開日（publishedAt）の降順で全件を返す", async () => {
    const result = await getAnnouncements();

    const sortedIds = [...result]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map((item) => item.id);

    expect(result.map((item) => item.id)).toEqual(sortedIds);
  });

  it("モックデータの全件を返す", async () => {
    const result = await getAnnouncements();

    expect(result).toHaveLength(5);
    expect(new Set(result.map((item) => item.id))).toEqual(
      new Set(["1", "2", "3", "4", "5"])
    );
  });
});

describe("getAnnouncementById", () => {
  it("存在するIDに対応するAnnouncementを返す", async () => {
    const result = await getAnnouncementById("1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("1");
    expect(result?.title).toBe(
      "システムメンテナンスのお知らせ（7月15日 2:00〜4:00）"
    );
    expect(result?.category).toBe("maintenance");
  });

  it("存在しないIDに対してnullを返す", async () => {
    const result = await getAnnouncementById("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("getRecentAnnouncements（既存挙動のリグレッション防止）", () => {
  it("デフォルトで最新3件を公開日降順で返す", async () => {
    const result = await getRecentAnnouncements();

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("limit指定時にその件数を返す", async () => {
    const result = await getRecentAnnouncements({ limit: 2 });

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("limitがモックデータ件数を超える場合は全件を返す", async () => {
    const result = await getRecentAnnouncements({ limit: 100 });

    expect(result).toHaveLength(5);
    expect(result.map((item) => item.id)).toEqual(["1", "2", "3", "4", "5"]);
  });
});

// 以下のテストは`createAnnouncement`等でお知らせを追加するため、上記の既存件数
// 前提のテスト（"モックデータの全件を返す"等）より後ろに配置する。
describe("自社国スコープフィルタ（配信対象）", () => {
  it("全体一律のお知らせは自社国スコープの取得結果に含まれる", async () => {
    const result = await getAnnouncements();
    expect(result.every((item) => item.targeting.scope === "all")).toBe(true);
  });

  it("自社国を含まない配信対象のお知らせは自社国スコープの取得結果から除外される", async () => {
    const input: CreateAnnouncementInput = {
      title: "他国向けお知らせ",
      body: "本文",
      category: "other",
      targeting: { scope: "countries", countries: ["US"] },
      actionRequired: false,
    };
    const created = await createAnnouncement(input);

    const scoped = await getAnnouncements();
    const all = await getAllAnnouncements();

    expect(scoped.some((item) => item.id === created.id)).toBe(false);
    expect(all.some((item) => item.id === created.id)).toBe(true);
  });

  it("自社国を含む配信対象のお知らせは自社国スコープの取得結果に含まれる", async () => {
    const input: CreateAnnouncementInput = {
      title: "ベトナム向けお知らせ",
      body: "本文",
      category: "other",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: false,
    };
    const created = await createAnnouncement(input);

    const scoped = await getAnnouncements();
    expect(scoped.some((item) => item.id === created.id)).toBe(true);
  });

  it("配信対象外のIDをgetAnnouncementByIdで取得するとnullになる", async () => {
    const input: CreateAnnouncementInput = {
      title: "他国向け詳細テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "countries", countries: ["US"] },
      actionRequired: false,
    };
    const created = await createAnnouncement(input);

    const scopedResult = await getAnnouncementById(created.id);
    const unscopedResult = await getAnnouncementByIdForHelpdesk(created.id);

    expect(scopedResult).toBeNull();
    expect(unscopedResult?.id).toBe(created.id);
  });
});

describe("createAnnouncement / updateAnnouncement / deleteAnnouncement", () => {
  it("作成したお知らせがgetAllAnnouncementsに反映される", async () => {
    const created = await createAnnouncement({
      title: "新規作成テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    expect(created.id).toBeTruthy();
    expect(typeof created.publishedAt).toBe("string");

    const all = await getAllAnnouncements();
    expect(all.some((item) => item.id === created.id)).toBe(true);
  });

  it("更新した内容がgetAnnouncementByIdForHelpdeskに反映される", async () => {
    const created = await createAnnouncement({
      title: "更新前タイトル",
      body: "更新前本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    await updateAnnouncement(created.id, {
      title: "更新後タイトル",
      body: "更新後本文",
      category: "policy",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    const result = await getAnnouncementByIdForHelpdesk(created.id);
    expect(result?.title).toBe("更新後タイトル");
    expect(result?.category).toBe("policy");
  });

  it("削除したお知らせはgetAllAnnouncementsから除去される", async () => {
    const created = await createAnnouncement({
      title: "削除テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    await deleteAnnouncement(created.id);

    const all = await getAllAnnouncements();
    expect(all.some((item) => item.id === created.id)).toBe(false);
  });

  it("存在しないIDのupdateAnnouncementはエラーになる", async () => {
    await expect(
      updateAnnouncement("does-not-exist", {
        title: "t",
        body: "b",
        category: "other",
        targeting: { scope: "all" },
        actionRequired: false,
      })
    ).rejects.toThrow();
  });

  it("存在しないIDのdeleteAnnouncementはエラーになる", async () => {
    await expect(deleteAnnouncement("does-not-exist")).rejects.toThrow();
  });

  it("対象以外のお知らせには影響しない", async () => {
    const before = await getAnnouncementByIdForHelpdesk("1");

    const created = await createAnnouncement({
      title: "影響確認用",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });
    await updateAnnouncement(created.id, {
      title: "変更後",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    const after = await getAnnouncementByIdForHelpdesk("1");
    expect(after).toEqual(before);
  });

  it("actionRequired・公開期間・対応期限を含む全フィールドを更新する", async () => {
    const created = await createAnnouncement({
      title: "更新確認用",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    await updateAnnouncement(created.id, {
      title: created.title,
      body: created.body,
      category: created.category,
      targeting: created.targeting,
      actionRequired: true,
      publishStartDate: "2026-08-01",
      publishEndDate: "2026-08-31",
      dueDate: "2026-08-15",
    });

    const updated = await getAnnouncementByIdForHelpdesk(created.id);
    expect(updated?.actionRequired).toBe(true);
    expect(updated?.publishStartDate).toBe("2026-08-01");
    expect(updated?.publishEndDate).toBe("2026-08-31");
    expect(updated?.dueDate).toBe("2026-08-15");
  });
});

describe("公開期間による表示制御", () => {
  function isoDateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  it("公開期間が未設定の場合は常に表示される", async () => {
    const created = await createAnnouncement({
      title: "常時公開テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    const result = await getAnnouncementById(created.id);
    expect(result?.id).toBe(created.id);
  });

  it("公開開始日が未来の場合、申請者側取得関数から除外されヘルプデスク向けには表示される", async () => {
    const created = await createAnnouncement({
      title: "開始前テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(5),
    });

    expect(await getAnnouncementById(created.id)).toBeNull();
    const helpdeskResult = await getAnnouncementByIdForHelpdesk(created.id);
    expect(helpdeskResult?.id).toBe(created.id);
  });

  it("公開終了日が過去の場合、申請者側取得関数から除外される", async () => {
    const created = await createAnnouncement({
      title: "終了後テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishEndDate: isoDateOffset(-5),
    });

    expect(await getAnnouncementById(created.id)).toBeNull();
  });

  it("公開期間内の場合は表示される", async () => {
    const created = await createAnnouncement({
      title: "期間内テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(-5),
      publishEndDate: isoDateOffset(5),
    });

    const result = await getAnnouncementById(created.id);
    expect(result?.id).toBe(created.id);
  });

  it("getAllAnnouncementsは公開期間に関わらず全件を返す", async () => {
    const created = await createAnnouncement({
      title: "全件確認用",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(5),
    });

    const all = await getAllAnnouncements();
    expect(all.some((item) => item.id === created.id)).toBe(true);
  });

  it("getRecentAnnouncementsは公開期間外のお知らせを除外する", async () => {
    const created = await createAnnouncement({
      title: "ウィジェット除外テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(5),
    });

    const recent = await getRecentAnnouncements({ limit: 100 });
    expect(recent.some((item) => item.id === created.id)).toBe(false);
  });
});
