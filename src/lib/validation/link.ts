import { z } from "zod";

import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";

/**
 * リンク新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトル・URL・カテゴリを必須とし、URLは妥当な形式であることを検証する。
 * `protocol`をhttp(s)に限定し、`javascript:`・`data:`等のスキームを拒否する
 * （素の`z.string().url()`はURIとして構文が妥当であれば任意のスキームを許可してしまい、
 * 申請者側`/links`で`href`としてそのまま出力されるとフィッシング等に悪用され得るため）。
 * 説明（`description`）は任意項目として受理する。
 */
export const linkFormSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().min(1).url({ protocol: /^https?$/ }),
  category: z.enum(LINK_CATEGORY_CODES),
  description: z.string().trim().optional(),
});

/**
 * `linkFormSchema` から推論されるフォーム入力値の型。
 */
export type LinkFormValues = z.infer<typeof linkFormSchema>;
