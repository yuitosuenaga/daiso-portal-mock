import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  ClaimOwnershipError,
  DoubleClaimError,
  InquiryNotFoundError,
} from "@/lib/server/inquiry-service";

/**
 * Route Handler内で送出された例外を、design.mdのAPI Contractで定義された
 * HTTPステータスコードに変換する。
 * レスポンス本文には例外メッセージ（ID等を含みうる）やZodのissuesを載せず、固定文言のみを返す。
 * 詳細のログ出力は logger 導入後（#165）に追加する。
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedSessionError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (error instanceof InquiryNotFoundError) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  if (error instanceof DoubleClaimError) {
    return NextResponse.json({ error: "Conflict" }, { status: 409 });
  }
  if (error instanceof ClaimOwnershipError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
