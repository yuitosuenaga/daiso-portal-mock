import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  createInquiryRecord: vi.fn(),
  listInquiriesForCompany: vi.fn(),
  listAllInquiries: vi.fn(),
  findInquiryById: vi.fn(),
}));
vi.mock("@/lib/server/inquiry-translation-service", () => ({
  translateInquiryAndStore: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createInquiryRecord,
  findInquiryById,
  listAllInquiries,
  listInquiriesForCompany,
} from "@/lib/server/inquiry-service";
import { GET, POST } from "@/app/api/inquiries/route";

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "test-co",
    country: "JP",
  },
};

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中 太郎",
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

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/inquiries", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/inquiries", () => {
  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(401);
  });

  it("申請者セッションで有効な入力のとき、companyIdを付与して作成し201を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(createInquiryRecord).mockResolvedValue({ id: "inquiry-1" } as never);
    vi.mocked(findInquiryById).mockResolvedValue({ id: "inquiry-1" } as never);

    const response = await POST(
      jsonRequest({
        title: "商品破損についての問い合わせ",
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "破損しています",
        originalLanguage: "ja",
      })
    );

    expect(response.status).toBe(201);
    expect(createInquiryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-1" })
    );
  });

  it("status・createdAt・submittedBy を送っても201で、作成処理には渡らない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(createInquiryRecord).mockClear();
    vi.mocked(createInquiryRecord).mockResolvedValue({ id: "inquiry-1" } as never);
    vi.mocked(findInquiryById).mockResolvedValue({ id: "inquiry-1" } as never);

    const response = await POST(
      jsonRequest({
        title: "商品破損についての問い合わせ",
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "破損しています",
        originalLanguage: "ja",
        status: "resolved",
        createdAt: "1999-01-01T00:00:00.000Z",
        submittedBy: { companyName: "Evil Co.", country: "US" },
      })
    );

    expect(response.status).toBe(201);
    const arg = vi.mocked(createInquiryRecord).mock.calls[0]?.[0];
    expect(arg?.data).not.toHaveProperty("status");
    expect(arg?.data).not.toHaveProperty("createdAt");
    expect(arg?.data).not.toHaveProperty("submittedBy");
  });

  describe("添付ファイル", () => {
    const base = {
      title: "t",
      category: "defect",
      urgency: "high",
      storeRegion: "Kanto",
      originalText: "x",
      originalLanguage: "ja",
    };

    it("正当な添付は201で通る", async () => {
      vi.mocked(getSession).mockResolvedValue(applicantSession as never);
      vi.mocked(createInquiryRecord).mockResolvedValue({ id: "inquiry-1" } as never);
      vi.mocked(findInquiryById).mockResolvedValue({ id: "inquiry-1" } as never);

      const response = await POST(
        jsonRequest({ ...base, attachments: [pngAttachment(100)] })
      );

      expect(response.status).toBe(201);
    });

    it("fileSizeを偽装した添付は400になり作成されない", async () => {
      vi.mocked(getSession).mockResolvedValue(applicantSession as never);
      vi.mocked(createInquiryRecord).mockClear();

      const response = await POST(
        jsonRequest({ ...base, attachments: [pngAttachment(1000, 1)] })
      );

      expect(response.status).toBe(400);
      expect(createInquiryRecord).not.toHaveBeenCalled();
    });

    it("合計上限を超える添付は400になる", async () => {
      vi.mocked(getSession).mockResolvedValue(applicantSession as never);
      vi.mocked(createInquiryRecord).mockClear();
      const five = Array.from({ length: 5 }, (_, i) => ({
        ...pngAttachment(5 * 1024 * 1024),
        id: `att-${i}`,
      }));

      const response = await POST(jsonRequest({ ...base, attachments: five }));

      expect(response.status).toBe(400);
      expect(createInquiryRecord).not.toHaveBeenCalled();
    });
  });

  it("不正な入力のとき400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const response = await POST(jsonRequest({ category: "invalid" }));

    expect(response.status).toBe(400);
  });

  it("ヘルプデスクセッションでは403相当として作成できない", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(401);
  });
});

describe("GET /api/inquiries", () => {
  it("申請者セッションのとき、自社分のみ取得する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listInquiriesForCompany).mockResolvedValue([]);

    const response = await GET();

    expect(listInquiriesForCompany).toHaveBeenCalledWith("company-1");
    expect(response.status).toBe(200);
  });

  it("ヘルプデスクセッションのとき、全件取得する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listAllInquiries).mockResolvedValue([]);

    const response = await GET();

    expect(listAllInquiries).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
