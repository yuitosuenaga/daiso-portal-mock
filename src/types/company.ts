// 販社（Company）管理機能のドメイン型定義。

export interface Company {
  id: string;
  name: string;
  country: string;
  companyCode: string;
  createdAt: string;
}

/** 販社管理一覧向けに、所属する申請者アカウント数（`applicantUserCount`）を加えた表示用の型。 */
export interface CompanyWithStats extends Company {
  applicantUserCount: number;
}

/**
 * 販社の新規作成・編集フォームのAPI入力契約。
 * `Company`から`id`（API側で生成）・`createdAt`（保存時刻を採番）を除いたサブセット。
 */
export type CreateCompanyInput = Pick<Company, "name" | "country" | "companyCode">;
