import "server-only";

import {
  parseAllowedEmailDomains,
  resolveAutoProvisionDomains,
} from "@/lib/auth/google-login-policy";

import { logger } from "./logger";

/** AUTH_GOOGLE_ID・AUTH_GOOGLE_SECRETが両方設定されているときのみGoogleログインを有効にする。 */
export function isGoogleLoginEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

/** ALLOWED_EMAIL_DOMAINS（カンマ区切り）を正規化した配列。未設定は空（=全拒否）。 */
export function getAllowedEmailDomains(): string[] {
  return parseAllowedEmailDomains(process.env.ALLOWED_EMAIL_DOMAINS);
}

/**
 * ヘルプデスク担当者の自動作成を許可するドメイン。GOOGLE_HELPDESK_AUTO_PROVISIONが"true"のときのみ
 * 「GOOGLE_HELPDESK_AUTO_PROVISION_DOMAINS ∩ ALLOWED_EMAIL_DOMAINS」。それ以外は空（=従来仕様）。
 */
export function getHelpdeskAutoProvisionDomains(): string[] {
  const flag = process.env.GOOGLE_HELPDESK_AUTO_PROVISION;
  const domains = resolveAutoProvisionDomains(
    flag,
    process.env.GOOGLE_HELPDESK_AUTO_PROVISION_DOMAINS,
    getAllowedEmailDomains()
  );
  if (flag === "true" && domains.length === 0 && !warnedEmptyDomains) {
    warnedEmptyDomains = true;
    logger.warn(
      "GOOGLE_HELPDESK_AUTO_PROVISION is true but no effective auto-provision domains (check GOOGLE_HELPDESK_AUTO_PROVISION_DOMAINS and ALLOWED_EMAIL_DOMAINS)"
    );
  }
  return domains;
}

let warnedEmptyDomains = false;
