import "server-only";

import { parseAllowedEmailDomains } from "@/lib/auth/google-login-policy";

/** AUTH_GOOGLE_ID・AUTH_GOOGLE_SECRETが両方設定されているときのみGoogleログインを有効にする。 */
export function isGoogleLoginEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

/** ALLOWED_EMAIL_DOMAINS（カンマ区切り）を正規化した配列。未設定は空（=全拒否）。 */
export function getAllowedEmailDomains(): string[] {
  return parseAllowedEmailDomains(process.env.ALLOWED_EMAIL_DOMAINS);
}
