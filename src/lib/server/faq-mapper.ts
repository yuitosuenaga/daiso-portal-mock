import "server-only";

import type { Prisma } from "@prisma/client";

import type { Faq } from "@/types/faq";

/** 言語別翻訳を含むFaqレコードの読み取り時のinclude句。 */
export const FAQ_INCLUDE = {
  translations: true,
} as const satisfies Prisma.FaqInclude;

export type PrismaFaq = Prisma.FaqGetPayload<{ include: typeof FAQ_INCLUDE }>;

/**
 * FAQの既定言語。翻訳データが見つからない場合、常にこの言語にフォールバックする。
 * `faq-service.ts`から参照される（`announcement-mapper.ts`の
 * `DEFAULT_ANNOUNCEMENT_LOCALE`と同型）。
 */
export const DEFAULT_FAQ_LOCALE = "ja";

export function mapFaq(record: PrismaFaq): Faq {
  return {
    id: record.id,
    category: record.category,
    question: record.question,
    answer: record.answer,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    translations: record.translations.map((translation) => ({
      locale: translation.locale,
      question: translation.question,
      answer: translation.answer,
    })),
  };
}

/**
 * 指定した言語に対応するFAQの質問・回答を解決する。`locale`が既定言語（`ja`）の
 * ときは`faq.question`/`answer`（親列）を返す。それ以外は`faq.translations`から
 * `locale`が一致する行を探し、見つかればその内容を返す。一致する翻訳が無い場合、
 * 20か国以上へ発信する本ポータルの共通語である`en`翻訳を優先してフォールバックし、
 * `en`翻訳も無い場合にのみ既定言語（`ja`）の内容にフォールバックする
 * （`resolveAnnouncementContent`と同一のフォールバック順序: `locale`一致 → `en` → `ja`）。
 */
export function resolveFaqContent(
  faq: Pick<Faq, "question" | "answer" | "translations">,
  locale: string
): { question: string; answer: string } {
  if (locale === DEFAULT_FAQ_LOCALE) {
    return { question: faq.question, answer: faq.answer };
  }

  const translation = faq.translations.find((item) => item.locale === locale);
  if (translation) {
    return { question: translation.question, answer: translation.answer };
  }

  const enTranslation = faq.translations.find((item) => item.locale === "en");
  if (enTranslation) {
    return { question: enTranslation.question, answer: enTranslation.answer };
  }

  return { question: faq.question, answer: faq.answer };
}
