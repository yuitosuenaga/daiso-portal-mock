import { NextRequest, NextResponse } from "next/server";

import { createInquirySchema } from "@/lib/validation/inquiry";
import { getSession } from "@/lib/server/get-session";
import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { createInquiry } from "@/lib/api/inquiries";
import {
  listAllInquiries,
  listInquiriesForCompany,
} from "@/lib/server/inquiry-service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.claims || session.claims.role !== "applicant") {
      throw new UnauthorizedSessionError("Applicant session required");
    }

    const body = await request.json();
    const input = createInquirySchema.parse(body);

    const created = await createInquiry(input);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.claims) {
      throw new UnauthorizedSessionError("Session required");
    }

    const inquiries =
      session.claims.role === "applicant"
        ? await listInquiriesForCompany(session.claims.companyId)
        : await listAllInquiries();

    return NextResponse.json(inquiries, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
