import { z } from "zod";

import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";

/**
 * `ja`・`en`以外の任意言語1件分の質問・回答の検証スキーマ。言語コードは自由入力
 * （例: `th`・`vi`・`zh`）とし、`ja`/`en`との重複・追加言語同士の重複は`superRefine`側で検証する
 * （`announcementTranslationSchema`と同型）。
 */
const faqTranslationSchema = z.object({
  locale: z.string().trim().min(2).max(10),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

/** 追加言語1件分（`en`を除く）の上限件数（`ANNOUNCEMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT`と同値）。 */
const FAQ_ADDITIONAL_TRANSLATIONS_MAX_COUNT = 20;

/**
 * FAQ新規作成・編集フォームの入力値を検証する zod スキーマ。
 * カテゴリは言語に依存しない共通項目として必須とする。
 * 質問・回答は言語別（`ja`は`question`/`answer`、`en`は`questionEn`/`answerEn`、
 * いずれも必須）に入力し、`translations`で`ja`/`en`以外の任意言語（重複不可）を追加できる
 * （`announcementFormSchema`と同型）。
 *
 * `questionEn`/`answerEn`は型としては任意（`optional`）だが、`superRefine`で実質必須として
 * 検証する。これは、サービス層に渡す出力（`translations`に`en`行を合成済み）を本スキーマで
 * 再検証（サーバーアクション側の多重防御）した場合に、既に`en`が`translations`側へ
 * 合成されていて`questionEn`/`answerEn`が存在しない状態でも冪等に検証を通せるようにするため
 * （`translations`内の`en`行から実質的な値を導出する）。
 */
export const faqFormSchema = z
  .object({
    category: z.enum(FAQ_CATEGORY_CODES),
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    questionEn: z.string().trim().min(1).optional(),
    answerEn: z.string().trim().min(1).optional(),
    translations: z.array(faqTranslationSchema).default([]),
  })
  .superRefine((values, ctx) => {
    const enFromTranslations = values.translations.find(
      (translation) => translation.locale === "en"
    );
    const effectiveQuestionEn = values.questionEn ?? enFromTranslations?.question;
    const effectiveAnswerEn = values.answerEn ?? enFromTranslations?.answer;
    if (!effectiveQuestionEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questionEn"],
        message: "questionEn is required",
      });
    }
    if (!effectiveAnswerEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answerEn"],
        message: "answerEn is required",
      });
    }

    const additionalTranslations = values.translations.filter(
      (translation) => translation.locale !== "en"
    );
    if (additionalTranslations.length > FAQ_ADDITIONAL_TRANSLATIONS_MAX_COUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translations"],
        message: `translations must contain at most ${FAQ_ADDITIONAL_TRANSLATIONS_MAX_COUNT} additional languages`,
      });
    }

    // `questionEn`/`answerEn`が両方とも未指定（2回目のパース、`en`は既に`translations`側へ
    // 合成されている想定）の場合のみ、`translations`内の`en`行を重複扱いしない。
    // `questionEn`/`answerEn`が指定されている（1回目のパース、フォーム入力）場合に
    // `translations`にも`en`が含まれているのは不正な重複指定として扱う。
    const isSecondPass = values.questionEn === undefined && values.answerEn === undefined;

    const seenLocales = new Set<string>(["ja", "en"]);
    values.translations.forEach((translation, index) => {
      if (translation.locale === "en" && isSecondPass) {
        return;
      }
      const locale = translation.locale.toLowerCase();
      if (seenLocales.has(locale)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["translations", index, "locale"],
          message: "locale must not duplicate ja, en, or another translation's locale",
        });
        return;
      }
      seenLocales.add(locale);
    });
  })
  .transform(({ questionEn, answerEn, translations, ...values }) => {
    const enFromTranslations = translations.find((translation) => translation.locale === "en");
    const resolvedQuestionEn = questionEn ?? enFromTranslations?.question ?? "";
    const resolvedAnswerEn = answerEn ?? enFromTranslations?.answer ?? "";
    const additionalTranslations = translations.filter(
      (translation) => translation.locale !== "en"
    );

    return {
      ...values,
      translations: [
        { locale: "en", question: resolvedQuestionEn, answer: resolvedAnswerEn },
        ...additionalTranslations,
      ],
    };
  });

/**
 * `faqFormSchema` から推論されるフォーム入力値の型（変換前）。
 */
export type FaqFormValues = z.input<typeof faqFormSchema>;

/**
 * `faqFormSchema`のバリデーション・変換後（送信時）の型。
 * `useForm`の変換後型（`TTransformedValues`）として使用する。
 */
export type FaqSubmitValues = z.output<typeof faqFormSchema>;
