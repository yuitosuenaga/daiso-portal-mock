import { describe, expect, it } from "vitest";

import {
  getAnnouncementById,
  getAnnouncements,
  getRecentAnnouncements,
} from "@/lib/api/announcements";

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
