import { InquiryStatusSummary } from "@/types/inquiry-summary";
import { CreateInquiryInput, Inquiry } from "@/types/inquiry";

const MOCK_INQUIRY_STATUS: InquiryStatusSummary = {
  new: 3,
  in_progress: 7,
  resolved: 42,
};

export async function getInquiryStatusSummary(): Promise<InquiryStatusSummary> {
  return Promise.resolve(MOCK_INQUIRY_STATUS);
}

/**
 * 問い合わせ・申請を送信するモックAPI関数。
 * フェーズ1では一意なIDを付与した `Inquiry` を常に解決する。
 * 実APIへの移行時はこの関数の内部実装のみを差し替える想定。
 */
export async function createInquiry(input: CreateInquiryInput): Promise<Inquiry> {
  const inquiry: Inquiry = {
    id: crypto.randomUUID(),
    ...input,
  };

  return Promise.resolve(inquiry);
}
