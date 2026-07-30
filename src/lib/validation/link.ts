import { z } from "zod";

/**
 * リンク新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトル・URL・大分類（`categoryId`）を必須とし、URLは妥当な形式であることを検証する。
 * `protocol`をhttp(s)に限定し、`javascript:`・`data:`等のスキームを拒否する
 * （素の`z.string().url()`はURIとして構文が妥当であれば任意のスキームを許可してしまい、
 * 申請者側`/links`で`href`としてそのまま出力されるとフィッシング等に悪用され得るため）。
 * 中分類（`subCategoryId`）・説明（`description`）は任意項目として受理する。
 * 大分類・中分類の親子整合（要件12.9）はzodスキーマでは表現できないため、
 * サービス層の`assertLinkCategoryPair`で別途検証する。
 */
export const linkFormSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().min(1).url({ protocol: /^https?$/ }),
  categoryId: z.string().trim().min(1),
  // フォーム側は未選択（「なし」）を空文字列で表現するため、`transform`で空文字列を`null`へ
  // 正規化する（`documentFormSchema`のsubCategoryIdと同型。空文字列のまま`min(1)`等で
  // 検証すると未選択を表現できなくなるため）。
  subCategoryId: z
    .string()
    .trim()
    .nullable()
    .default(null)
    .transform((value) => (value ? value : null)),
  description: z.string().trim().optional(),
});

/**
 * `linkFormSchema` から推論されるフォーム入力値の型（変換前・`z.input`）。
 * `useForm`の入力型として使用する（`subCategoryId`が`transform`前の`string | null`のまま）。
 */
export type LinkFormValues = z.input<typeof linkFormSchema>;

/**
 * `linkFormSchema`のバリデーション・変換後（送信時）の型（`z.output`）。
 */
export type LinkSubmitValues = z.output<typeof linkFormSchema>;
