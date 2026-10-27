import { createHash, timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { safeErrorLabel } from "@/lib/server/error-label";
import { runAnnouncementAutoEscalation } from "@/lib/server/announcement-escalation";

// Prisma・`server-only`依存のため、Edge Runtimeでは動作しない。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * リクエストヘッダーから、Cronエンドポイント認証用のシークレット候補を優先順に取り出す。
 * Cloud SchedulerのOIDC利用時は`Authorization: Bearer <IDトークン>`が付与されるため、
 * アプリ層のシークレットである`x-cron-secret`を先に照合し、`Authorization: Bearer <secret>`
 * 単独（従来方式）も候補として受け付ける（要件38.10）。
 */
function extractSecretCandidates(request: NextRequest): string[] {
  const candidates: string[] = [];
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret) {
    candidates.push(headerSecret);
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice("Bearer ".length);
    if (bearer) {
      candidates.push(bearer);
    }
  }
  return candidates;
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
    // 誤って無認証で叩けないようにする（要件38.10）。設定状態を外部へ開示しないよう、
    // シークレット不一致と同じ401・固定文言で応答する。
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 全候補を定数時間比較で評価し、早期リターンによるタイミング差を作らない。
  const authorized = extractSecretCandidates(request)
    .map((candidate) => timingSafeEqualStrings(candidate, cronSecret))
    .some(Boolean);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRunParam = request.nextUrl.searchParams.get("dryRun");
  const dryRun = dryRunParam === "1" || dryRunParam === "true";

  const startedAt = Date.now();
  try {
    const result = await runAnnouncementAutoEscalation(new Date(), { dryRun });
    // 件数のみを構造化ログに出す（メール・氏名・本文などのPIIは含めない）。
    console.info(
      `[cron] announcement-escalation result ${JSON.stringify({
        ...result,
        durationMs: Date.now() - startedAt,
      })}`
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // DB接続不可などの致命的失敗。500を返し、Scheduler・監視が失敗を検知できるようにする。
    console.error(
      `[cron] announcement-escalation failed: ${safeErrorLabel(error)}`
    );
    return NextResponse.json({ error: "Escalation run failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}
