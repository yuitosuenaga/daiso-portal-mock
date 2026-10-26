import { NextResponse } from "next/server";

import { getSession } from "@/lib/server/get-session";
import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  findInquiryById,
  findInquiryForCompany,
} from "@/lib/server/inquiry-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, props: RouteParams): Promise<NextResponse> {
  const params = await props.params;
  try {
    const session = await getSession();
    if (!session?.claims) {
      throw new UnauthorizedSessionError("Session required");
    }

    const inquiry =
      session.claims.role === "applicant"
        ? await findInquiryForCompany(params.id, session.claims.companyId)
        : await findInquiryById(params.id);

    if (!inquiry) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(inquiry, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
