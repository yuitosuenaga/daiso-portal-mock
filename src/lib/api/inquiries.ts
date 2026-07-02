import { InquiryStatusSummary } from "@/types/inquiry-summary";
import { CreateInquiryInput, Inquiry } from "@/types/inquiry";
import { getGlobalMockStore } from "@/lib/mock-store";

/**
 * 申請者側で「自社」とみなす固定のモック会社。
 * フェーズ1は認証未実装のため暫定的に固定値とし、フェーズ3で認証済みユーザーの
 * 所属会社情報に置き換える。
 */
const MOCK_CURRENT_COMPANY = {
  companyName: "Daiso Vietnam Co., Ltd.",
  country: "VN",
};

/**
 * 問い合わせ一覧・詳細表示用の静的モックデータ。
 * `createInquiry` が返す実行時データとは独立しており、対応状況・緊急度・案件種別が一通り確認できる内容にしている。
 * Server Actionsからの変更がRSCレンダリングに反映されるよう、`globalThis`上に保持する
 * （`lib/mock-store.ts`参照）。
 */
const MOCK_INQUIRIES: Inquiry[] = getGlobalMockStore("inquiries", () => [
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
  {
    id: "inquiry-009",
    category: "order",
    urgency: "medium",
    storeRegion: "Da Nang",
    originalText:
      "Chúng tôi muốn đặt thêm hàng cho đợt giao tháng sau.",
    originalLanguage: "vi",
    status: "in_progress",
    createdAt: "2026-06-22T09:30:00.000Z",
    submittedBy: {
      companyName: "Daiso Vietnam Co., Ltd.",
      country: "VN",
    },
  },
  {
    id: "inquiry-010",
    category: "defect",
    urgency: "high",
    storeRegion: "Hanoi",
    originalText: "Sản phẩm giao đến bị lỗi, đã được đổi trả và xử lý xong.",
    originalLanguage: "vi",
    status: "resolved",
    createdAt: "2026-06-05T02:15:00.000Z",
    submittedBy: {
      companyName: "Daiso Vietnam Co., Ltd.",
      country: "VN",
    },
  },
]);

function sortByCreatedAtDesc(inquiries: Inquiry[]): Inquiry[] {
  return [...inquiries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * 自社（`MOCK_CURRENT_COMPANY`）の問い合わせをステータス別に集計するモックAPI関数。
 * `getInquiries` と同じ絞り込み対象から動的に算出する。
 */
export async function getInquiryStatusSummary(): Promise<InquiryStatusSummary> {
  const ownCompanyInquiries = await getInquiries();

  return ownCompanyInquiries.reduce<InquiryStatusSummary>(
    (summary, inquiry) => {
      summary[inquiry.status] += 1;
      return summary;
    },
    { new: 0, in_progress: 0, resolved: 0 }
  );
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
 * 自社（`MOCK_CURRENT_COMPANY`）の問い合わせ全件を送信日時（`createdAt`）の降順で
 * 取得するモックAPI関数。実APIへの移行時は認証済みユーザーの所属会社で絞り込む
 * 実装に差し替える想定。
 */
export async function getInquiries(): Promise<Inquiry[]> {
  const ownCompanyInquiries = MOCK_INQUIRIES.filter(
    (inquiry) => inquiry.submittedBy.companyName === MOCK_CURRENT_COMPANY.companyName
  );

  return Promise.resolve(sortByCreatedAtDesc(ownCompanyInquiries));
}

/**
 * 全社分の問い合わせ全件を送信日時（`createdAt`）の降順で取得するモックAPI関数。
 * ヘルプデスク側の後続機能（ヘルプデスク問い合わせ管理）が利用する想定で、
 * 本specの時点では画面上への一覧表示は行わない。
 */
export async function getAllInquiries(): Promise<Inquiry[]> {
  return Promise.resolve(sortByCreatedAtDesc(MOCK_INQUIRIES));
}

/**
 * 指定されたIDの問い合わせを1件取得するモックAPI関数。
 * 該当データが存在しない場合は例外をthrowせず `null` を解決する。
 */
export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const found = MOCK_INQUIRIES.find((inquiry) => inquiry.id === id);

  return Promise.resolve(found ?? null);
}

function findInquiryOrThrow(id: string): Inquiry {
  const inquiry = MOCK_INQUIRIES.find((item) => item.id === id);
  if (!inquiry) {
    throw new Error(`Inquiry not found: ${id}`);
  }
  return inquiry;
}

/**
 * ヘルプデスク側の対応中フラグ（二重対応防止）を設定・解除するモックAPI関数。
 * `staffName` に `null` を渡すと解除する。`MOCK_INQUIRIES` の該当要素のみを更新する。
 */
export async function setInquiryClaim(
  id: string,
  staffName: string | null
): Promise<Inquiry> {
  const inquiry = findInquiryOrThrow(id);

  inquiry.claim = staffName
    ? { staffName, claimedAt: new Date().toISOString() }
    : null;

  return Promise.resolve(inquiry);
}

/**
 * ヘルプデスク側から問い合わせの対応状況（`status`）を変更するモックAPI関数。
 * `MOCK_INQUIRIES` の該当要素のみを更新するため、申請者側の参照結果にも反映される。
 */
export async function updateInquiryStatus(
  id: string,
  status: Inquiry["status"]
): Promise<Inquiry> {
  const inquiry = findInquiryOrThrow(id);

  inquiry.status = status;

  return Promise.resolve(inquiry);
}
