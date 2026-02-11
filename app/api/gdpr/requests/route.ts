import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { db } from "@/db";
import { gdprDataRequests } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

type GdprRequestType = typeof gdprDataRequests.$inferSelect.requestType;

export const GET = withApiAuth(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationIdFromQuery =
      searchParams.get("organizationId") ?? searchParams.get("tenantId");
    const requestType = searchParams.get("type") as GdprRequestType | null;

    if (!organizationIdFromQuery) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
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
    return NextResponse.json(
      { error: "Failed to load GDPR requests" },
      { status: 500 }
    );
  }
});
