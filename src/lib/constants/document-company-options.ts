// ドキュメントの公開範囲（販社単位）で使用する販社コード一覧（フェーズ1の仮マスタ）。
// フェーズ3で認証・実際の販社マスタAPIに置き換わる前提。`documents-management`spec所有。

export const DOCUMENT_COMPANY_CODES = [
  "jp-daiso-japan-trading",
  "us-daiso-usa",
  "kr-daiso-korea",
  "th-daiso-thailand",
  "vn-daiso-vietnam",
  "id-daiso-indonesia",
  "tw-daiso-taiwan",
  "sg-daiso-singapore",
] as const;

export type DocumentCompanyCode = (typeof DOCUMENT_COMPANY_CODES)[number];

export interface DocumentCompanyOption {
  code: DocumentCompanyCode;
  companyName: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
}

export const DOCUMENT_COMPANY_OPTIONS: DocumentCompanyOption[] = [
  { code: "jp-daiso-japan-trading", companyName: "Daiso Japan Trading Co.", country: "JP" },
  { code: "us-daiso-usa", companyName: "Daiso USA Inc.", country: "US" },
  { code: "kr-daiso-korea", companyName: "Daiso Korea Co., Ltd.", country: "KR" },
  { code: "th-daiso-thailand", companyName: "Daiso Thailand Co., Ltd.", country: "TH" },
  { code: "vn-daiso-vietnam", companyName: "Daiso Vietnam Co., Ltd.", country: "VN" },
  { code: "id-daiso-indonesia", companyName: "Daiso Indonesia Co., Ltd.", country: "ID" },
  { code: "tw-daiso-taiwan", companyName: "Daiso Taiwan Co., Ltd.", country: "TW" },
  { code: "sg-daiso-singapore", companyName: "Daiso Singapore Pte. Ltd.", country: "SG" },
];
