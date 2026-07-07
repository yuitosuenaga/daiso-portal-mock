import { describe, expect, it } from "vitest";

import { sortInquiriesForPriorityPreview } from "@/lib/dashboard-priority-inquiries";
import type { Inquiry } from "@/types/inquiry";

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-x",
    category: "defect",
    urgency: "low",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

describe("sortInquiriesForPriorityPreview", () => {
  it("未着手（claimなし）のものを着手済みのものより先に表示する", () => {
    const inquiries = [
      buildInquiry({
        id: "claimed",
        urgency: "high",
        claim: { staffName: "Staff A", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
      buildInquiry({ id: "unclaimed", urgency: "low" }),
    ];

    const result = sortInquiriesForPriorityPreview(inquiries);

    expect(result.map((item) => item.id)).toEqual(["unclaimed", "claimed"]);
  });

  it("claimがundefinedの場合も未着手として扱う", () => {
    const inquiries = [
      buildInquiry({
        id: "claimed",
        claim: { staffName: "Staff A", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
      buildInquiry({ id: "unclaimed-undefined", claim: undefined }),
    ];

    const result = sortInquiriesForPriorityPreview(inquiries);

    expect(result.map((item) => item.id)).toEqual(["unclaimed-undefined", "claimed"]);
  });

  it("同じ着手状況内では緊急度（高→中→低）で並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "low", urgency: "low", createdAt: "2026-06-03T00:00:00.000Z" }),
      buildInquiry({ id: "high", urgency: "high", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({ id: "medium", urgency: "medium", createdAt: "2026-06-02T00:00:00.000Z" }),
    ];

    const result = sortInquiriesForPriorityPreview(inquiries);

    expect(result.map((item) => item.id)).toEqual(["high", "medium", "low"]);
  });

  it("同じ緊急度・同じ着手状況内では受付日時（createdAt）の降順で並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "older", urgency: "high", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({ id: "newer", urgency: "high", createdAt: "2026-06-05T00:00:00.000Z" }),
    ];

    const result = sortInquiriesForPriorityPreview(inquiries);

    expect(result.map((item) => item.id)).toEqual(["newer", "older"]);
  });

  it("未着手優先 > 緊急度 > 受付日時の順で総合的に並び替える", () => {
    const inquiries = [
      buildInquiry({
        id: "claimed-high",
        urgency: "high",
        createdAt: "2026-06-05T00:00:00.000Z",
        claim: { staffName: "Staff A", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
      buildInquiry({ id: "unclaimed-low", urgency: "low", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({
        id: "unclaimed-high-older",
        urgency: "high",
        createdAt: "2026-06-01T00:00:00.000Z",
      }),
      buildInquiry({
        id: "unclaimed-high-newer",
        urgency: "high",
        createdAt: "2026-06-04T00:00:00.000Z",
      }),
    ];

    const result = sortInquiriesForPriorityPreview(inquiries);

    expect(result.map((item) => item.id)).toEqual([
      "unclaimed-high-newer",
      "unclaimed-high-older",
      "unclaimed-low",
      "claimed-high",
    ]);
  });

  it("元の配列を変更しない", () => {
    const inquiries = [
      buildInquiry({ id: "a", urgency: "low" }),
      buildInquiry({
        id: "b",
        urgency: "high",
        claim: { staffName: "Staff A", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
    ];
    const original = [...inquiries];

    sortInquiriesForPriorityPreview(inquiries);

    expect(inquiries).toEqual(original);
  });
});
