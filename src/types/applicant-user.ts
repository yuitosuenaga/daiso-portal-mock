// 申請者アカウント（ApplicantUser）管理機能のドメイン型定義。

/**
 * 一覧・詳細・編集画面の表示に使う申請者アカウント情報。
 * `passwordHash`（パスワードハッシュ）は含まない。パスワードの平文がこの型に
 * 含まれることもない。
 */
export interface ApplicantUserSummary {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  preferredLocale: string;
}

/**
 * 申請者アカウント新規作成時のAPI入力契約。
 * `password`は平文（サービス層でハッシュ化してから保存する）。
 */
export interface CreateApplicantUserInput {
  email: string;
  displayName: string;
  password: string;
  preferredLocale: string;
}

/**
 * 申請者アカウント編集時のAPI入力契約。
 * `password`が`undefined`の場合は既存の`passwordHash`を変更しない。
 */
export interface UpdateApplicantUserInput {
  email: string;
  displayName: string;
  password?: string;
  preferredLocale: string;
}
