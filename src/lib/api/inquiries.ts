import { InquiryStatusSummary } from "@/types/inquiry-summary";

const MOCK_INQUIRY_STATUS: InquiryStatusSummary = {
  new: 3,
  in_progress: 7,
  resolved: 42,
};

export async function getInquiryStatusSummary(): Promise<InquiryStatusSummary> {
  return Promise.resolve(MOCK_INQUIRY_STATUS);
}
