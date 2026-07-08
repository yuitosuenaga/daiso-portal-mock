import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/server/get-session";
import { toErrorResponse } from "@/lib/server/api-errors";
import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { setClaim } from "@/lib/server/inquiry-service";

const claimBodySchema = z.object({ claim: z.boolean() });

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

    const { claim } = claimBodySchema.parse(await request.json());

    const inquiry = await setClaim(
      params.id,
      claim
        ? {
            staffId: session.claims.staffId,
            displayName: session.claims.displayName,
          }
        : null
    );

    return NextResponse.json(inquiry, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
