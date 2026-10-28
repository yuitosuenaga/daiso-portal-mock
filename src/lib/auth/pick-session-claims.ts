import type { SessionClaims } from "@/types/session";

/**
 * `/api/auth/session`としてブラウザへ返るセッションに載せるクレームのホワイトリスト。
 * JWT全体（`sub`/`iat`/`exp`/`jti`や将来追加されるフィールド）をそのまま返さないよう、
 * アプリが参照するフィールドだけを取り出す。`SessionClaims`のフィールドを増やしたら、
 * ここにも追加すること。
 *
 * 注意: ここで返る申請者の会社情報（companyCode/country/companyName/companyId）はJWT由来で
 * ログイン時の値のまま古くなりうる。権限判定やデータのキーには使わず、サーバー側では
 * DB値で上書きされる`getSession`の結果を使うこと。
 */
const CLAIM_KEYS = [
  "id",
  "role",
  "applicantUserId",
  "companyId",
  "companyName",
  "companyCode",
  "country",
  "staffId",
  "displayName",
] as const;

export function pickSessionClaims(
  token: Record<string, unknown>
): SessionClaims & { id: string } {
  const picked: Record<string, unknown> = {};
  for (const key of CLAIM_KEYS) {
    if (token[key] !== undefined) {
      picked[key] = token[key];
    }
  }
  return picked as unknown as SessionClaims & { id: string };
}
