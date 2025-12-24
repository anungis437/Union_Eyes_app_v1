import { NextRequest, NextResponse } from "next/server";
import { getClaimStatistics } from "@/db/queries/claims-queries";
import { withTenantAuth } from "@/lib/tenant-middleware";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import { unstable_cache } from 'next/cache';

// Cache dashboard stats for 60 seconds per tenant
const getCachedDashboardStats = unstable_cache(
  async (tenantId: string) => {
    const statistics = await getClaimStatistics(tenantId);
    
    // Get member count for this organization
    const memberCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM organization_members
      WHERE organization_id = ${tenantId}
      AND deleted_at IS NULL
    `);
    
    const memberCount = Number(memberCountResult[0]?.count || 0);
    
    return {
      ...statistics,
      activeMembers: memberCount,
    };
  },
  ['dashboard-stats'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['dashboard', 'stats'],
  }
);

/**
 * GET /api/dashboard/stats?tenantId=<uuid>
 * Fetch dashboard statistics for the specified tenant
 * Protected by tenant middleware (falls back to query param if cookie not set)
 */
export const GET = withTenantAuth(async (request: NextRequest, context) => {
  try {
    // Prefer query parameter over middleware tenantId (to avoid cookie timing issues)
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get('tenantId');
    const tenantId = queryTenantId || context.tenantId;
    
    console.log('[API /api/dashboard/stats] Fetching stats for tenantId:', tenantId, { fromQuery: !!queryTenantId });
    
    // Use cached stats
    const response = await getCachedDashboardStats(tenantId);
    
    console.log('[API /api/dashboard/stats] Returning response:', response);
    
    // Add cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    // Return default empty stats instead of error
    return NextResponse.json({
      activeClaims: 0,
      pendingReviews: 0,
      urgentCases: 0,
      resolvedClaims: 0,
      averageResolutionTime: 0,
      activeMembers: 0,
      error: error instanceof Error ? error.message : "Failed to fetch statistics"
    });
  }
});
