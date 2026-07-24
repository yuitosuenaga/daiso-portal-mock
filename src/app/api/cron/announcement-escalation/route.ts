import { createHash, timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { runAnnouncementAutoEscalation } from "@/lib/server/announcement-escalation";

// Prisma・`server-only`依存のため、Edge Runtimeでは動作しない。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * リクエストヘッダーから、Cronエンドポイント認証用のシークレットを取り出す。
 * `Authorization: Bearer <secret>`または`x-cron-secret: <secret>`のいずれかを受け付ける
 * （要件38.10）。
 */
function extractProvidedSecret(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  return request.headers.get("x-cron-secret");
}

/**
 * 2つの文字列をタイミング攻撃に耐性のある方法で比較する。単純な`===`比較は文字列長・
 * 一致した先頭文字数に応じて処理時間が変わりうるため、両者を固定長（SHA-256、32byte）に
 * ハッシュ化してから`crypto.timingSafeEqual`で比較する。これにより、入力長の違いによる
 * 早期リターン（それ自体がタイミングのサイドチャネルになりうる）も発生しない。
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

async function handleCronRequest(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // 未設定の環境（ローカル・検証環境等）ではエンドポイント自体を無効化し、
    // 誤って無認証で叩けないようにする（要件38.10）。
    return NextResponse.json(
      { error: "Cron endpoint is disabled: CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  const provided = extractProvidedSecret(request);
  if (!provided || !timingSafeEqualStrings(provided, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAnnouncementAutoEscalation();
  return NextResponse.json(result, { status: 200 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}
