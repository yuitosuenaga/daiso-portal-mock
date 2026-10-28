import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
    },
    inquiry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
    inquiryHistoryEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { CompanyNotFoundError } from "@/lib/server/company-service";
import {
  appendHistoryEntry,
  appendReplyWithAutoTransition,
  changeStatusWithHistory,
  ClaimOwnershipError,
  createInquiryRecord,
  DoubleClaimError,
  findInquiryById,
  findInquiryForCompany,
  InquiryNotFoundError,
  listAllInquiries,
  listHistory,
  listInquiriesForCompany,
  listUnreadReplyInquiryIds,
  markInquiryRead,
  setClaim,
} from "@/lib/server/inquiry-service";

const baseInquiryRecord = {
  id: "inquiry-1",
  title: "商品破損についての問い合わせ",
  category: "defect",
  urgency: "high",
  storeRegion: "Kanto",
  originalText: "破損しています",
  originalLanguage: "ja",
  translatedText: null,
  status: "new",
  createdAt: new Date("2026-06-28T09:15:00.000Z"),
  companyId: "company-1",
  submittedByCompanyName: "Daiso Japan Trading Co.",
  submittedByCountry: "JP",
  claimedByStaffId: null,
  claimedByStaff: null,
  claimedAt: null,
  attachments: [],
  translations: [],
  translationStatus: "pending",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as never);
  vi.mocked(prisma.company.findUnique).mockResolvedValue({
    name: "Daiso Japan",
    country: "JP",
  } as never);
});

describe("createInquiryRecord", () => {
  const BASE_DATA = {
    title: "商品破損についての問い合わせ",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText: "破損しています",
    originalLanguage: "ja",
  } as const;

  it("status は new 固定、会社名・国は Company から導出し、createdAt は DB 既定に任せる", async () => {
    vi.mocked(prisma.inquiry.create).mockResolvedValue(baseInquiryRecord as never);

    await createInquiryRecord({ data: BASE_DATA, companyId: "company-1" });

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: "company-1" },
      select: { name: true, country: true },
    });
    const createArgs = vi.mocked(prisma.inquiry.create).mock.calls[0]?.[0];
    expect(createArgs?.data).toMatchObject({
      status: "new",
      companyId: "company-1",
      submittedByCompanyName: "Daiso Japan",
      submittedByCountry: "JP",
    });
    expect(createArgs?.data).not.toHaveProperty("createdAt");
  });

  it("会社が存在しない場合は CompanyNotFoundError を投げ、create を呼ばない", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null);

    await expect(
      createInquiryRecord({ data: BASE_DATA, companyId: "missing" })
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it("セッションのcompanyIdを永続化し、既存Inquiry型に整形した結果を返す", async () => {
    vi.mocked(prisma.inquiry.create).mockResolvedValue(baseInquiryRecord as never);

    const result = await createInquiryRecord({
      data: {
        title: "商品破損についての問い合わせ",
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "破損しています",
        originalLanguage: "ja",
      },
      companyId: "company-1",
    });

    expect(prisma.inquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: "company-1" }),
      })
    );
    expect(result.id).toBe("inquiry-1");
    expect(result.submittedBy).toEqual({
      companyName: "Daiso Japan Trading Co.",
      country: "JP",
    });
    expect(result.claim).toBeNull();
  });

  it("translatedTextを書き込まない（DB既定のnullのまま維持する）", async () => {
    vi.mocked(prisma.inquiry.create).mockResolvedValue(baseInquiryRecord as never);

    const result = await createInquiryRecord({
      data: {
        title: "追加発注のお願い",
        category: "order",
        urgency: "medium",
        storeRegion: "West Coast",
        originalText: "We would like to place an additional order.",
        originalLanguage: "en",
      },
      companyId: "company-1",
    });

    const createArgs = vi.mocked(prisma.inquiry.create).mock.calls[0]?.[0];
    expect(createArgs?.data).not.toHaveProperty("translatedText");
    expect(result.translatedText).toBeUndefined();
  });

  it("添付ファイルを含むinclude（詳細用）でレコードを取得する", async () => {
    vi.mocked(prisma.inquiry.create).mockResolvedValue(baseInquiryRecord as never);

    await createInquiryRecord({
      data: {
        title: "商品破損についての問い合わせ",
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "破損しています",
        originalLanguage: "ja",
      },
      companyId: "company-1",
    });

    expect(prisma.inquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { claimedByStaff: true, attachments: true, translations: true },
      })
    );
  });
});

describe("listInquiriesForCompany", () => {
  it("指定したcompanyIdでのみ絞り込む", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([baseInquiryRecord] as never);

    const result = await listInquiriesForCompany("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company-1" } })
    );
    expect(result).toHaveLength(1);
  });

  it("添付ファイルを含まないincludeで取得する（一覧の性能最適化）", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([baseInquiryRecord] as never);

    await listInquiriesForCompany("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { claimedByStaff: true, translations: true } })
    );
  });
});

describe("listAllInquiries", () => {
  it("会社による絞り込みを行わず全件取得する", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([baseInquiryRecord] as never);

    await listAllInquiries();

    const callArgs = vi.mocked(prisma.inquiry.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where).toBeUndefined();
  });

  it("添付ファイルを含まないincludeで取得する（一覧の性能最適化）", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([baseInquiryRecord] as never);

    await listAllInquiries();

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { claimedByStaff: true, translations: true } })
    );
  });

  it("attachmentsフィールドを持たないレコード（一覧includeの実際の形）でattachments: undefinedを返す", async () => {
    const recordWithoutAttachments: Record<string, unknown> = {
      ...baseInquiryRecord,
    };
    delete recordWithoutAttachments.attachments;
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      recordWithoutAttachments,
    ] as never);

    const result = await listAllInquiries();

    expect(result[0]?.attachments).toBeUndefined();
  });
});

describe("findInquiryById", () => {
  it("該当データがない場合、nullを返す", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);

    const result = await findInquiryById("missing");

    expect(result).toBeNull();
  });

  it("添付ファイルを含むincludeで取得する（詳細）", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(baseInquiryRecord as never);

    await findInquiryById("inquiry-1");

    expect(prisma.inquiry.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { claimedByStaff: true, attachments: true, translations: true },
      })
    );
  });
});

describe("findInquiryForCompany", () => {
  it("該当companyIdの問い合わせが見つかれば返す", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValue(baseInquiryRecord as never);

    const result = await findInquiryForCompany("inquiry-1", "company-1");

    expect(prisma.inquiry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inquiry-1", companyId: "company-1" } })
    );
    expect(result?.id).toBe("inquiry-1");
  });

  it("他社のcompanyIdでは見つからずnullを返す", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValue(null);

    const result = await findInquiryForCompany("inquiry-1", "other-company");

    expect(result).toBeNull();
  });

  it("添付ファイルを含むincludeで取得する（詳細）", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValue(baseInquiryRecord as never);

    await findInquiryForCompany("inquiry-1", "company-1");

    expect(prisma.inquiry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { claimedByStaff: true, attachments: true, translations: true },
      })
    );
  });
});

const DETAIL_INCLUDE = { claimedByStaff: true, attachments: true, translations: true };

describe("setClaim", () => {
  const staff1 = { staffId: "staff-1", displayName: "田中 太郎" };

  it("claimは claimedByStaffId: null を条件にした条件付き更新で行い、詳細用includeで読み直した結果を返す", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue({
      ...baseInquiryRecord,
      claimedByStaffId: "staff-1",
      claimedByStaff: { displayName: "田中 太郎" },
      claimedAt: new Date("2026-07-01T00:00:00.000Z"),
    } as never);

    const result = await setClaim("inquiry-1", staff1, "staff-1");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", claimedByStaffId: null },
      data: { claimedByStaffId: "staff-1", claimedAt: expect.any(Date) },
    });
    expect(prisma.inquiry.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      include: DETAIL_INCLUDE,
    });
    expect(result.claim).toEqual({
      staffName: "田中 太郎",
      claimedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("claim: 更新0件で問い合わせが存在しなければInquiryNotFoundError", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);

    await expect(setClaim("inquiry-1", staff1, "staff-1")).rejects.toThrow(
      InquiryNotFoundError
    );
  });

  it("claim: 更新0件で問い合わせが存在すればDoubleClaimError", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({ id: "inquiry-1" } as never);

    await expect(setClaim("inquiry-1", staff1, "staff-1")).rejects.toThrow(
      DoubleClaimError
    );
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("解除は claimedByStaffId: 実行者 を条件にした条件付き更新で行う", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
      baseInquiryRecord as never
    );

    const result = await setClaim("inquiry-1", null, "staff-1");

    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", claimedByStaffId: "staff-1" },
      data: { claimedByStaffId: null, claimedAt: null },
    });
    expect(result.claim).toBeNull();
  });

  it("解除: 更新0件で問い合わせが存在しなければInquiryNotFoundError", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);

    await expect(setClaim("inquiry-1", null, "staff-1")).rejects.toThrow(
      InquiryNotFoundError
    );
  });

  it("解除: 更新0件で未claimなら冪等な無操作として成功する（履歴は残さない）", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      claimedByStaffId: null,
    } as never);
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
      baseInquiryRecord as never
    );

    const result = await setClaim("inquiry-1", null, "staff-2", {
      historyActorName: "鈴木 花子",
    });

    expect(result.claim).toBeNull();
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("解除: 更新0件で他人（有効）がclaim中ならClaimOwnershipError", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      claimedByStaffId: "staff-1",
      claimedByStaff: { isActive: true },
    } as never);

    await expect(setClaim("inquiry-1", null, "staff-2")).rejects.toThrow(
      ClaimOwnershipError
    );
    expect(prisma.inquiry.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("解除: 読み取りは担当者のisActiveを含むselectで行う", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      claimedByStaffId: null,
      claimedByStaff: null,
    } as never);
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
      baseInquiryRecord as never
    );

    await setClaim("inquiry-1", null, "staff-2");

    expect(prisma.inquiry.findUnique).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      select: {
        claimedByStaffId: true,
        claimedByStaff: { select: { isActive: true } },
      },
    });
  });

  it("解除: claimedByStaffがundefinedなら拒否側に倒す", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      claimedByStaffId: "staff-1",
    } as never);

    await expect(setClaim("inquiry-1", null, "staff-2")).rejects.toThrow(
      ClaimOwnershipError
    );
    expect(prisma.inquiry.updateMany).toHaveBeenCalledTimes(1);
  });

  describe("担当者が無効化されている場合の他スタッフによる解除", () => {
    const inactiveOwner = {
      claimedByStaffId: "staff-1",
      claimedByStaff: { isActive: false },
    };

    it("読んだ担当者IDを条件にした2回目のupdateManyで解除し、claimはnullになる", async () => {
      vi.mocked(prisma.inquiry.updateMany)
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.inquiry.findUnique).mockResolvedValueOnce(inactiveOwner as never);
      vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
        baseInquiryRecord as never
      );

      const result = await setClaim("inquiry-1", null, "staff-2");

      expect(prisma.inquiry.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.inquiry.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: "inquiry-1", claimedByStaffId: "staff-2" },
        data: { claimedByStaffId: null, claimedAt: null },
      });
      expect(prisma.inquiry.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: "inquiry-1", claimedByStaffId: "staff-1" },
        data: { claimedByStaffId: null, claimedAt: null },
      });
      expect(result.claim).toBeNull();
      expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
    });

    it("historyActorName指定ならreleased履歴を実行者名で1件作る", async () => {
      vi.mocked(prisma.inquiry.updateMany)
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.inquiry.findUnique).mockResolvedValueOnce(inactiveOwner as never);
      vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
        baseInquiryRecord as never
      );

      await setClaim("inquiry-1", null, "staff-2", { historyActorName: "鈴木 花子" });

      expect(prisma.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
      expect(
        vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls[0]?.[0]?.data
      ).toMatchObject({
        inquiryId: "inquiry-1",
        type: "released",
        actorName: "鈴木 花子",
      });
    });

    it("2回目の更新が0件で読み直すと担当なしなら、成功し履歴は残さない", async () => {
      vi.mocked(prisma.inquiry.updateMany)
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });
      vi.mocked(prisma.inquiry.findUnique)
        .mockResolvedValueOnce(inactiveOwner as never)
        .mockResolvedValueOnce({ claimedByStaffId: null, claimedByStaff: null } as never);
      vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
        baseInquiryRecord as never
      );

      const result = await setClaim("inquiry-1", null, "staff-2", {
        historyActorName: "鈴木 花子",
      });

      expect(result.claim).toBeNull();
      expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
    });

    it("2回目の更新が0件で読み直すと有効な別スタッフが担当中ならClaimOwnershipError", async () => {
      vi.mocked(prisma.inquiry.updateMany)
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });
      vi.mocked(prisma.inquiry.findUnique)
        .mockResolvedValueOnce(inactiveOwner as never)
        .mockResolvedValueOnce({
          claimedByStaffId: "staff-3",
          claimedByStaff: { isActive: true },
        } as never);

      await expect(
        setClaim("inquiry-1", null, "staff-2", { historyActorName: "鈴木 花子" })
      ).rejects.toThrow(ClaimOwnershipError);
      expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
    });
  });

  it("historyActorName指定かつ更新1件のとき、同じtx内でclaimed履歴を作る", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
      baseInquiryRecord as never
    );

    await setClaim("inquiry-1", staff1, "staff-1", { historyActorName: "田中 太郎" });

    expect(prisma.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls[0]?.[0]?.data).toMatchObject({
      inquiryId: "inquiry-1",
      type: "claimed",
      actorName: "田中 太郎",
    });
  });

  it("historyActorName指定かつ解除1件のとき、released履歴を作る", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
      baseInquiryRecord as never
    );

    await setClaim("inquiry-1", null, "staff-1", { historyActorName: "田中 太郎" });

    expect(vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls[0]?.[0]?.data).toMatchObject({
      type: "released",
      actorName: "田中 太郎",
    });
  });

  it("historyActorName未指定なら更新1件でも履歴を作らない", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.inquiry.findUniqueOrThrow).mockResolvedValue(
      baseInquiryRecord as never
    );

    await setClaim("inquiry-1", staff1, "staff-1");

    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });
});

describe("changeStatusWithHistory", () => {
  const options = {
    actorName: "田中 太郎",
    formatDetail: (prev: string, next: string) => `${prev} => ${next}`,
  };

  it("現在値を条件に更新し、同じtx内でformatDetailの結果を詳細にした履歴を作る", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({ status: "new" } as never);
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });

    const result = await changeStatusWithHistory("inquiry-1", "resolved", options);

    expect(result).toEqual({ changed: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", status: "new" },
      data: { status: "resolved" },
    });
    expect(vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls[0]?.[0]?.data).toMatchObject({
      inquiryId: "inquiry-1",
      type: "status_changed",
      actorName: "田中 太郎",
      detail: "new => resolved",
    });
  });

  it("同じ状態への変更は更新も履歴も行わず changed: false を返す", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({ status: "resolved" } as never);

    const result = await changeStatusWithHistory("inquiry-1", "resolved", options);

    expect(result).toEqual({ changed: false });
    expect(prisma.inquiry.updateMany).not.toHaveBeenCalled();
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("存在しないIDはInquiryNotFoundError", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);

    await expect(
      changeStatusWithHistory("missing", "resolved", options)
    ).rejects.toThrow(InquiryNotFoundError);
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("更新0件（競合）のときは読み直し、新しい前の値で再試行して成功する", async () => {
    vi.mocked(prisma.inquiry.findUnique)
      .mockResolvedValueOnce({ status: "new" } as never)
      .mockResolvedValueOnce({ status: "in_progress" } as never);
    vi.mocked(prisma.inquiry.updateMany)
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await changeStatusWithHistory("inquiry-1", "resolved", options);

    expect(result).toEqual({ changed: true });
    expect(vi.mocked(prisma.inquiry.updateMany).mock.calls[1]?.[0]).toEqual({
      where: { id: "inquiry-1", status: "in_progress" },
      data: { status: "resolved" },
    });
    expect(prisma.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls[0]?.[0]?.data).toMatchObject({
      detail: "in_progress => resolved",
    });
  });

  it("競合で3回続けて更新できなければ例外を投げ、履歴を作らない", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({ status: "new" } as never);
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });

    await expect(
      changeStatusWithHistory("inquiry-1", "resolved", options)
    ).rejects.toThrow();
    expect(prisma.inquiry.updateMany).toHaveBeenCalledTimes(3);
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });
});

describe("appendReplyWithAutoTransition", () => {
  const input = {
    actorName: "田中 太郎",
    body: "ご連絡ありがとうございます",
    attachments: undefined,
    autoTransitionDetail: "新規 → 対応中",
  };

  it("存在すれば reply_sent を作り、statusがnewなら同じtx内で in_progress へ遷移し status_changed を作る", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({ id: "inquiry-1" } as never);
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });

    await appendReplyWithAutoTransition("inquiry-1", input);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", status: "new" },
      data: { status: "in_progress" },
    });
    const calls = vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]?.data).toMatchObject({
      type: "reply_sent",
      detail: "ご連絡ありがとうございます",
      actorName: "田中 太郎",
    });
    expect(calls[1]?.[0]?.data).toMatchObject({
      type: "status_changed",
      detail: "新規 → 対応中",
    });
  });

  it("statusがnew以外（更新0件）なら status_changed を作らない", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({ id: "inquiry-1" } as never);
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });

    await appendReplyWithAutoTransition("inquiry-1", input);

    const calls = vi.mocked(prisma.inquiryHistoryEntry.create).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]?.data).toMatchObject({ type: "reply_sent" });
  });

  it("存在しないIDはInquiryNotFoundErrorで、何も作らない", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);

    await expect(appendReplyWithAutoTransition("missing", input)).rejects.toThrow(
      InquiryNotFoundError
    );
    expect(prisma.inquiryHistoryEntry.create).not.toHaveBeenCalled();
    expect(prisma.inquiry.updateMany).not.toHaveBeenCalled();
  });
});

describe("appendHistoryEntry", () => {
  it("対応履歴を追記し、既存InquiryHistoryEntry型に整形した結果を返す", async () => {
    vi.mocked(prisma.inquiryHistoryEntry.create).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-1",
      type: "claimed",
      actorName: "田中 太郎",
      occurredAt: new Date("2026-07-01T00:00:00.000Z"),
      detail: null,
      attachments: [],
    } as never);

    const result = await appendHistoryEntry({
      inquiryId: "inquiry-1",
      type: "claimed",
      actorName: "田中 太郎",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    expect(result.id).toBe("history-1");
    expect(result.type).toBe("claimed");
  });
});

describe("listHistory", () => {
  it("発生時刻の降順で対応履歴を取得する", async () => {
    vi.mocked(prisma.inquiryHistoryEntry.findMany).mockResolvedValue([]);

    await listHistory("inquiry-1");

    expect(prisma.inquiryHistoryEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inquiryId: "inquiry-1" } })
    );
  });
});

describe("listUnreadReplyInquiryIds", () => {
  it("lastReadAtがnullでヘルプデスク起点履歴が存在する場合は未読と判定する", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      {
        id: "inquiry-1",
        lastReadAt: null,
        history: [{ occurredAt: new Date("2026-07-10T00:00:00.000Z") }],
      },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company-1" } })
    );
    expect(result).toEqual(["inquiry-1"]);
  });

  it("lastReadAtがnullでもヘルプデスク起点履歴が0件の場合は未読にならない（作成直後）", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      { id: "inquiry-1", lastReadAt: null, history: [] },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(result).toEqual([]);
  });

  it("ヘルプデスク起点履歴の最新発生時刻がlastReadAtより新しい場合は未読と判定する", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      {
        id: "inquiry-1",
        lastReadAt: new Date("2026-07-01T00:00:00.000Z"),
        history: [{ occurredAt: new Date("2026-07-05T00:00:00.000Z") }],
      },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(result).toEqual(["inquiry-1"]);
  });

  it("ヘルプデスク起点履歴の最新発生時刻がlastReadAt以前の場合は未読にならない", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      {
        id: "inquiry-1",
        lastReadAt: new Date("2026-07-10T00:00:00.000Z"),
        history: [{ occurredAt: new Date("2026-07-05T00:00:00.000Z") }],
      },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(result).toEqual([]);
  });

  it("申請者自身のrequester_messageのみの問い合わせは未読判定の対象履歴に含まれず未読にならない", async () => {
    // サービス層のクエリはhistoryをHELPDESK_ORIGIN_HISTORY_TYPESでフィルタして取得するため、
    // requester_messageのみの場合はhistoryが空配列として返る想定
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      { id: "inquiry-1", lastReadAt: null, history: [] },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company-1" },
        select: expect.objectContaining({
          history: expect.objectContaining({
            where: {
              type: {
                in: ["reply_sent", "status_changed", "claimed", "released"],
              },
            },
          }),
        }),
      })
    );
    expect(result).toEqual([]);
  });
});

describe("markInquiryRead", () => {
  it("自社スコープの問い合わせのlastReadAtのみを現在時刻に更新する", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 } as never);

    await markInquiryRead("inquiry-1", "company-1");

    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", companyId: "company-1" },
      data: { lastReadAt: expect.any(Date) },
    });
  });

  it("他社スコープのIDでは対象0件となり更新されない", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 } as never);

    await markInquiryRead("inquiry-1", "other-company");

    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", companyId: "other-company" },
      data: { lastReadAt: expect.any(Date) },
    });
  });
});
