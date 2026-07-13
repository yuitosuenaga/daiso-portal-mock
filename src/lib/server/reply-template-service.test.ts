import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    replyTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  createReplyTemplateRecord,
  findReplyTemplateById,
  listReplyTemplates,
  listReplyTemplatesByCategory,
  updateReplyTemplateRecord,
} from "@/lib/server/reply-template-service";

function baseTemplateRecord(overrides: Partial<{
  id: string;
  category: "defect" | "order" | "system" | "other";
  name: string;
  body: string;
}> = {}) {
  return {
    id: "template-1",
    category: "other" as const,
    name: "テンプレート名",
    body: "本文",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listReplyTemplates / listReplyTemplatesByCategory", () => {
  it("全件を取得する", async () => {
    vi.mocked(prisma.replyTemplate.findMany).mockResolvedValue([
      baseTemplateRecord({ id: "1" }),
      baseTemplateRecord({ id: "2" }),
    ] as never);

    const result = await listReplyTemplates();

    expect(result.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("指定カテゴリのみを取得する", async () => {
    vi.mocked(prisma.replyTemplate.findMany).mockResolvedValue([
      baseTemplateRecord({ id: "1", category: "defect" }),
    ] as never);

    const result = await listReplyTemplatesByCategory("defect");

    expect(prisma.replyTemplate.findMany).toHaveBeenCalledWith({
      where: { category: "defect" },
    });
    expect(result.every((t) => t.category === "defect")).toBe(true);
  });
});

describe("findReplyTemplateById", () => {
  it("存在しないIDはnullを返す", async () => {
    vi.mocked(prisma.replyTemplate.findUnique).mockResolvedValue(null);

    const result = await findReplyTemplateById("missing");

    expect(result).toBeNull();
  });
});

describe("createReplyTemplateRecord / updateReplyTemplateRecord", () => {
  it("入力内容でテンプレートを作成する", async () => {
    vi.mocked(prisma.replyTemplate.create).mockResolvedValue(
      baseTemplateRecord({ id: "1", category: "system", name: "新規テンプレート" }) as never
    );

    const result = await createReplyTemplateRecord({
      category: "system",
      name: "新規テンプレート",
      body: "本文",
    });

    expect(prisma.replyTemplate.create).toHaveBeenCalledWith({
      data: { category: "system", name: "新規テンプレート", body: "本文" },
    });
    expect(result.id).toBe("1");
  });

  it("既存テンプレートを更新する", async () => {
    vi.mocked(prisma.replyTemplate.update).mockResolvedValue(
      baseTemplateRecord({ id: "1", name: "更新後" }) as never
    );

    const result = await updateReplyTemplateRecord("1", {
      category: "other",
      name: "更新後",
      body: "本文",
    });

    expect(prisma.replyTemplate.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { category: "other", name: "更新後", body: "本文" },
    });
    expect(result.name).toBe("更新後");
  });
});
