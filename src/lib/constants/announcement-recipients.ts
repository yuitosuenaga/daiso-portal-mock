// お知らせの確認済み・実施済み状況を追跡する担当者マスタ（フェーズ1の仮マスタ）。
// `DOCUMENT_COMPANY_OPTIONS`の各社について2名ずつ、計16名を固定のモックデータとして保持する。
// フェーズ3で認証・実際の担当者マスタAPIに置き換わる前提。`announcements-management`spec所有。

import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import type { AnnouncementRecipient } from "@/types/announcement-recipient";

const CONTACT_NAMES_BY_COMPANY_CODE: Record<string, [string, string]> = {
  "jp-daiso-japan-trading": ["高橋 直子", "佐藤 健"],
  "us-daiso-usa": ["Robert Johnson", "Emily Davis"],
  "kr-daiso-korea": ["Kim Min-jun", "Lee Seo-yeon"],
  "th-daiso-thailand": ["Somchai Srisuk", "Nittaya Boonmee"],
  "vn-daiso-vietnam": ["Nguyen Van An", "Tran Thi Hoa"],
  "id-daiso-indonesia": ["Budi Santoso", "Siti Rahayu"],
  "tw-daiso-taiwan": ["Chen Chih-Ming", "Lin Mei-Ling"],
  "sg-daiso-singapore": ["Wei Ming Tan", "Priya Sharma"],
};

export const ANNOUNCEMENT_RECIPIENTS: AnnouncementRecipient[] =
  DOCUMENT_COMPANY_OPTIONS.flatMap((company) => {
    const [firstContactName, secondContactName] =
      CONTACT_NAMES_BY_COMPANY_CODE[company.code];

    return [
      {
        id: `${company.code}-1`,
        companyCode: company.code,
        companyName: company.companyName,
        country: company.country,
        contactName: firstContactName,
      },
      {
        id: `${company.code}-2`,
        companyCode: company.code,
        companyName: company.companyName,
        country: company.country,
        contactName: secondContactName,
      },
    ];
  });
