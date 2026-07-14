import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateFaqInput, Faq } from "@/types/faq";

export class FaqNotFoundError extends Error {
  constructor(faqId: string) {
    super(`Faq not found: ${faqId}`);
    this.name = "FaqNotFoundError";
  }
}

/** ヘルプデスク管理一覧向けに、登録日（`createdAt`）を含むFAQ情報。 */
export interface FaqWithTimestamp extends Faq {
  createdAt: string;
}

function mapFaq(record: {
  id: string;
  category: Faq["category"];
  question: string;
  answer: string;
}): Faq {
  return {
    id: record.id,
    category: record.category,
    question: record.question,
    answer: record.answer,
  };
}

/**
 * FAQ全件を取得する。並び順の保証はなく、絞り込みも行わない
 * （申請者側・ヘルプデスク側で同一の結果を返す既存モックの振る舞いを維持する）。
 */
export async function listFaqs(): Promise<Faq[]> {
  const records = await prisma.faq.findMany();

  return records.map(mapFaq);
}

/** ヘルプデスク管理一覧向けに、登録日（`createdAt`）降順で全件を返す。 */
export async function listFaqsForHelpdesk(): Promise<FaqWithTimestamp[]> {
  const records = await prisma.faq.findMany({
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) => ({
    ...mapFaq(record),
    createdAt: record.createdAt.toISOString(),
  }));
}

/** 指定されたIDのFAQを1件取得する。存在しない場合はnullを返す。 */
export async function findFaqById(id: string): Promise<Faq | null> {
  const record = await prisma.faq.findUnique({ where: { id } });

  return record ? mapFaq(record) : null;
}

/** FAQを新規作成する。登録日時（`createdAt`）はDBの既定値に委ねる。 */
export async function createFaqRecord(input: CreateFaqInput): Promise<Faq> {
  const record = await prisma.faq.create({
    data: {
      category: input.category,
      question: input.question,
      answer: input.answer,
    },
  });

  return mapFaq(record);
}

/** 既存FAQの内容を更新する。存在しない場合は`FaqNotFoundError`を送出する。 */
export async function updateFaqRecord(
  id: string,
  input: CreateFaqInput
): Promise<Faq> {
  try {
    const record = await prisma.faq.update({
      where: { id },
      data: {
        category: input.category,
        question: input.question,
        answer: input.answer,
      },
    });

    return mapFaq(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new FaqNotFoundError(id);
    }
    throw error;
  }
}

/** FAQを削除する。存在しない場合は`FaqNotFoundError`を送出する。 */
export async function deleteFaqRecord(id: string): Promise<void> {
  try {
    await prisma.faq.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new FaqNotFoundError(id);
    }
    throw error;
  }
}
