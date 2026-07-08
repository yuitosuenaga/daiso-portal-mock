// 認証セッションのクレーム形状（フェーズ3で導入する認証機能）。

export type ApplicantSessionClaims = {
  role: "applicant";
  applicantUserId: string;
  companyId: string;
  companyName: string;
};

export type HelpdeskSessionClaims = {
  role: "helpdesk";
  staffId: string;
  displayName: string;
};

export type SessionClaims = ApplicantSessionClaims | HelpdeskSessionClaims;

export type ApplicantAuthorizedUser = ApplicantSessionClaims & { id: string };
export type HelpdeskAuthorizedUser = HelpdeskSessionClaims & { id: string };
