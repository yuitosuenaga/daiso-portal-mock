import { describe, expect, it } from "vitest";

import {
  createInquiry,
  getAllInquiries,
  getAllInquiryStatusSummary,
  getInquiries,
  getInquiryById,
  getInquiryStatusSummary,
  setInquiryClaim,
  updateInquiryStatus,
} from "@/lib/api/inquiries";
import type { CreateInquiryInput } from "@/types/inquiry";

describe("getInquiries", () => {
  it("送信日時（createdAt）の降順で自社分のみを返す", async () => {
    const result = await getInquiries();

    const sortedIds = [...result]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => item.id);

    expect(result.map((item) => item.id)).toEqual(sortedIds);
  });

  it("自社（フェーズ1の固定モック会社）に紐づく問い合わせのみを返す", async () => {
    const result = await getInquiries();

    expect(result.length).toBeGreaterThan(0);
    const companyNames = new Set(result.map((item) => item.submittedBy.companyName));
    expect(companyNames.size).toBe(1);

    const allResult = await getAllInquiries();
    expect(result.length).toBeLessThan(allResult.length);
  });
});

describe("getAllInquiries", () => {
  it("絞り込みを行わずモックデータ全件を送信日時降順で返す", async () => {
    const result = await getAllInquiries();

    const sortedIds = [...result]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => item.id);
    expect(result.map((item) => item.id)).toEqual(sortedIds);

    const companyNames = new Set(result.map((item) => item.submittedBy.companyName));
    expect(companyNames.size).toBeGreaterThan(1);
  });

  it("getInquiries() の戻り値は getAllInquiries() の部分集合である", async () => {
    const scoped = await getInquiries();
    const all = await getAllInquiries();

    const allIds = new Set(all.map((item) => item.id));
    expect(scoped.every((item) => allIds.has(item.id))).toBe(true);
  });

  it("originalLanguageがja以外の問い合わせ全件にtranslatedTextが設定されている", async () => {
    const all = await getAllInquiries();
    const nonJapaneseInquiries = all.filter(
      (item) => item.originalLanguage !== "ja"
    );

    expect(nonJapaneseInquiries.length).toBeGreaterThan(0);
    nonJapaneseInquiries.forEach((item) => {
      expect(item.translatedText).toBeTruthy();
    });
  });

  it("originalLanguageがjaの問い合わせにはtranslatedTextを設定しない", async () => {
    const all = await getAllInquiries();
    const japaneseInquiries = all.filter(
      (item) => item.originalLanguage === "ja"
    );

    expect(japaneseInquiries.length).toBeGreaterThan(0);
    japaneseInquiries.forEach((item) => {
      expect(item.translatedText).toBeUndefined();
    });
  });
});

describe("getInquiryById", () => {
  it("存在するIDに対応するInquiryを返す", async () => {
    const result = await getInquiryById("inquiry-001");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("inquiry-001");
    expect(result?.category).toBe("defect");
    expect(result?.status).toBe("new");
  });

  it("存在しないIDに対してnullを返す", async () => {
    const result = await getInquiryById("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("createInquiry（既存挙動のリグレッション防止）", () => {
  it("入力内容をそのまま反映し、一意なidを付与したInquiryを返す", async () => {
    const input: CreateInquiryInput = {
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト用の問い合わせ本文です。",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
    };

    const result = await createInquiry(input);

    expect(result.id).toBeTruthy();
    expect(typeof result.id).toBe("string");
    expect(result).toMatchObject(input);
  });

  it("呼び出しごとに異なるidを付与する", async () => {
    const input: CreateInquiryInput = {
      category: "system",
      urgency: "low",
      storeRegion: "Seoul",
      originalText: "another inquiry",
      originalLanguage: "en",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: {
        companyName: "Another Company",
        country: "KR",
      },
    };

    const first = await createInquiry(input);
    const second = await createInquiry(input);

    expect(first.id).not.toBe(second.id);
  });
});

describe("setInquiryClaim", () => {
  it("対象の問い合わせに対応中フラグを設定する", async () => {
    const result = await setInquiryClaim("inquiry-003", "Test Staff");

    expect(result.claim).not.toBeNull();
    expect(result.claim?.staffName).toBe("Test Staff");
    expect(typeof result.claim?.claimedAt).toBe("string");
  });

  it("nullを渡すと対応中フラグを解除する", async () => {
    await setInquiryClaim("inquiry-003", "Test Staff");
    const result = await setInquiryClaim("inquiry-003", null);

    expect(result.claim).toBeNull();
  });

  it("対象以外の問い合わせには影響しない", async () => {
    const before = await getInquiryById("inquiry-004");
    await setInquiryClaim("inquiry-003", "Test Staff");
    const after = await getInquiryById("inquiry-004");

    expect(after?.claim).toEqual(before?.claim);
  });

  it("存在しないIDを渡すとエラーになる", async () => {
    await expect(setInquiryClaim("does-not-exist", "Test Staff")).rejects.toThrow();
  });
});

describe("updateInquiryStatus", () => {
  it("対象の問い合わせのステータスを変更する", async () => {
    const result = await updateInquiryStatus("inquiry-002", "resolved");

    expect(result.status).toBe("resolved");
    const refetched = await getInquiryById("inquiry-002");
    expect(refetched?.status).toBe("resolved");
  });

  it("対象以外の問い合わせには影響しない", async () => {
    const before = await getInquiryById("inquiry-005");
    await updateInquiryStatus("inquiry-002", "in_progress");
    const after = await getInquiryById("inquiry-005");

    expect(after?.status).toBe(before?.status);
  });

  it("存在しないIDを渡すとエラーになる", async () => {
    await expect(updateInquiryStatus("does-not-exist", "resolved")).rejects.toThrow();
  });
});

describe("getInquiryStatusSummary", () => {
  it("自社の問い合わせからステータス別件数を動的に集計する", async () => {
    const inquiries = await getInquiries();
    const summary = await getInquiryStatusSummary();

    const expected = {
      new: inquiries.filter((item) => item.status === "new").length,
      in_progress: inquiries.filter((item) => item.status === "in_progress").length,
      resolved: inquiries.filter((item) => item.status === "resolved").length,
    };

    expect(summary).toEqual(expected);
    expect(summary.new + summary.in_progress + summary.resolved).toBe(
      inquiries.length
    );
  });
});

describe("getAllInquiryStatusSummary", () => {
  it("全社の問い合わせからステータス別件数を動的に集計する", async () => {
    const allInquiries = await getAllInquiries();
    const summary = await getAllInquiryStatusSummary();

    const expected = {
      new: allInquiries.filter((item) => item.status === "new").length,
      in_progress: allInquiries.filter((item) => item.status === "in_progress").length,
      resolved: allInquiries.filter((item) => item.status === "resolved").length,
    };

    expect(summary).toEqual(expected);
    expect(summary.new + summary.in_progress + summary.resolved).toBe(
      allInquiries.length
    );
  });

  it("複数会社・複数ステータスにまたがるモックデータで件数が正しく算出される", async () => {
    const allInquiries = await getAllInquiries();
    const companyNames = new Set(allInquiries.map((item) => item.submittedBy.companyName));
    expect(companyNames.size).toBeGreaterThan(1);

    const summary = await getAllInquiryStatusSummary();

    expect(summary).toEqual({ new: 3, in_progress: 4, resolved: 3 });
  });

  it("自社スコープの集計（getInquiryStatusSummary）以上の件数を集計する", async () => {
    const ownSummary = await getInquiryStatusSummary();
    const allSummary = await getAllInquiryStatusSummary();

    expect(allSummary.new).toBeGreaterThanOrEqual(ownSummary.new);
    expect(allSummary.in_progress).toBeGreaterThanOrEqual(ownSummary.in_progress);
    expect(allSummary.resolved).toBeGreaterThanOrEqual(ownSummary.resolved);
  });
});
