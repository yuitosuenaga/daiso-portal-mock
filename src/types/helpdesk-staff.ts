// 日本側ヘルプデスクスタッフ（HelpdeskStaff）管理機能のドメイン型定義。

export type HelpdeskStaffRole = "admin" | "member";

export type HelpdeskStaffRegistrationSource = "seed" | "manual" | "google_auto";

/** 一覧表示に使うスタッフ情報。`passwordHash`は含まない。 */
export interface HelpdeskStaffSummary {
  id: string;
  email: string;
  displayName: string;
  role: HelpdeskStaffRole;
  registrationSource: HelpdeskStaffRegistrationSource;
  isActive: boolean;
  createdAt: string;
}

/**
 * スタッフ新規作成のAPI入力契約。`password`は平文（サービス層でハッシュ化する）。
 * 未指定・空文字ならパスワード未設定（Googleログイン専用）で作成する。
 */
export interface CreateHelpdeskStaffInput {
  email: string;
  displayName: string;
  password?: string;
  role: HelpdeskStaffRole;
}
