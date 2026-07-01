import { InquiryStatusSummary } from "@/types/inquiry-summary";
import { CreateInquiryInput, Inquiry } from "@/types/inquiry";

const MOCK_INQUIRY_STATUS: InquiryStatusSummary = {
  new: 3,
  in_progress: 7,
  resolved: 42,
};

/**
 * 問い合わせ一覧・詳細表示用の静的モックデータ。
 * `createInquiry` が返す実行時データとは独立しており、対応状況・緊急度・案件種別が一通り確認できる内容にしている。
 */
const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: "inquiry-001",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText:
      "店舗に納品された商品の一部に破損が見られます。至急対応をお願いします。",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-28T09:15:00.000Z",
    submittedBy: {
      companyName: "Daiso Japan Trading Co.",
      country: "JP",
    },
  },
  {
    id: "inquiry-002",
    category: "order",
    urgency: "medium",
    storeRegion: "West Coast",
    originalText:
      "We would like to place an additional order for next month's shipment.",
    originalLanguage: "en",
    status: "in_progress",
    createdAt: "2026-06-25T14:30:00.000Z",
    submittedBy: {
      companyName: "Daiso USA Inc.",
      country: "US",
    },
  },
  {
    id: "inquiry-003",
    category: "system",
    urgency: "high",
    storeRegion: "Seoul",
    originalText: "포털 시스템에 로그인할 수 없는 문제가 발생하고 있습니다.",
    originalLanguage: "ko",
    status: "new",
    createdAt: "2026-06-29T02:45:00.000Z",
    submittedBy: {
      companyName: "Daiso Korea Co., Ltd.",
      country: "KR",
    },
  },
  {
    id: "inquiry-004",
    category: "other",
    urgency: "low",
    storeRegion: "Bangkok",
    originalText:
      "次回の販促キャンペーンに関する資料の共有をお願いしたいです。",
    originalLanguage: "ja",
    status: "resolved",
    createdAt: "2026-06-10T06:00:00.000Z",
    submittedBy: {
      companyName: "Daiso Thailand Co., Ltd.",
      country: "TH",
    },
  },
  {
    id: "inquiry-005",
    category: "defect",
    urgency: "medium",
    storeRegion: "Taipei",
    originalText: "部分商品外包裝有輕微破損，請確認是否需要更換。",
    originalLanguage: "zh",
    status: "in_progress",
    createdAt: "2026-06-20T11:20:00.000Z",
    submittedBy: {
      companyName: "Daiso Taiwan Co., Ltd.",
      country: "TW",
    },
  },
  {
    id: "inquiry-006",
    category: "order",
    urgency: "low",
    storeRegion: "Singapore",
    originalText:
      "Could you confirm the estimated delivery date for order #4821?",
    originalLanguage: "en",
    status: "resolved",
    createdAt: "2026-05-30T08:10:00.000Z",
    submittedBy: {
      companyName: "Daiso Singapore Pte. Ltd.",
      country: "SG",
    },
  },
  {
    id: "inquiry-007",
    category: "system",
    urgency: "low",
    storeRegion: "Ho Chi Minh City",
    originalText:
      "Trang cổng thông tin hiển thị chậm khi tải danh sách đơn hàng.",
    originalLanguage: "vi",
    status: "new",
    createdAt: "2026-06-27T13:05:00.000Z",
    submittedBy: {
      companyName: "Daiso Vietnam Co., Ltd.",
      country: "VN",
    },
  },
  {
    id: "inquiry-008",
    category: "other",
    urgency: "medium",
    storeRegion: "Jakarta",
    originalText:
      "Kami ingin menanyakan mengenai perpanjangan kontrak distribusi.",
    originalLanguage: "id",
    status: "in_progress",
    createdAt: "2026-06-15T05:40:00.000Z",
    submittedBy: {
      companyName: "Daiso Indonesia Co., Ltd.",
      country: "ID",
    },
  },
];

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

/**
 * 自社の問い合わせ全件を送信日時（`createdAt`）の降順で取得するモックAPI関数。
 * 実APIへの移行時はこの関数の内部実装のみを差し替える想定。
 */
export async function getInquiries(): Promise<Inquiry[]> {
  const sorted = [...MOCK_INQUIRIES].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return Promise.resolve(sorted);
}

/**
 * 指定されたIDの問い合わせを1件取得するモックAPI関数。
 * 該当データが存在しない場合は例外をthrowせず `null` を解決する。
 */
export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const found = MOCK_INQUIRIES.find((inquiry) => inquiry.id === id);

  return Promise.resolve(found ?? null);
}
