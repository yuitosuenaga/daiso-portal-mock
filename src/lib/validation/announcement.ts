import { z } from "zod";

import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";

const announcementTargetingSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({
    scope: z.literal("countries"),
    countries: z.array(z.enum(INQUIRY_COUNTRY_CODES)).min(1),
  }),
]);

/**
 * お知らせ新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトル・本文・種別を必須とし、配信対象を「特定の国・地域を指定」にした場合は
 * 1件以上の国が選択されていることを要求する。
 */
export const announcementFormSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  category: z.enum(ANNOUNCEMENT_CATEGORY_CODES),
  targeting: announcementTargetingSchema,
  actionRequired: z.boolean(),
});

/**
 * `announcementFormSchema` から推論されるフォーム入力値の型。
 */
export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;
