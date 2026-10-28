import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  findDocumentFileById,
  findDocumentFileVisibleTo,
} from "@/lib/server/document-service";
import { pdfFileHeadResponse, pdfFileResponse, withNoStore } from "@/lib/server/file-response";
import { getSession } from "@/lib/server/get-session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 資料PDFの配信。middlewareは/apiを対象外にしているため、認可はこのルート内で行う。
 * 申請者は自社に可視な公開済み資料のみ、ヘルプデスクは全件。他社向け・下書き・存在しない・
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

    const file =
      claims.role === "applicant"
        ? await findDocumentFileVisibleTo(params.id, claims.country, claims.companyCode)
        : await findDocumentFileById(params.id);

    if (!file) {
      return withNoStore(NextResponse.json({ error: "Not Found" }, { status: 404 }));
    }

    const download = new URL(request.url).searchParams.get("download") === "1";
    return head
      ? pdfFileHeadResponse(file, { download })
      : await pdfFileResponse(file, { download });
  } catch (error) {
    return withNoStore(toErrorResponse(error));
  }
}

export async function GET(request: Request, props: RouteParams): Promise<Response> {
  return handle(request, props, false);
}

/**
 * HEADを明示的に処理する。Next.jsはHEADをGETで代行するが、その場合ボディを読まず
 * cancelもしないため、本体保持用のセマフォ許可が戻らなくなる。ヘッダーだけを返す。
 */
export async function HEAD(request: Request, props: RouteParams): Promise<Response> {
  return handle(request, props, true);
}
