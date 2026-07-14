import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_STATUS_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import {
  inquiryAttachmentsArraySchema,
  TITLE_MAX_LENGTH,
} from "@/lib/validation/inquiry";
import { getSession } from "@/lib/server/get-session";
import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { createInquiry } from "@/lib/api/inquiries";
import {
  listAllInquiries,
  listInquiriesForCompany,
} from "@/lib/server/inquiry-service";

const createInquirySchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX_LENGTH),
  category: z.enum(INQUIRY_CATEGORY_CODES),
  urgency: z.enum(INQUIRY_URGENCY_CODES),
  storeRegion: z.string().trim().min(1),
  originalText: z.string().min(1),
  originalLanguage: z.string().min(1),
  status: z.enum(INQUIRY_STATUS_CODES),
  createdAt: z.string(),
  submittedBy: z.object({
    companyName: z.string().trim().min(1),
    country: z.string().min(1),
  }),
  attachments: inquiryAttachmentsArraySchema.optional(),
});

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
