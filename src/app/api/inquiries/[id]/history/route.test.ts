import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  appendHistoryEntry: vi.fn(),
  findInquiryForCompany: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  appendHistoryEntry,
  findInquiryForCompany,
} from "@/lib/server/inquiry-service";
import { POST } from "@/app/api/inquiries/[id]/history/route";

const helpdeskSession = {
  claims: { id: "staff-1", role: "helpdesk" as const, staffId: "staff-1", displayName: "田中 太郎" },
};
const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
  },
};


const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function pngAttachment(size: number, fileSize = size) {
  const bytes = Buffer.concat([PNG_HEAD, Buffer.alloc(size - PNG_HEAD.length)]);
  return {
    id: "att-1",
    fileName: "photo.png",
    fileType: "image/png",
    fileSize,
    dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
  };
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/inquiries/inquiry-1/history", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/inquiries/[id]/history", () => {
  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await POST(request({ type: "requester_message", detail: "x" }), {
      params: Promise.resolve({ id: "inquiry-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("申請者が自社の問い合わせにrequester_messageを追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue({ id: "inquiry-1" } as never);
    vi.mocked(appendHistoryEntry).mockResolvedValue({ id: "history-1" } as never);

    const response = await POST(
      request({ type: "requester_message", detail: "教えてください" }),
      { params: Promise.resolve({ id: "inquiry-1" }) }
    );

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        inquiryId: "inquiry-1",
        type: "requester_message",
        actorName: "Test Co.",
      })
    );
    expect(response.status).toBe(201);
  });

  it("申請者の正当な添付は201で通る", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue({ id: "inquiry-1" } as never);
    vi.mocked(appendHistoryEntry).mockResolvedValue({ id: "history-1" } as never);

    const response = await POST(
      request({ type: "requester_message", detail: "x", attachments: [pngAttachment(100)] }),
      { params: Promise.resolve({ id: "inquiry-1" }) }
    );

    expect(response.status).toBe(201);
  });

  it("fileSizeを偽装した添付は400になり履歴に記録されない", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(appendHistoryEntry).mockClear();

    const response = await POST(
      request({ type: "reply_sent", detail: "x", attachments: [pngAttachment(1000, 1)] }),
      { params: Promise.resolve({ id: "inquiry-1" }) }
    );

    expect(response.status).toBe(400);
    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("合計上限を超える添付は400になる", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(appendHistoryEntry).mockClear();
    const five = Array.from({ length: 5 }, (_, i) => ({
      ...pngAttachment(5 * 1024 * 1024),
      id: `att-${i}`,
    }));

    const response = await POST(
      request({ type: "reply_sent", detail: "x", attachments: five }),
      { params: Promise.resolve({ id: "inquiry-1" }) }
    );

    expect(response.status).toBe(400);
    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it("申請者が他社の問い合わせに追加しようとすると404を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(null);

    const response = await POST(request({ type: "requester_message", detail: "x" }), {
      params: Promise.resolve({ id: "inquiry-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("申請者がreply_sentを指定すると400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const response = await POST(request({ type: "reply_sent", detail: "x" }), {
      params: Promise.resolve({ id: "inquiry-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("ヘルプデスクがreply_sentを担当者名で追加できる", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(appendHistoryEntry).mockResolvedValue({ id: "history-1" } as never);

    const response = await POST(request({ type: "reply_sent", detail: "対応します" }), {
      params: Promise.resolve({ id: "inquiry-1" }),
    });

    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ actorName: "田中 太郎", type: "reply_sent" })
    );
    expect(response.status).toBe(201);
  });

  it("ヘルプデスクがrequester_messageを指定すると400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const response = await POST(request({ type: "requester_message", detail: "x" }), {
      params: Promise.resolve({ id: "inquiry-1" }),
    });

    expect(response.status).toBe(400);
  });
});
