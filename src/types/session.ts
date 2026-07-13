// 認証セッションのクレーム形状（フェーズ3で導入する認証機能）。

export type ApplicantSessionClaims = {
  role: "applicant";
  applicantUserId: string;
  companyId: string;
  companyName: string;
  /** `DOCUMENT_COMPANY_CODES`のいずれかの値。お知らせの確認・追跡対象の特定に使用する。 */
  companyCode: string;
  /** ISO 3166-1 alpha-2。お知らせの配信対象フィルタに使用する。 */
  country: string;
};

export type HelpdeskSessionClaims = {
  role: "helpdesk";
  staffId: string;
  displayName: string;
};

export type SessionClaims = ApplicantSessionClaims | HelpdeskSessionClaims;

export type ApplicantAuthorizedUser = ApplicantSessionClaims & { id: string };
export type HelpdeskAuthorizedUser = HelpdeskSessionClaims & { id: string };
