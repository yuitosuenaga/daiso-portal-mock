import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  findDocumentFileById,
  findDocumentFileVisibleTo,
} from "@/lib/server/document-service";
import { pdfFileResponse } from "@/lib/server/file-response";
import { getSession } from "@/lib/server/get-session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 資料PDFの配信。middlewareは/apiを対象外にしているため、認可はこのルート内で行う。
 * 申請者は自社に可視な公開済み資料のみ、ヘルプデスクは全件。他社向け・下書き・存在しない・
 * Google方式はいずれも404（区別させない）。
 */
export async function GET(request: Request, props: RouteParams): Promise<Response> {
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
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const download = new URL(request.url).searchParams.get("download") === "1";
    return await pdfFileResponse(file, { download });
  } catch (error) {
    return toErrorResponse(error);
  }
}
