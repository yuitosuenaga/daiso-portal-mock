import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { DoubleClaimError, InquiryNotFoundError } from "@/lib/server/inquiry-service";

/**
 * Route Handler内で送出された例外を、design.mdのAPI Contractで定義された
 * HTTPステータスコードに変換する。
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedSessionError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues }, { status: 400 });
  }
  if (error instanceof InquiryNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof DoubleClaimError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
