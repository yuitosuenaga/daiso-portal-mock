import "server-only";

import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import { normalizeEmail } from "@/lib/auth/google-login-policy";
import { summarizeIp } from "@/lib/auth/login-throttle-policy";
import { prisma } from "@/lib/db/prisma";
import { errorFields, logger } from "./logger";

export type AuthEventType =
  | "login_success"
  | "login_failure"
  | "login_locked"
  | "login_blocked"
  | "account_provisioned";
export type AuthMethod = "credentials" | "google";
export type AuthPortal = "applicant" | "helpdesk";

/**
 * メールアドレスを識別子ハッシュに変換する（HMAC-SHA256、先頭32桁）。
 * 監査ログ・ロックアウト台帳にメールアドレスを平文で残さないために使う。
 * 鍵は`AUTH_SECRET`。本番（NODE_ENV=production）で未設定ならfail closedで例外にする。
 * 開発・テストのみ固定値フォールバックを許可する。
 */
export function hashIdentifier(email: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }
  const key = secret ?? "portal-mock-auth-audit";
  return createHmac("sha256", key)
    .update(normalizeEmail(email))
    .digest("hex")
    .slice(0, 32);
}

/** リクエストヘッダからクライアントIPの匿名化概要を得る。ヘッダが取れない場合は"unknown"。 */
export async function getClientIpSummary(): Promise<string> {
  try {
    const h = await headers();
    return summarizeIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));
  } catch {
    return "unknown";
  }
}

export interface AuthEventInput {
  type: AuthEventType;
  method: AuthMethod;
  portal: AuthPortal;
  userId?: string | null;
  identifierHash?: string | null;
  reason?: string;
}

/**
 * 認証イベントを監査ログ（DB + 構造化ログ）へ記録する。ログ記録の失敗でログイン自体を
 * 妨げないよう、例外は握りつぶして標準エラーへ出す。メールアドレス・パスワードは渡さない。
 */
export async function recordAuthEvent(input: AuthEventInput): Promise<void> {
  const ipSummary = await getClientIpSummary();
  const entry = {
    type: input.type,
    method: input.method,
    portal: input.portal,
    userId: input.userId ?? null,
    identifierHash: input.identifierHash ?? null,
    ipSummary,
    reason: input.reason ?? null,
  };
  // Cloud Logging等で拾える構造化ログ（PIIなし）
  logger.info("auth", { event: "auth", ...entry });
  try {
    await prisma.authEvent.create({ data: entry });
  } catch (error) {
    logger.error("auth audit log write failed", errorFields(error));
  }
}
