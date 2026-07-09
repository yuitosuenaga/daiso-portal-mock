import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    faq: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { listFaqs } from "@/lib/server/faq-service";

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
