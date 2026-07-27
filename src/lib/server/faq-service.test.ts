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
import { FAQ_INCLUDE } from "@/lib/server/faq-mapper";
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
    updatedAt: Date;
    translations: { id: string; faqId: string; locale: string; question: string; answer: string }[];
  }> = {}
) {
  return {
    id: "faq-1",
    category: "other" as const,
    question: "質問",
    answer: "回答",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    translations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFaqs", () => {
  it("Prisma経由で全件を取得し、Faq型に整形する（既定言語jaで解決）", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([
      baseFaqRecord({ id: "1", category: "inquiry_method", question: "質問1", answer: "回答1" }),
      baseFaqRecord({
        id: "2",
        question: "質問2",
        answer: "回答2",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        updatedAt: new Date("2026-07-03T00:00:00.000Z"),
      }),
    ] as never);

    const result = await listFaqs();

    expect(prisma.faq.findMany).toHaveBeenCalledWith({ include: FAQ_INCLUDE });
    expect(result).toEqual([
      {
        id: "1",
        category: "inquiry_method",
        question: "質問1",
        answer: "回答1",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        translations: [],
      },
      {
        id: "2",
        category: "other",
        question: "質問2",
        answer: "回答2",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
        translations: [],
      },
    ]);
  });

  it("0件のときは空配列を返す", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([]);

    const result = await listFaqs();

    expect(result).toEqual([]);
  });

  it("localeにenを指定し、対応する翻訳が存在する場合はen翻訳の質問・回答を返す（要件12.5）", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([
      baseFaqRecord({
        id: "1",
        question: "日本語の質問",
        answer: "日本語の回答",
        translations: [
          { id: "t1", faqId: "1", locale: "en", question: "English question", answer: "English answer" },
        ],
      }),
    ] as never);

    const result = await listFaqs("en");

    expect(result[0].question).toBe("English question");
    expect(result[0].answer).toBe("English answer");
  });

  it("localeにenを指定しても対応する翻訳が存在しない場合は既定言語（ja）にフォールバックする", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([
      baseFaqRecord({ id: "1", question: "日本語の質問", answer: "日本語の回答" }),
    ] as never);

    const result = await listFaqs("en");

    expect(result[0].question).toBe("日本語の質問");
    expect(result[0].answer).toBe("日本語の回答");
  });
});

describe("listFaqsForHelpdesk", () => {
  it("createdAt降順で全件を取得し、表示解決せず親列＋translationsをそのまま返す（要件12.8）", async () => {
    vi.mocked(prisma.faq.findMany).mockResolvedValue([
      baseFaqRecord({
        id: "1",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        translations: [
          { id: "t1", faqId: "1", locale: "en", question: "English question", answer: "English answer" },
        ],
      }),
      baseFaqRecord({ id: "2", createdAt: new Date("2026-07-01T00:00:00.000Z") }),
    ] as never);

    const result = await listFaqsForHelpdesk();

    expect(prisma.faq.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: FAQ_INCLUDE,
    });
    expect(result).toEqual([
      {
        id: "1",
        category: "other",
        question: "質問",
        answer: "回答",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        translations: [{ locale: "en", question: "English question", answer: "English answer" }],
      },
      {
        id: "2",
        category: "other",
        question: "質問",
        answer: "回答",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        translations: [],
      },
    ]);
  });
});

describe("findFaqById", () => {
  it("存在するIDのときFaqを返す（親列＋translationsをそのまま返す）", async () => {
    vi.mocked(prisma.faq.findUnique).mockResolvedValue(
      baseFaqRecord({
        id: "1",
        translations: [
          { id: "t1", faqId: "1", locale: "en", question: "English question", answer: "English answer" },
        ],
      }) as never
    );

    const result = await findFaqById("1");

    expect(prisma.faq.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      include: FAQ_INCLUDE,
    });
    expect(result?.id).toBe("1");
    expect(result?.translations).toEqual([
      { locale: "en", question: "English question", answer: "English answer" },
    ]);
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(prisma.faq.findUnique).mockResolvedValue(null);

    const result = await findFaqById("missing");

    expect(result).toBeNull();
  });
});

describe("createFaqRecord / updateFaqRecord / deleteFaqRecord", () => {
  it("ja=親列、en・追加言語=translationsネスト作成でFAQを作成する", async () => {
    vi.mocked(prisma.faq.create).mockResolvedValue(
      baseFaqRecord({
        id: "1",
        question: "新規質問",
        translations: [
          { id: "t1", faqId: "1", locale: "en", question: "New question", answer: "New answer" },
        ],
      }) as never
    );

    const result = await createFaqRecord({
      category: "other",
      question: "新規質問",
      answer: "回答",
      translations: [{ locale: "en", question: "New question", answer: "New answer" }],
    });

    expect(prisma.faq.create).toHaveBeenCalledWith({
      data: {
        category: "other",
        question: "新規質問",
        answer: "回答",
        translations: {
          create: [{ locale: "en", question: "New question", answer: "New answer" }],
        },
      },
      include: FAQ_INCLUDE,
    });
    expect(result.id).toBe("1");
    expect(result.translations).toEqual([
      { locale: "en", question: "New question", answer: "New answer" },
    ]);
  });

  it("既存FAQを更新する（既存翻訳を全置換）", async () => {
    vi.mocked(prisma.faq.update).mockResolvedValue(
      baseFaqRecord({ id: "1", question: "更新後" }) as never
    );

    const result = await updateFaqRecord("1", {
      category: "other",
      question: "更新後",
      answer: "回答",
      translations: [{ locale: "en", question: "Updated", answer: "Updated answer" }],
    });

    expect(prisma.faq.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        category: "other",
        question: "更新後",
        answer: "回答",
        translations: {
          deleteMany: {},
          create: [{ locale: "en", question: "Updated", answer: "Updated answer" }],
        },
      },
      include: FAQ_INCLUDE,
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
        translations: [],
      })
    ).rejects.toThrow(FaqNotFoundError);
  });

  it("更新時のDB接続エラー等はFaqNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.faq.update).mockRejectedValue(new Error("connection lost"));

    await expect(
      updateFaqRecord("1", { category: "other", question: "q", answer: "a", translations: [] })
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
