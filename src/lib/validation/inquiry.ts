import { z } from "zod";

import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_COUNTRY_CODES,
  INQUIRY_ORIGINAL_LANGUAGE_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";

/** 自由記述欄（originalText）の最大文字数。 */
export const ORIGINAL_TEXT_MAX_LENGTH = 2000;

/**
 * 問い合わせ・申請フォームの入力値を検証する zod スキーマ。
 * フィールド単位のエラーメッセージは呼び出し側（UI）が翻訳キー経由で表示する。
 */
export const inquiryFormSchema = z.object({
  category: z.enum(INQUIRY_CATEGORY_CODES),
  urgency: z.enum(INQUIRY_URGENCY_CODES),
  storeRegion: z
    .string()
    .trim()
    .min(1),
  originalText: z
    .string()
    .min(1)
    .max(ORIGINAL_TEXT_MAX_LENGTH),
  originalLanguage: z.enum(INQUIRY_ORIGINAL_LANGUAGE_CODES),
  companyName: z.string().trim().min(1),
  country: z.enum(INQUIRY_COUNTRY_CODES),
});

/**
 * `inquiryFormSchema` から推論されるフォーム入力値の型。
 */
export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
