import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { runLogRetention } from "@/lib/server/log-retention";
import { errorFields, logger } from "@/lib/server/logger";

// Prisma・`server-only`依存のため、Edge Runtimeでは動作しない。
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// fail-safe: dryRunパラメータがある場合、全ての値が"0"/"false"（trim・大文字小文字無視）でない限りdryRunとみなす。
// 複数指定は1つでも他の値が混じればdryRun。パラメータ無し（Schedulerの呼び出し）のみ従来どおり本削除。
// タイプミスで意図せず削除しないための設計。
// ※routeファイルは任意のexportができないため、モジュール内に留める。
function parseDryRun(params: string[]): boolean {
  if (params.length === 0) return false;
  return !params.every((param) => {
    const normalized = param.trim().toLowerCase();
    return normalized === "0" || normalized === "false";
  });
}

async function handleCronRequest(request: NextRequest): Promise<NextResponse> {
  // 未設定・不一致を区別せず401・固定文言で応答する（設定状態を外部へ開示しない）。督促Cronと同じ慣習。
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = parseDryRun(request.nextUrl.searchParams.getAll("dryRun"));

  try {
    const result = await runLogRetention(new Date(), { dryRun });
    // 件数のみを構造化ログに出す（PIIは含めない）。
    logger.info("[cron] log-retention result", { ...result });
    const failed = Object.values(result.tables).some((table) => table.error);
    if (failed) {
      // 一部テーブルの失敗を500で返し、Scheduler・監視が検知できるようにする（詳細はログのみ）。
      return NextResponse.json(
        { error: "Log retention run failed" },
        { status: 500 },
      );
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error("[cron] log-retention failed", errorFields(error));
    return NextResponse.json(
      { error: "Log retention run failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCronRequest(request);
}
