import "server-only";

import { createHash } from "crypto";

import { getTranslator } from "@/lib/server/translation-service";
import { findAnnouncementById } from "@/lib/server/announcement-service";
import { TranslationError } from "@/lib/translation/claude-translator";
import type { Announcement, CreateAnnouncementInput } from "@/types/announcement";

function hashContent(title: string, body: string): string {
  return createHash("sha256").update(`${title}\u0000${body}`).digest("hex");
}

/**
 * `announcementFormSchema`でtitleEn/bodyEnが両方未入力だったとき（`translations`に
 * en行が無い）、ja本文からClaude APIで自動翻訳しen行を補う。
 *
 * en行が既に含まれている場合でも、既存の`en`行が機械翻訳（`source: "machine"`）で、
 * 送信されたen内容が既存と完全に一致し、かつja本文が変わっている場合は「人は英語を
 * 触らずにjaだけ編集した」と判断し、再翻訳する（古い機械翻訳が取り残されるのを防ぐ）。
 * それ以外（人がen欄を編集した、既存がmanual、新規作成等）は送信された内容をmanualとして
 * そのまま使う。
 *
 * 翻訳が必要な場面でAPIキー未設定・翻訳失敗の場合は`TranslationError`を送出する
 * （呼び出し元は保存を中止し、フォームにエラーを表示する）。
 */
export async function ensureEnTranslation(
  input: CreateAnnouncementInput,
  existingId?: string
): Promise<CreateAnnouncementInput> {
  const submittedEn = input.translations.find((translation) => translation.locale === "en");
  const others = input.translations.filter((translation) => translation.locale !== "en");

  let existing: Announcement | null = null;
  if (existingId) {
    existing = await findAnnouncementById(existingId);
  }
  const existingEn = existing?.translations.find((translation) => translation.locale === "en");

  const jaHash = hashContent(input.title, input.body);

  const unchangedFromMachineTranslation =
    submittedEn !== undefined &&
    existingEn?.source === "machine" &&
    submittedEn.title === existingEn.title &&
    submittedEn.body === existingEn.body;

  const jaChangedSinceLastTranslation =
    existingEn?.sourceHash !== undefined && existingEn.sourceHash !== jaHash;

  const needsTranslation =
    submittedEn === undefined ||
    (unchangedFromMachineTranslation && jaChangedSinceLastTranslation);

  if (!needsTranslation) {
    return {
      ...input,
      translations: [{ ...submittedEn!, source: "manual" }, ...others],
    };
  }

  const translator = getTranslator();
  if (!translator) {
    throw new TranslationError(
      "not_configured",
      "Automatic translation is not configured (ANTHROPIC_API_KEY is not set)"
    );
  }

  const translated = await translator.translate({
    title: input.title,
    body: input.body,
    sourceLocale: "ja",
    targetLocale: "en",
  });

  return {
    ...input,
    translations: [
      {
        locale: "en",
        title: translated.title,
        body: translated.body,
        source: "machine",
        sourceHash: jaHash,
      },
      ...others,
    ],
  };
}
