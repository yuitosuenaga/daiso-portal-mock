import { describe, expect, it } from "vitest";

import {
  createInquiry,
  getAllInquiries,
  getInquiries,
  getInquiryById,
  getInquiryStatusSummary,
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
