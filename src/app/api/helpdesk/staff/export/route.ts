import { NextResponse } from "next/server";

import { neutralizeFormulaCell, toCsv } from "@/lib/csv";
import { toErrorResponse } from "@/lib/server/api-errors";
import {
  ForbiddenSessionError,
  UnauthorizedSessionError,
  requireHelpdeskAdminSession,
} from "@/lib/server/auth-session";
import { withNoStore } from "@/lib/server/file-response";
import { listHelpdeskStaff } from "@/lib/server/helpdesk-staff-service";
import { logger } from "@/lib/server/logger";

const COLUMNS = [
  "email",
  "displayName",
  "role",
  "isActive",
  "registrationSource",
  "createdAt",
] as const;

/** ファイル名用の日付(JST、YYYYMMDD)。 */
function jstDateStamp(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");
}

/**
 * スタッフ一覧のCSVエクスポート(admin専用)。middlewareは/apiを対象外にしているため、
 * 認可はこのルート内で行う。admin以外にはページと同様に存在を見せず404を返す。
 * passwordHashは一覧サービスがselectしないため出力に含まれない。
 */
export async function GET(): Promise<Response> {
  try {
    const session = await requireHelpdeskAdminSession();
    const staff = await listHelpdeskStaff();

    const rows: string[][] = [
      [...COLUMNS],
      ...staff.map((s) => [
        neutralizeFormulaCell(s.email),
        neutralizeFormulaCell(s.displayName),
        s.role,
        s.isActive ? "true" : "false",
        s.registrationSource,
        new Date(s.createdAt).toISOString(),
      ]),
    ];

    // 監査ログ。メールアドレス・表示名は出さない。
    logger.info("helpdesk staff exported", {
      operatorId: session.claims.staffId,
      count: staff.length,
    });

    return withNoStore(
      new NextResponse(toCsv(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="helpdesk-staff-${jstDateStamp(new Date())}.csv"`,
        },
      })
    );
  } catch (error) {
    // ForbiddenSessionErrorはUnauthorizedSessionErrorのサブクラスなので先に判定する。
    if (error instanceof ForbiddenSessionError) {
      return withNoStore(NextResponse.json({ error: "Not Found" }, { status: 404 }));
    }
    if (error instanceof UnauthorizedSessionError) {
      return withNoStore(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return withNoStore(toErrorResponse(error));
  }
}
