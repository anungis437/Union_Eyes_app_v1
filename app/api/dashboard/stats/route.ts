import { NextRequest, NextResponse } from "next/server";
import { getClaimStatistics } from "@/db/queries/claims-queries";
import { withTenantAuth } from "@/lib/tenant-middleware";

/**
 * GET /api/dashboard/stats
 * Fetch dashboard statistics for the current tenant
 * Protected by tenant middleware
 */
export const GET = withTenantAuth(async (request: NextRequest, context) => {
  try {
    const { tenantId } = context;
    
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
});
