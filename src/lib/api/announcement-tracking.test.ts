import { describe, expect, it } from "vitest";

import {
  getAnnouncementRecipientStatuses,
  getAnnouncementTrackingSummary,
  isReminderPendingForCompany,
  sendAnnouncementReminders,
} from "@/lib/api/announcement-tracking";

describe("getAnnouncementTrackingSummary", () => {
  it("対応要否ありのお知らせでは確認済み・実施済みの両方を返す", async () => {
    const result = await getAnnouncementTrackingSummary("1");

    expect(result.totalRecipients).toBe(16);
    expect(result.confirmedCount).toBe(10);
    expect(result.completedCount).toBe(6);
  });

  it("対応要否なしのお知らせでは実施済み件数がnullになる", async () => {
    const result = await getAnnouncementTrackingSummary("2");

    expect(result.totalRecipients).toBe(16);
    expect(result.confirmedCount).toBe(12);
    expect(result.completedCount).toBeNull();
  });

  it("存在しないお知らせIDに対しては全て0（実施済みはnull）を返す", async () => {
    const result = await getAnnouncementTrackingSummary("not-exist");

    expect(result).toEqual({
      totalRecipients: 0,
      confirmedCount: 0,
      completedCount: null,
    });
  });
});

describe("getAnnouncementRecipientStatuses", () => {
  it("配信対象（全体一律）でスコープされた全担当者を返す", async () => {
    const result = await getAnnouncementRecipientStatuses("1");

    expect(result).toHaveLength(16);
    expect(new Set(result.map((status) => status.companyCode)).size).toBe(8);
  });

  it("存在しないお知らせIDに対しては空配列を返す", async () => {
    const result = await getAnnouncementRecipientStatuses("not-exist");

    expect(result).toEqual([]);
  });
});

describe("isReminderPendingForCompany", () => {
  it("未対応のままリマインドが送信されている会社に対してtrueを返す", async () => {
    const result = await isReminderPendingForCompany("5", "vn-daiso-vietnam");

    expect(result).toBe(true);
  });

  it("対応が完了している会社に対してはfalseを返す", async () => {
    const result = await isReminderPendingForCompany(
      "5",
      "jp-daiso-japan-trading"
    );

    expect(result).toBe(false);
  });

  it("リマインドが送信されていないお知らせに対してはfalseを返す", async () => {
    const result = await isReminderPendingForCompany("1", "vn-daiso-vietnam");

    expect(result).toBe(false);
  });
});

describe("sendAnnouncementReminders", () => {
  it("対象担当者のみのreminderSentAtを更新し、自社宛リマインド有無判定に反映される", async () => {
    const before = await isReminderPendingForCompany("3", "sg-daiso-singapore");
    expect(before).toBe(false);

    await sendAnnouncementReminders("3", ["sg-daiso-singapore-2"]);

    const after = await isReminderPendingForCompany("3", "sg-daiso-singapore");
    expect(after).toBe(true);

    const statuses = await getAnnouncementRecipientStatuses("3");
    const target = statuses.find(
      (status) => status.recipientId === "sg-daiso-singapore-2"
    );
    const others = statuses.filter(
      (status) => status.recipientId !== "sg-daiso-singapore-2"
    );

    expect(target?.reminderSentAt).not.toBeNull();
    expect(others.every((status) => status.reminderSentAt === null)).toBe(true);
  });

  it("空配列を渡した場合は何もせず正常終了する", async () => {
    await expect(sendAnnouncementReminders("1", [])).resolves.toBeUndefined();
  });
});
