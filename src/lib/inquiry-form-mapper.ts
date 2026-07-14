import type { CreateInquiryInput } from "@/types/inquiry";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

/**
 * `InquiryFormValues`（フラットな7フィールド）を `CreateInquiryInput`
 * （`submittedBy` にネストした構造 + `status`/`createdAt` 付与）へ変換する。
 * `mode`/`targetCompanyId`（要件12、ヘルプデスク代理登録モードのフォーム制御用）は
 * `CreateInquiryInput`に含めず、明示的に必要なフィールドのみを列挙して構築する。
 */
export function toCreateInquiryInput(
  values: InquiryFormValues
): CreateInquiryInput {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mode, targetCompanyId, companyName, country, ...rest } = values;

  return {
    ...rest,
    status: "new",
    createdAt: new Date().toISOString(),
    submittedBy: {
      companyName,
      country,
    },
  };
}
