// FAQ機能のドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

/** FAQの種別（category）。ヒアリング後に選択肢が変更される前提の仮値。 */
export type FaqCategory = "inquiry_method" | "form_input" | "status" | "other";

export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  /** 登録日時（ISO文字列）。 */
  createdAt: string;
  /** 更新日時（ISO文字列）。Prismaの`@updatedAt`によりレコード更新時に自動更新される。 */
  updatedAt: string;
}

/**
 * FAQ新規作成・編集時のAPI入力契約。
 * `Faq`から`id`・`createdAt`・`updatedAt`（いずれもAPI/DB側で採番・自動更新）を除いたサブセット。
 */
export type CreateFaqInput = Omit<Faq, "id" | "createdAt" | "updatedAt">;
