import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  findMonthlyMaterialFileById,
  findMonthlyMaterialFileMetaById,
  findMonthlyMaterialFileMetaVisibleTo,
  findMonthlyMaterialFileVisibleTo,
  getMonthlyMaterialFileStats,
} from "@/lib/server/monthly-material-service";
import {
  FileBusyError,
  busyResponse,
  pdfFileHeadResponse,
  pdfFileResponse,
  withHeadStatsPermit,
  withNoStore,
} from "@/lib/server/file-response";
import { getSession } from "@/lib/server/get-session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 月次資料PDFの配信。middlewareは/apiを対象外にしているため、認可はこのルート内で行う。
 * 申請者は公開範囲が自社に及ぶ資料のみ、ヘルプデスクは全件。他社向け・存在しない・
 * Google方式はいずれも404（区別させない）。
 */
async function handle(request: Request, props: RouteParams, head: boolean): Promise<Response> {
  const params = await props.params;
  try {
    const session = await getSession();
    if (!session?.claims) {
      throw new UnauthorizedSessionError("Session required");
    }
    const claims = session.claims;

    const applicant = claims.role === "applicant";

    // 認可確認は本体を読まない軽いクエリで行う（未認可・存在しない・Google型は404）
    const meta = applicant
      ? await findMonthlyMaterialFileMetaVisibleTo(params.id, claims.country, claims.companyCode)
      : await findMonthlyMaterialFileMetaById(params.id);
    if (!meta) {
      return withNoStore(NextResponse.json({ error: "Not Found" }, { status: 404 }));
    }

    const download = new URL(request.url).searchParams.get("download") === "1";

    if (head) {
      // HEADは本体を読まず、DB側で集計した長さ・先頭・末尾だけでヘッダーを組み立てる
      // DB側の集計は同時数を制限する（待ちが長引いたら503）
      let stats;
      try {
        stats = await withHeadStatsPermit(() => getMonthlyMaterialFileStats(meta.id));
      } catch (error) {
        if (error instanceof FileBusyError) {
          return busyResponse();
        }
        throw error;
      }
      if (!stats) {
        return withNoStore(NextResponse.json({ error: "Not Found" }, { status: 404 }));
      }
      return pdfFileHeadResponse(meta, stats, { download });
    }

    // GETはセマフォ取得後に本体を読む（同時にメモリへ載る本体を制限）。可視性述語は再適用される
    return await pdfFileResponse(
      () =>
        applicant
          ? findMonthlyMaterialFileVisibleTo(params.id, claims.country, claims.companyCode)
          : findMonthlyMaterialFileById(params.id),
      { download }
    );
  } catch (error) {
    return withNoStore(toErrorResponse(error));
  }
}

export async function GET(request: Request, props: RouteParams): Promise<Response> {
  return handle(request, props, false);
}

/**
 * HEADを明示的に処理する。Next.jsはHEADをGETで代行するが、その場合ボディを読まず
 * cancelもしないため、本体保持用のセマフォ許可が戻らなくなる。HEADは本体を読まず、
 * DB側の集計（長さ・先頭・末尾）だけでヘッダーを返す。
 */
export async function HEAD(request: Request, props: RouteParams): Promise<Response> {
  return handle(request, props, true);
}
