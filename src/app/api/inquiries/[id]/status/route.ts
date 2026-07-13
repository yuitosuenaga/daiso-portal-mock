import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { INQUIRY_STATUS_CODES } from "@/lib/constants/inquiry-options";
import { getSession } from "@/lib/server/get-session";
import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { updateStatus } from "@/lib/server/inquiry-service";

const statusBodySchema = z.object({ status: z.enum(INQUIRY_STATUS_CODES) });

interface RouteParams {
  params: { id: string };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.claims || session.claims.role !== "helpdesk") {
      throw new UnauthorizedSessionError("Helpdesk session required");
    }

    const { status } = statusBodySchema.parse(await request.json());

    const inquiry = await updateStatus(params.id, status);

    return NextResponse.json(inquiry, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
