import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import { getSession } from "@/lib/server/get-session";
import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  appendHistoryEntry,
  findInquiryForCompany,
} from "@/lib/server/inquiry-service";

const historyBodySchema = z.object({
  type: z.enum([
    "claimed",
    "released",
    "status_changed",
    "reply_sent",
    "requester_message",
  ]),
  detail: z.string().optional(),
  attachments: inquiryAttachmentsArraySchema.optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.claims) {
      throw new UnauthorizedSessionError("Session required");
    }

    const body = historyBodySchema.parse(await request.json());

    if (session.claims.role === "applicant") {
      if (body.type !== "requester_message") {
        return NextResponse.json(
          { error: "Applicants may only add requester_message entries" },
          { status: 400 }
        );
      }

      const inquiry = await findInquiryForCompany(
        params.id,
        session.claims.companyId
      );
      if (!inquiry) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }

      const created = await appendHistoryEntry({
        inquiryId: params.id,
        type: body.type,
        actorName: session.claims.companyName,
        occurredAt: new Date().toISOString(),
        detail: body.detail,
        attachments: body.attachments,
      });

      return NextResponse.json(created, { status: 201 });
    }

    if (body.type === "requester_message") {
      return NextResponse.json(
        { error: "Helpdesk staff may not add requester_message entries" },
        { status: 400 }
      );
    }

    const created = await appendHistoryEntry({
      inquiryId: params.id,
      type: body.type,
      actorName: session.claims.displayName,
      occurredAt: new Date().toISOString(),
      detail: body.detail,
      attachments: body.attachments,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
