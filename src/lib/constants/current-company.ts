/**
 * 申請者側で「自社」とみなす固定のモック会社。
 * フェーズ1は認証未実装のため暫定的に固定値とし、フェーズ3で認証済みユーザーの
 * 所属会社情報に置き換える。問い合わせのスコープ（`lib/api/inquiries.ts`）、
 * お知らせの配信対象フィルタ（`lib/api/announcements.ts`）、ドキュメントの公開範囲
 * フィルタ（`lib/api/documents.ts`）で参照する。`companyCode`は`DOCUMENT_COMPANY_CODES`
 * （`lib/constants/document-company-options.ts`）のいずれかの値。
 */
export const MOCK_CURRENT_COMPANY = {
  companyName: "Daiso Vietnam Co., Ltd.",
  country: "VN",
  companyCode: "vn-daiso-vietnam",
};
