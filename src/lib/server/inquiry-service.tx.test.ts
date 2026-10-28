// 履歴・状態更新が必ずトランザクション（tx）経由で行われることを検証する。
// tx 用モックとグローバル prisma モックを別オブジェクトにし、グローバル側が呼ばれたら失敗させる。
import { beforeEach, describe, expect, it, vi } from "vitest";

const { txMock, globalMock } = vi.hoisted(() => {
  const fail = (name: string) =>
    vi.fn(() => {
      throw new Error(`global prisma.${name} must not be used inside the transaction`);
    });
  return {
    txMock: {
      inquiry: {
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      inquiryHistoryEntry: { create: vi.fn() },
    },
    globalMock: {
      inquiry: {
        updateMany: fail("inquiry.updateMany"),
        findUnique: fail("inquiry.findUnique"),
        findUniqueOrThrow: fail("inquiry.findUniqueOrThrow"),
      },
      inquiryHistoryEntry: { create: fail("inquiryHistoryEntry.create") },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: globalMock }));

import {
  appendReplyWithAutoTransition,
  changeStatusWithHistory,
  setClaim,
} from "@/lib/server/inquiry-service";

const record = {
  id: "inquiry-1",
  title: "t",
  category: "defect",
  urgency: "high",
  storeRegion: "Kanto",
  originalText: "x",
  originalLanguage: "ja",
  translatedText: null,
  status: "new",
  createdAt: new Date("2026-06-28T09:15:00.000Z"),
  companyId: "company-1",
  submittedByCompanyName: "Co",
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
  globalMock.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(txMock)) as never);
  txMock.inquiry.findUniqueOrThrow.mockResolvedValue(record);
  txMock.inquiryHistoryEntry.create.mockReset();
});

describe("履歴・状態更新はtx経由で行われる", () => {
  it("setClaim(claim): updateManyと履歴createがtx側", async () => {
    txMock.inquiry.updateMany.mockResolvedValue({ count: 1 });
    await setClaim("inquiry-1", { staffId: "s1", displayName: "S" }, "s1", {
      historyActorName: "S",
    });
    expect(txMock.inquiry.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
    expect(globalMock.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("setClaim(解除): updateManyと履歴createがtx側", async () => {
    txMock.inquiry.updateMany.mockResolvedValue({ count: 1 });
    await setClaim("inquiry-1", null, "s1", { historyActorName: "S" });
    expect(txMock.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
    expect(globalMock.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("setClaim(無効化済み担当の解除): findUnique・2回のupdateMany・履歴createがすべてtx側", async () => {
    txMock.inquiry.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    txMock.inquiry.findUnique.mockResolvedValueOnce({
      claimedByStaffId: "s1",
      claimedByStaff: { isActive: false },
    });
    await setClaim("inquiry-1", null, "s2", { historyActorName: "S2" });
    expect(txMock.inquiry.findUnique).toHaveBeenCalledTimes(1);
    expect(txMock.inquiry.updateMany).toHaveBeenCalledTimes(2);
    expect(txMock.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
    expect(globalMock.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("setClaim: 履歴createが失敗したらトランザクションごと失敗として伝播する", async () => {
    txMock.inquiry.updateMany.mockResolvedValue({ count: 1 });
    txMock.inquiryHistoryEntry.create.mockRejectedValue(new Error("history failed"));
    await expect(
      setClaim("inquiry-1", { staffId: "s1", displayName: "S" }, "s1", { historyActorName: "S" })
    ).rejects.toThrow("history failed");
  });

  it("changeStatusWithHistory: findUnique・updateMany・履歴createがtx側", async () => {
    txMock.inquiry.findUnique.mockResolvedValue({ status: "new" });
    txMock.inquiry.updateMany.mockResolvedValue({ count: 1 });
    const r = await changeStatusWithHistory("inquiry-1", "resolved", {
      actorName: "S",
      formatDetail: (p, n) => `${p}>${n}`,
    });
    expect(r).toEqual({ changed: true });
    expect(txMock.inquiryHistoryEntry.create).toHaveBeenCalledTimes(1);
    expect(globalMock.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("appendReplyWithAutoTransition: 返信履歴と自動遷移履歴の両方がtx側", async () => {
    txMock.inquiry.findUnique.mockResolvedValue({ id: "inquiry-1" });
    txMock.inquiry.updateMany.mockResolvedValue({ count: 1 });
    await appendReplyWithAutoTransition("inquiry-1", {
      actorName: "S",
      body: "b",
      autoTransitionDetail: "d",
    });
    expect(txMock.inquiryHistoryEntry.create).toHaveBeenCalledTimes(2);
    expect(txMock.inquiry.updateMany).toHaveBeenCalledTimes(1);
    expect(globalMock.inquiryHistoryEntry.create).not.toHaveBeenCalled();
  });
});
