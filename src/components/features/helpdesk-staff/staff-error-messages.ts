import type { HelpdeskStaffActionResult } from "@/lib/actions/helpdesk-staff";

/** スタッフ操作の失敗理由ごとの表示文言（翻訳解決は呼び出し側の責務）。 */
export interface StaffErrorMessages {
  self: string;
  lastAdmin: string;
  notFound: string;
  /** サーバー側の入力検証に失敗したとき。 */
  invalid: string;
  /** 想定外の失敗（ネットワーク断・サーバーエラー等）。 */
  generic: string;
}

/** 失敗結果の`reason`に対応する文言を返す。`emailTaken`は操作ボタンでは起きないため汎用文言。 */
export function staffFailureMessage(
  reason: Extract<HelpdeskStaffActionResult, { ok: false }>["reason"],
  errors: StaffErrorMessages
): string {
  switch (reason) {
    case "self":
      return errors.self;
    case "lastAdmin":
      return errors.lastAdmin;
    case "notFound":
      return errors.notFound;
    case "invalid":
      return errors.invalid;
    default:
      return errors.generic;
  }
}
