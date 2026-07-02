/**
 * 申請者側で「自社」とみなす固定のモック会社。
 * フェーズ1は認証未実装のため暫定的に固定値とし、フェーズ3で認証済みユーザーの
 * 所属会社情報に置き換える。問い合わせのスコープ（`lib/api/inquiries.ts`）と
 * お知らせの配信対象フィルタ（`lib/api/announcements.ts`）の両方で参照する。
 */
export const MOCK_CURRENT_COMPANY = {
  companyName: "Daiso Vietnam Co., Ltd.",
  country: "VN",
};
