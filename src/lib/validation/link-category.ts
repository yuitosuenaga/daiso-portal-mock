import { z } from "zod";

/**
 * `ja`・`en`以外の任意言語1件分の名称の検証スキーマ。`documentCategoryTranslationSchema`
 * （`validation/document-category.ts`）と同型。
 */
const linkCategoryTranslationSchema = z.object({
  locale: z.string().trim().min(2).max(10),
  name: z.string().trim().min(1),
});

/** 追加言語1件分（`en`を除く）の上限件数。`documentCategoryFormSchema`と同一の上限値。 */
const LINK_CATEGORY_ADDITIONAL_TRANSLATIONS_MAX_COUNT = 20;

/**
 * カテゴリの追加・編集フォームの入力値を検証する zod スキーマ。`documentCategoryFormSchema`
 * のロジックをそのまま写経する（公開範囲（targeting）を持たない点のみが異なる）:
 * `ja`名称は`name`、`en`名称は`nameEn`（実質必須）、追加言語は`translations`（重複不可・上限20件）。
 * `transform`で`nameEn`を`translations`の`en`行へ合成する。再パース時も冪等。
 */
export const linkCategoryFormSchema = z
  .object({
    /** null=大分類として作成、非null=当該大分類配下の中分類として作成 */
    parentId: z.string().trim().min(1).nullable(),
    name: z.string().trim().min(1),
    nameEn: z.string().trim().min(1).optional(),
    translations: z.array(linkCategoryTranslationSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const enFromTranslations = data.translations.find(
      (translation) => translation.locale === "en"
    );
    const effectiveNameEn = data.nameEn ?? enFromTranslations?.name;
    if (!effectiveNameEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nameEn"],
        message: "nameEn is required",
      });
    }

    const additionalTranslations = data.translations.filter(
      (translation) => translation.locale !== "en"
    );
    if (
      additionalTranslations.length >
      LINK_CATEGORY_ADDITIONAL_TRANSLATIONS_MAX_COUNT
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translations"],
        message: `translations must contain at most ${LINK_CATEGORY_ADDITIONAL_TRANSLATIONS_MAX_COUNT} additional languages`,
      });
    }

    // `nameEn`が未指定（2回目のパース、`en`は既に`translations`側へ合成されている想定）の
    // 場合のみ、`translations`内の`en`行を重複扱いしない（`documentCategoryFormSchema`と同型）。
    const isSecondPass = data.nameEn === undefined;

    const seenLocales = new Set<string>(["ja", "en"]);
    data.translations.forEach((translation, index) => {
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
  .transform((data) => {
    const { nameEn, translations, ...rest } = data;
    const enFromTranslations = translations.find(
      (translation) => translation.locale === "en"
    );
    const resolvedNameEn = nameEn ?? enFromTranslations?.name ?? "";
    const additionalTranslations = translations.filter(
      (translation) => translation.locale !== "en"
    );

    return {
      ...rest,
      translations: [
        { locale: "en", name: resolvedNameEn },
        ...additionalTranslations,
      ],
    };
  });

/**
 * `linkCategoryFormSchema` から推論されるフォーム入力値の型（変換前・`z.input`）。
 * `useForm`の入力型として使用する。
 */
export type LinkCategoryFormValues = z.input<typeof linkCategoryFormSchema>;

/**
 * `linkCategoryFormSchema`のバリデーション・変換後（送信時）の型（`z.output`）。
 */
export type LinkCategorySubmitValues = z.output<typeof linkCategoryFormSchema>;
