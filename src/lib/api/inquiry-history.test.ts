import { describe, expect, it } from "vitest";

import {
  appendInquiryHistoryEntry,
  getInquiryHistory,
} from "@/lib/api/inquiry-history";

describe("getInquiryHistory / appendInquiryHistoryEntry", () => {
  it("履歴がない問い合わせに対しては空配列を返す", async () => {
    const result = await getInquiryHistory("inquiry-without-history");

    expect(result).toEqual([]);
  });

  it("追加したエントリが直後の取得結果に反映される", async () => {
    const inquiryId = "history-test-001";

    await appendInquiryHistoryEntry({
      inquiryId,
      type: "claimed",
      actorName: "Test Staff",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    const result = await getInquiryHistory(inquiryId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      inquiryId,
      type: "claimed",
      actorName: "Test Staff",
    });
    expect(typeof result[0].id).toBe("string");
  });

  it("発生時刻の降順で返す", async () => {
    const inquiryId = "history-test-002";

    await appendInquiryHistoryEntry({
      inquiryId,
      type: "claimed",
      actorName: "Staff A",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });
    await appendInquiryHistoryEntry({
      inquiryId,
      type: "status_changed",
      actorName: "Staff A",
      occurredAt: "2026-07-02T00:00:00.000Z",
      detail: "new -> in_progress",
    });

    const result = await getInquiryHistory(inquiryId);

    expect(result.map((entry) => entry.type)).toEqual([
      "status_changed",
      "claimed",
    ]);
  });

  it("occurredAtが同一時刻の場合は挿入順を降順（後から追加した方が先）に並べる", async () => {
    const inquiryId = "history-test-tie-break";
    const sameTimestamp = "2026-07-01T00:00:00.000Z";

    await appendInquiryHistoryEntry({
      inquiryId,
      type: "claimed",
      actorName: "Staff A",
      occurredAt: sameTimestamp,
    });
    await appendInquiryHistoryEntry({
      inquiryId,
      type: "released",
      actorName: "Staff A",
      occurredAt: sameTimestamp,
    });

    const result = await getInquiryHistory(inquiryId);

    expect(result.map((entry) => entry.type)).toEqual(["released", "claimed"]);
  });

  it("他の問い合わせの履歴には影響しない", async () => {
    const inquiryIdA = "history-test-003";
    const inquiryIdB = "history-test-004";

    await appendInquiryHistoryEntry({
      inquiryId: inquiryIdA,
      type: "reply_sent",
      actorName: "Staff A",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    const resultB = await getInquiryHistory(inquiryIdB);

    expect(resultB).toEqual([]);
  });
});
