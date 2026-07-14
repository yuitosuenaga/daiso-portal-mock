import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "test",
  });
}

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    faq: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  createFaqRecord,
  deleteFaqRecord,
  FaqNotFoundError,
  findFaqById,
  listFaqs,
  listFaqsForHelpdesk,
  updateFaqRecord,
} from "@/lib/server/faq-service";

function baseFaqRecord(
  overrides: Partial<{
    id: string;
    category: "inquiry_method" | "form_input" | "status" | "other";
    question: string;
    answer: string;
    createdAt: Date;
  }> = {}
) {
  return {
    id: "faq-1",
    category: "other" as const,
    question: "質問",
    answer: "回答",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFaqs", () => {
  it("Prisma経由で全件を取得し、Faq型に整形する", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([
      {
        id: "1",
        category: "inquiry_method",
        question: "質問1",
        answer: "回答1",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      },
      {
        id: "2",
        category: "other",
        question: "質問2",
        answer: "回答2",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
      },
    ] as never);

    const result = await listFaqs();

    expect(prisma.faq.findMany).toHaveBeenCalled();
    expect(result).toEqual([
      { id: "1", category: "inquiry_method", question: "質問1", answer: "回答1" },
      { id: "2", category: "other", question: "質問2", answer: "回答2" },
    ]);
  });

  it("0件のときは空配列を返す", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([]);

    const result = await listFaqs();

    expect(result).toEqual([]);
  });
});

describe("listFaqsForHelpdesk", () => {
  it("createdAt降順で全件を取得し、createdAtを含む形で返す", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([
      baseFaqRecord({ id: "1", createdAt: new Date("2026-07-02T00:00:00.000Z") }),
      baseFaqRecord({ id: "2", createdAt: new Date("2026-07-01T00:00:00.000Z") }),
    ] as never);

    const result = await listFaqsForHelpdesk();

    expect(prisma.faq.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([
      {
        id: "1",
        category: "other",
        question: "質問",
        answer: "回答",
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "2",
        category: "other",
        question: "質問",
        answer: "回答",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("findFaqById", () => {
  it("存在するIDのときFaqを返す", async () => {
    vi.mocked(prisma.faq.findUnique).mockResolvedValue(
      baseFaqRecord({ id: "1" }) as never
    );

    const result = await findFaqById("1");

    expect(result?.id).toBe("1");
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(prisma.faq.findUnique).mockResolvedValue(null);

    const result = await findFaqById("missing");

    expect(result).toBeNull();
  });
});

describe("createFaqRecord / updateFaqRecord / deleteFaqRecord", () => {
  it("入力内容でFAQを作成する", async () => {
    vi.mocked(prisma.faq.create).mockResolvedValue(
      baseFaqRecord({ id: "1", question: "新規質問" }) as never
    );

    const result = await createFaqRecord({
      category: "other",
      question: "新規質問",
      answer: "回答",
    });

    expect(prisma.faq.create).toHaveBeenCalledWith({
      data: { category: "other", question: "新規質問", answer: "回答" },
    });
    expect(result.id).toBe("1");
  });

  it("既存FAQを更新する", async () => {
    vi.mocked(prisma.faq.update).mockResolvedValue(
      baseFaqRecord({ id: "1", question: "更新後" }) as never
    );

    const result = await updateFaqRecord("1", {
      category: "other",
      question: "更新後",
      answer: "回答",
    });

    expect(prisma.faq.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { category: "other", question: "更新後", answer: "回答" },
    });
    expect(result.question).toBe("更新後");
  });

  it("存在しないIDの更新はFaqNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.faq.update).mockRejectedValue(notFoundPrismaError());

    await expect(
      updateFaqRecord("missing", {
        category: "other",
        question: "q",
        answer: "a",
      })
    ).rejects.toThrow(FaqNotFoundError);
  });

  it("更新時のDB接続エラー等はFaqNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.faq.update).mockRejectedValue(new Error("connection lost"));

    await expect(
      updateFaqRecord("1", { category: "other", question: "q", answer: "a" })
    ).rejects.toThrow("connection lost");
  });

  it("FAQを削除する", async () => {
    vi.mocked(prisma.faq.delete).mockResolvedValue(baseFaqRecord() as never);

    await deleteFaqRecord("1");

    expect(prisma.faq.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("存在しないIDの削除はFaqNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.faq.delete).mockRejectedValue(notFoundPrismaError());

    await expect(deleteFaqRecord("missing")).rejects.toThrow(FaqNotFoundError);
  });

  it("削除時のDB接続エラー等はFaqNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.faq.delete).mockRejectedValue(new Error("connection lost"));

    await expect(deleteFaqRecord("1")).rejects.toThrow("connection lost");
  });
});
