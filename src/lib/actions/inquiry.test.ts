import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  createInquiryRecord: vi.fn(),
  findInquiryById: vi.fn(),
  findInquiryForCompany: vi.fn(),
  appendHistoryEntry: vi.fn(),
  listUnreadReplyInquiryIds: vi.fn(),
  markInquiryRead: vi.fn(),
}));
vi.mock("@/lib/server/inquiry-translation-service", () => ({
  translateInquiryAndStore: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/get-session";
import {
  appendHistoryEntry,
  createInquiryRecord,
  findInquiryForCompany,
  markInquiryRead as markInquiryReadService,
} from "@/lib/server/inquiry-service";
import {
  createInquiryAction,
  markInquiryReadAction,
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


const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function pngAttachment(size: number, fileSize = size, id = "att-1") {
  const bytes = Buffer.concat([PNG_HEAD, Buffer.alloc(size - PNG_HEAD.length)]);
  return {
    id,
    fileName: "photo.png",
    fileType: "image/png",
    fileSize,
    dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
  };
}

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
    };

    await createInquiryAction(input, "target-company-1");

    expect(createInquiryRecord).toHaveBeenCalledWith({
      data: input,
      companyId: "target-company-1",
    });
  });

  it("空白だけの proxyCompanyId は例外になり、作成されない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const input: CreateInquiryInput = {
      title: "t",
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト",
      originalLanguage: "ja",
    };

    await expect(createInquiryAction(input, "   ")).rejects.toThrow();
    expect(createInquiryRecord).not.toHaveBeenCalled();
  });
});

describe("sendApplicantMessageAction", () => {
  it("自社の問い合わせにメッセージを対応履歴として記録する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(
      inquiry({ submittedBy: { companyName: "Renamed Co. (inquiry)", country: "JP" } })
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

  it("本文が上限（10000文字）を超えると例外になり、履歴に記録されない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      sendApplicantMessageAction("inquiry-1", "a".repeat(10001))
    ).rejects.toThrow();

    expect(appendHistoryEntry).not.toHaveBeenCalled();
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
      dataUrl: `data:application/pdf;base64,${Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(191)]).toString("base64")}`,
    };

    await sendApplicantMessageAction("inquiry-1", "資料を添付します。", [
      attachment,
    ]);

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [attachment] })
    );
  });
});

describe("sendApplicantMessageAction の添付ファイル整合性", () => {
  it("fileSizeを偽装した添付は例外になり、履歴に記録されない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(inquiry());

    await expect(
      sendApplicantMessageAction("inquiry-1", "本文", [pngAttachment(1000, 1)])
    ).rejects.toThrow();

    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("合計サイズ上限を超える添付は例外になり、履歴に記録されない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(inquiry());
    const five = Array.from({ length: 5 }, (_, i) =>
      pngAttachment(5 * 1024 * 1024, undefined, `att-${i}`)
    );

    await expect(
      sendApplicantMessageAction("inquiry-1", "本文", five)
    ).rejects.toThrow();

    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });
});

describe("markInquiryReadAction", () => {
  it("申請者セッションのcompanyIdで既読として記録し、一覧ルートを再検証する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(markInquiryReadService).mockResolvedValue(undefined);

    await markInquiryReadAction("inquiry-1");

    expect(markInquiryReadService).toHaveBeenCalledWith(
      "inquiry-1",
      "company-1"
    );
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/inquiry", "page");
  });

  it("空文字のIDでは例外を送出し、既読更新されない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(markInquiryReadAction("   ")).rejects.toThrow();
    expect(markInquiryReadService).not.toHaveBeenCalled();
  });

  it("ヘルプデスクセッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue({
      claims: {
        id: "staff-1",
        role: "helpdesk" as const,
        staffId: "staff-1",
        displayName: "田中 太郎",
      },
    } as never);

    await expect(markInquiryReadAction("inquiry-1")).rejects.toThrow();
    expect(markInquiryReadService).not.toHaveBeenCalled();
  });
});
