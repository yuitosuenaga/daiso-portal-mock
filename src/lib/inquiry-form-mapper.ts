import type { CreateInquiryInput } from "@/types/inquiry";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

/**
 * `InquiryFormValues` を `CreateInquiryInput`（クライアント入力項目のみ）へ変換する。
 * `mode`/`targetCompanyId`（ヘルプデスク代理登録モードのフォーム制御用）は含めない。
 * `status`/`createdAt`/`submittedBy` はサーバー側で決めるため付与しない。
 */
export function toCreateInquiryInput(
  values: InquiryFormValues
): CreateInquiryInput {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mode, targetCompanyId, ...rest } = values;

  return rest;
}
