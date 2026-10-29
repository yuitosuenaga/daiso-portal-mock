import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { errorFields, logger } from "@/lib/server/logger";
import { runAnnouncementAutoEscalation } from "@/lib/server/announcement-escalation";

// Prisma・`server-only`依存のため、Edge Runtimeでは動作しない。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleCronRequest(request: NextRequest): Promise<NextResponse> {
  // CRON_SECRET未設定の環境ではエンドポイント自体を無効化する（要件38.10）。設定状態を外部へ
  // 開示しないよう、シークレット不一致と同じ401・固定文言で応答する。
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRunParam = request.nextUrl.searchParams.get("dryRun");
  const dryRun = dryRunParam === "1" || dryRunParam === "true";

  const startedAt = Date.now();
  try {
    const result = await runAnnouncementAutoEscalation(new Date(), { dryRun });
    // 件数のみを構造化ログに出す（メール・氏名・本文などのPIIは含めない）。
    logger.info("[cron] announcement-escalation result", {
      ...result,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // DB接続不可などの致命的失敗。500を返し、Scheduler・監視が失敗を検知できるようにする。
    logger.error("[cron] announcement-escalation failed", errorFields(error));
    return NextResponse.json({ error: "Escalation run failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}
