import { describe, expect, it } from "vitest";

import {
  createInquiry,
  getInquiries,
  getInquiryById,
  getInquiryStatusSummary,
} from "@/lib/api/inquiries";
import type { CreateInquiryInput } from "@/types/inquiry";

describe("getInquiries", () => {
  it("送信日時（createdAt）の降順で全件を返す", async () => {
    const result = await getInquiries();

    const sortedIds = [...result]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => item.id);

    expect(result.map((item) => item.id)).toEqual(sortedIds);
  });

  it("モックデータの全件を返す", async () => {
    const result = await getInquiries();

    expect(result).toHaveLength(8);
    expect(new Set(result.map((item) => item.id))).toEqual(
      new Set([
        "inquiry-001",
        "inquiry-002",
        "inquiry-003",
        "inquiry-004",
        "inquiry-005",
        "inquiry-006",
        "inquiry-007",
        "inquiry-008",
      ])
    );
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

describe("getInquiryStatusSummary（既存挙動のリグレッション防止）", () => {
  it("new/in_progress/resolvedの固定件数を返す", async () => {
    const result = await getInquiryStatusSummary();

    expect(result).toEqual({
      new: 3,
      in_progress: 7,
      resolved: 42,
    });
  });
});
