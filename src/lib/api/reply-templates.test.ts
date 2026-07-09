import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/reply-template-service", () => ({
  createReplyTemplateRecord: vi.fn(),
  findReplyTemplateById: vi.fn(),
  listReplyTemplates: vi.fn(),
  listReplyTemplatesByCategory: vi.fn(),
  updateReplyTemplateRecord: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createReplyTemplateRecord,
  findReplyTemplateById as findReplyTemplateByIdService,
  listReplyTemplates as listReplyTemplatesService,
  listReplyTemplatesByCategory as listReplyTemplatesByCategoryService,
  updateReplyTemplateRecord,
} from "@/lib/server/reply-template-service";
import {
  createReplyTemplate,
  getReplyTemplateById,
  getReplyTemplates,
  getReplyTemplatesByCategory,
  updateReplyTemplate,
} from "@/lib/api/reply-templates";
import type { ReplyTemplate } from "@/types/reply-template";

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中 太郎",
  },
};

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "test-co",
    country: "VN",
  },
};

function template(overrides: Partial<ReplyTemplate> = {}): ReplyTemplate {
  return {
    id: "template-1",
    category: "other",
    name: "テンプレート名",
    body: "本文",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getReplyTemplates", () => {
  it("ヘルプデスクセッションでlistReplyTemplatesに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listReplyTemplatesService).mockResolvedValue([template()]);

    const result = await getReplyTemplates();

    expect(listReplyTemplatesService).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getReplyTemplates()).rejects.toThrow();
  });

  it("未ログインのとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getReplyTemplates()).rejects.toThrow();
  });
});

describe("getReplyTemplatesByCategory", () => {
  it("ヘルプデスクセッションでlistReplyTemplatesByCategoryに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listReplyTemplatesByCategoryService).mockResolvedValue([
      template({ category: "defect" }),
    ]);

    const result = await getReplyTemplatesByCategory("defect");

    expect(listReplyTemplatesByCategoryService).toHaveBeenCalledWith("defect");
    expect(result.every((t) => t.category === "defect")).toBe(true);
  });
});

describe("getReplyTemplateById", () => {
  it("ヘルプデスクセッションでfindReplyTemplateByIdに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findReplyTemplateByIdService).mockResolvedValue(template());

    const result = await getReplyTemplateById("template-1");

    expect(findReplyTemplateByIdService).toHaveBeenCalledWith("template-1");
    expect(result?.id).toBe("template-1");
  });

  it("存在しないIDに対してnullを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findReplyTemplateByIdService).mockResolvedValue(null);

    const result = await getReplyTemplateById("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("createReplyTemplate / updateReplyTemplate", () => {
  it("ヘルプデスクセッションでcreateReplyTemplateRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createReplyTemplateRecord).mockResolvedValue(template());

    const result = await createReplyTemplate({
      category: "other",
      name: "テスト用テンプレート名",
      body: "テスト用テンプレート本文",
    });

    expect(createReplyTemplateRecord).toHaveBeenCalled();
    expect(result.id).toBe("template-1");
  });

  it("申請者セッションでのcreateReplyTemplateは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      createReplyTemplate({ category: "other", name: "n", body: "b" })
    ).rejects.toThrow();
  });

  it("ヘルプデスクセッションでupdateReplyTemplateRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateReplyTemplateRecord).mockResolvedValue(
      template({ name: "更新後の名前", body: "更新後の本文" })
    );

    const result = await updateReplyTemplate("template-1", {
      category: "system",
      name: "更新後の名前",
      body: "更新後の本文",
    });

    expect(updateReplyTemplateRecord).toHaveBeenCalledWith(
      "template-1",
      expect.objectContaining({ name: "更新後の名前" })
    );
    expect(result.name).toBe("更新後の名前");
  });
});
