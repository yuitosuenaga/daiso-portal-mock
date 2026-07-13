import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/document-service", () => ({
  createDocumentRecord: vi.fn(),
  deleteDocumentRecord: vi.fn(),
  findDocumentById: vi.fn(),
  findDocumentVisibleTo: vi.fn(),
  listAllDocuments: vi.fn(),
  listDocumentsVisibleTo: vi.fn(),
  updateDocumentRecord: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createDocumentRecord,
  deleteDocumentRecord,
  findDocumentById as findDocumentByIdService,
  findDocumentVisibleTo,
  listAllDocuments as listAllDocumentsService,
  listDocumentsVisibleTo,
  updateDocumentRecord,
} from "@/lib/server/document-service";
import {
  createDocument,
  deleteDocument,
  getAllDocuments,
  getDocumentById,
  getDocumentByIdForHelpdesk,
  getDocuments,
  updateDocument,
} from "@/lib/api/documents";
import type { CreateDocumentInput, Document } from "@/types/document";

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "vn-daiso-vietnam",
    country: "VN",
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

function document(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-1",
    title: "タイトル",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDocuments", () => {
  it("申請者セッションのcountry・companyCodeでlistDocumentsVisibleToに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listDocumentsVisibleTo).mockResolvedValue([document()]);

    const result = await getDocuments();

    expect(listDocumentsVisibleTo).toHaveBeenCalledWith("VN", "vn-daiso-vietnam");
    expect(result).toHaveLength(1);
  });

  it("ヘルプデスクセッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(getDocuments()).rejects.toThrow();
  });

  it("未ログインのとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getDocuments()).rejects.toThrow();
  });
});

describe("getDocumentById", () => {
  it("申請者セッションのcountry・companyCodeでfindDocumentVisibleToに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentVisibleTo).mockResolvedValue(document());

    const result = await getDocumentById("document-1");

    expect(findDocumentVisibleTo).toHaveBeenCalledWith(
      "document-1",
      "VN",
      "vn-daiso-vietnam"
    );
    expect(result?.id).toBe("document-1");
  });

  it("未ログインのとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getDocumentById("document-1")).rejects.toThrow();
  });
});

describe("getAllDocuments", () => {
  it("ヘルプデスクセッションでlistAllDocumentsに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listAllDocumentsService).mockResolvedValue([document()]);

    const result = await getAllDocuments();

    expect(listAllDocumentsService).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getAllDocuments()).rejects.toThrow();
  });
});

describe("getDocumentByIdForHelpdesk", () => {
  it("ヘルプデスクセッションでfindDocumentByIdに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findDocumentByIdService).mockResolvedValue(document());

    const result = await getDocumentByIdForHelpdesk("document-1");

    expect(findDocumentByIdService).toHaveBeenCalledWith("document-1");
    expect(result?.id).toBe("document-1");
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getDocumentByIdForHelpdesk("document-1")).rejects.toThrow();
  });
});

describe("createDocument / updateDocument / deleteDocument", () => {
  const input: CreateDocumentInput = {
    title: "新規作成テスト",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,AAAA",
    targeting: { scope: "all" },
  };

  it("ヘルプデスクセッションでcreateDocumentRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createDocumentRecord).mockResolvedValue(document());

    const result = await createDocument(input);

    expect(createDocumentRecord).toHaveBeenCalledWith(input);
    expect(result.id).toBe("document-1");
  });

  it("申請者セッションでのcreateDocumentは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(createDocument(input)).rejects.toThrow();
  });

  it("ヘルプデスクセッションでupdateDocumentRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateDocumentRecord).mockResolvedValue(document({ title: "更新後" }));

    const result = await updateDocument("document-1", input);

    expect(updateDocumentRecord).toHaveBeenCalledWith("document-1", input);
    expect(result.title).toBe("更新後");
  });

  it("ヘルプデスクセッションでdeleteDocumentRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(deleteDocumentRecord).mockResolvedValue(undefined);

    await deleteDocument("document-1");

    expect(deleteDocumentRecord).toHaveBeenCalledWith("document-1");
  });
});
