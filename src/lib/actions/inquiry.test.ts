import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  createInquiryRecord: vi.fn(),
  findInquiryForCompany: vi.fn(),
  appendHistoryEntry: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/get-session";
import {
  appendHistoryEntry,
  createInquiryRecord,
  findInquiryForCompany,
} from "@/lib/server/inquiry-service";
import {
  createInquiryAction,
  sendApplicantMessageAction,
} from "@/lib/actions/inquiry";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
  },
};

function inquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: "inquiry-1",
    title: "商品破損についての問い合わせ",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText: "text",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-07-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInquiryAction", () => {
  it("createInquiryRecordへ委譲し、セッションのcompanyIdを付与する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(createInquiryRecord).mockResolvedValue(inquiry());

    const input: CreateInquiryInput = {
      title: "追加発注についての問い合わせ",
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: { companyName: "Test Company", country: "JP" },
    };

    const result = await createInquiryAction(input);

    expect(createInquiryRecord).toHaveBeenCalledWith({
      data: input,
      companyId: "company-1",
    });
    expect(result.id).toBe("inquiry-1");
  });

  it("proxyCompanyIdを渡したとき、ヘルプデスク経由でcreateInquiryへ引き渡す", async () => {
    const helpdeskSession = {
      claims: {
        id: "staff-1",
        role: "helpdesk" as const,
        staffId: "staff-1",
        displayName: "田中 太郎",
      },
    };
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createInquiryRecord).mockResolvedValue(inquiry());

    const input: CreateInquiryInput = {
      title: "電話で受けた問い合わせ",
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: { companyName: "Test Company", country: "JP" },
    };

    await createInquiryAction(input, "target-company-1");

    expect(createInquiryRecord).toHaveBeenCalledWith({
      data: input,
      companyId: "target-company-1",
    });
  });
});

describe("sendApplicantMessageAction", () => {
  it("自社の問い合わせにメッセージを対応履歴として記録する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(
      inquiry({ submittedBy: { companyName: "Test Co.", country: "JP" } })
    );
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-1",
      type: "requester_message",
      actorName: "Test Co.",
      occurredAt: "2026-07-01T00:00:00.000Z",
      detail: "発送予定日を教えてください。",
    });

    await sendApplicantMessageAction(
      "inquiry-1",
      "発送予定日を教えてください。"
    );

    expect(findInquiryForCompany).toHaveBeenCalledWith("inquiry-1", "company-1");
    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        inquiryId: "inquiry-1",
        type: "requester_message",
        actorName: "Test Co.",
        detail: "発送予定日を教えてください。",
      })
    );
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("他社の問い合わせ（所有権なし）には例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(null);

    await expect(
      sendApplicantMessageAction("inquiry-other", "本文")
    ).rejects.toThrow();
    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("空文字・空白のみのメッセージ本文は例外になり、履歴に記録されない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(sendApplicantMessageAction("inquiry-1", "   ")).rejects.toThrow();

    expect(findInquiryForCompany).not.toHaveBeenCalled();
    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("添付ファイル付きでメッセージを送信すると、対応履歴に添付ファイルが記録される", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(inquiry());
    vi.mocked(appendHistoryEntry).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-1",
      type: "requester_message",
      actorName: "Test Co.",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    const attachment = {
      id: "att-1",
      fileName: "memo.pdf",
      fileType: "application/pdf",
      fileSize: 200,
      dataUrl: "data:application/pdf;base64,AAAA",
    };

    await sendApplicantMessageAction("inquiry-1", "資料を添付します。", [
      attachment,
    ]);

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [attachment] })
    );
  });
});
