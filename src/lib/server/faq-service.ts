import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_FAQ_LOCALE,
  FAQ_INCLUDE,
  mapFaq,
  resolveFaqContent,
} from "@/lib/server/faq-mapper";
import type { CreateFaqInput, Faq } from "@/types/faq";

// `resolveFaqContent`は`faq-mapper.ts`（サービス層に依存しないleafモジュール）に
// 定義されている。本モジュールの公開APIとしては引き続きここから再エクスポートする
// （`announcement-service.ts`が`resolveAnnouncementContent`を再エクスポートするのと同型）。
export { resolveFaqContent };

export class FaqNotFoundError extends Error {
  constructor(faqId: string) {
    super(`Faq not found: ${faqId}`);
    this.name = "FaqNotFoundError";
  }
}

/**
 * ヘルプデスク管理一覧向けの型エイリアス。`Faq`が`createdAt`/`updatedAt`の
 * 両タイムスタンプを持つようになったため冗長だが、既存の呼び出し側との
 * 互換性維持のため別名として残す。
 */
export type FaqWithTimestamp = Faq;

/**
 * `translations`配列（`en`必須＋任意追加言語）をPrismaのネスト書き込み形状に変換する。
 * 既存の翻訳行を全置換する方針のため、常に`deleteMany`（既存の全翻訳行を削除）＋
 * `create`（渡された内容を作り直す）で表現する
 * （`announcement-service.ts`の`translationsToNestedWrite`と同型）。
 */
function translationsToNestedWrite(translations: Faq["translations"]) {
  return {
    deleteMany: {},
    create: translations.map((translation) => ({
      locale: translation.locale,
      question: translation.question,
      answer: translation.answer,
    })),
  };
}

/**
 * FAQ全件を取得する。並び順の保証はなく、絞り込みも行わない
 * （申請者側・ヘルプデスク側で同一の結果を返す既存モックの振る舞いを維持する）。
 * `locale`に対応する質問・回答を`resolveFaqContent`で解決して返す
 * （未指定時は既定言語`ja`。`listAnnouncementsVisibleToCountry`と同型）。
 */
export async function listFaqs(locale: string = DEFAULT_FAQ_LOCALE): Promise<Faq[]> {
  const records = await prisma.faq.findMany({ include: FAQ_INCLUDE });

  return records
    .map(mapFaq)
    .map((faq) => ({ ...faq, ...resolveFaqContent(faq, locale) }));
}

/**
 * ヘルプデスク管理一覧向けに、登録日（`createdAt`）降順で全件を返す。
 * 表示解決は行わず、既定言語（`ja`＝親列）の質問・回答と全翻訳（`translations`）を
 * そのまま返す（`FaqForm`が全言語を編集できるようにするため）。
 */
export async function listFaqsForHelpdesk(): Promise<FaqWithTimestamp[]> {
  const records = await prisma.faq.findMany({
    orderBy: { createdAt: "desc" },
    include: FAQ_INCLUDE,
  });

  return records.map(mapFaq);
}

/**
 * 指定されたIDのFAQを1件取得する。存在しない場合はnullを返す。
 * 表示解決は行わず、既定言語（`ja`＝親列）の質問・回答と全翻訳（`translations`）を
 * そのまま返す（`FaqForm`の編集初期値復元に利用する）。
 */
export async function findFaqById(id: string): Promise<Faq | null> {
  const record = await prisma.faq.findUnique({
    where: { id },
    include: FAQ_INCLUDE,
  });

  return record ? mapFaq(record) : null;
}

/**
 * FAQを新規作成する。登録日時（`createdAt`）はDBの既定値に委ねる。
 * 既定言語（`ja`）の内容は親列（`question`/`answer`）へ、`en`・追加言語は
 * `FaqTranslation`の行として保存する。
 */
export async function createFaqRecord(input: CreateFaqInput): Promise<Faq> {
  const record = await prisma.faq.create({
    data: {
      category: input.category,
      question: input.question,
      answer: input.answer,
      translations: {
        create: input.translations.map((translation) => ({
          locale: translation.locale,
          question: translation.question,
          answer: translation.answer,
        })),
      },
    },
    include: FAQ_INCLUDE,
  });

  return mapFaq(record);
}

/**
 * 既存FAQの内容を更新する。存在しない場合は`FaqNotFoundError`を送出する。
 * 編集時は既存の翻訳行を全置換する（`translationsToNestedWrite`＝`deleteMany`＋`create`）。
 */
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
        translations: translationsToNestedWrite(input.translations),
      },
      include: FAQ_INCLUDE,
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

/**
 * FAQを削除する。存在しない場合は`FaqNotFoundError`を送出する。
 * `FaqTranslation`は`onDelete: Cascade`のため、関連する翻訳行の削除に
 * 追加の処理は不要（`Announcement`の削除前トランザクションとは異なる）。
 */
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
