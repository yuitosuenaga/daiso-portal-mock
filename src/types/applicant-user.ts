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

/** お知らせの個人指定で検索・選択する申請者アカウントの表示用情報。 */
export interface ApplicantUserTargetOption {
  id: string;
  displayName: string;
  email: string;
  companyName: string;
  country: string;
}

/** お知らせの会社指定で検索・選択する会社の表示用情報。 */
export interface CompanyTargetOption {
  id: string;
  name: string;
  country: string;
  companyCode: string;
  /** 会社に所属する有効な申請者アカウント数（会社を選ぶと全員に配信される）。 */
  activeUserCount: number;
}

/** 個人・会社指定の検索結果。会社と個人を別々の候補として返す。 */
export interface TargetingCandidates {
  companies: CompanyTargetOption[];
  users: ApplicantUserTargetOption[];
}
