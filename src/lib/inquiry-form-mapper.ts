import type { CreateInquiryInput } from "@/types/inquiry";
import type { InquiryFormValues } from "@/lib/validation/inquiry";

/**
 * `InquiryFormValues`（フラットな7フィールド）を `CreateInquiryInput`
 * （`submittedBy` にネストした構造 + `status`/`createdAt` 付与）へ変換する。
 */
export function toCreateInquiryInput(
  values: InquiryFormValues
): CreateInquiryInput {
  const { companyName, country, ...rest } = values;

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
