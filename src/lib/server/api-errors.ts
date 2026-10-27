import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  ClaimOwnershipError,
  DoubleClaimError,
  InquiryNotFoundError,
} from "@/lib/server/inquiry-service";
import { errorFields, logger } from "@/lib/server/logger";

/**
 * Route Handler内で送出された例外を、design.mdのAPI Contractで定義された
 * HTTPステータスコードに変換する。
 * レスポンス本文には例外メッセージ（ID等を含みうる）やZodのissuesを載せず、固定文言のみを返す。
 * 応答から外した詳細（元メッセージ・例外プロパティのID・Zodのissues）はサーバーログへ出す
 * （リクエスト本文全体は出さず、Zodはissuesのpath/code/messageのみ）。
 */
// 想定内エラー(400/401/403/404/409)はstack_traceを出さない。500の想定外例外のみ従来どおり全情報。
const EXPECTED = { stack: false } as const;

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedSessionError) {
    logger.warn("[api-errors] Unauthorized", errorFields(error, EXPECTED));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ZodError) {
    logger.warn("[api-errors] Invalid request", {
      ...errorFields(error, EXPECTED),
      issues: error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), code: i.code, message: i.message })),
    });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (error instanceof InquiryNotFoundError) {
    logger.warn("[api-errors] Not Found", errorFields(error, EXPECTED));
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  if (error instanceof DoubleClaimError) {
    logger.warn("[api-errors] Conflict", errorFields(error, EXPECTED));
    return NextResponse.json({ error: "Conflict" }, { status: 409 });
  }
  if (error instanceof ClaimOwnershipError) {
    logger.warn("[api-errors] Forbidden", errorFields(error, EXPECTED));
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  logger.error("[api-errors] Unhandled error", errorFields(error));
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
