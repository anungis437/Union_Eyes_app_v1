import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClaimStatistics } from "@/db/queries/claims-queries";
import { getTenantIdForUser } from "@/lib/tenant-utils";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get tenant ID for the authenticated user
    const tenantId = await getTenantIdForUser(userId);
    
    const statistics = await getClaimStatistics(tenantId);
    
    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    // Return default empty stats instead of error
    return NextResponse.json({
      activeClaims: 0,
      pendingReviews: 0,
      urgentCases: 0,
      resolvedClaims: 0,
      averageResolutionTime: 0,
      error: error instanceof Error ? error.message : "Failed to fetch statistics"
    });
  }
}
