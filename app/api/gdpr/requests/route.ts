import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { db } from "@/db";
import { gdprDataRequests } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
type GdprRequestType = typeof gdprDataRequests.$inferSelect.requestType;

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Unauthorized'
    );
    }

    const { searchParams } = new URL(request.url);
    const organizationIdFromQuery =
      searchParams.get("organizationId") ?? searchParams.get("tenantId");
    const requestType = searchParams.get("type") as GdprRequestType | null;

    if (!organizationIdFromQuery) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID required'
    );
    }

    const conditions = [
      eq(gdprDataRequests.userId, user.id),
      eq(gdprDataRequests.tenantId, organizationIdFromQuery),
    ];

    if (requestType) {
      conditions.push(eq(gdprDataRequests.requestType, requestType));
    }

    const requests = await db
      .select()
      .from(gdprDataRequests)
      .where(and(...conditions))
      .orderBy(desc(gdprDataRequests.requestedAt));

    return NextResponse.json({ requests });
  } catch {
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to load GDPR requests',
      error
    );
  }
});
