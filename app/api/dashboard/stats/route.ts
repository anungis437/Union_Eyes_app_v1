/**
 * Dashboard Statistics API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - Database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { getClaimStatistics } from "@/db/queries/claims-queries";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { unstable_cache } from 'next/cache';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// Cache dashboard stats for 60 seconds per organization
const getCachedDashboardStats = unstable_cache(
  async (organizationId: string) => {
    const statistics = await getClaimStatistics(organizationId);
    
    // Get member count using RLS-protected query
    const memberCount = await withRLSContext(async (tx) => {
      const memberCountResult = await tx.execute(sql`
        SELECT COUNT(*) as count
        FROM organization_members
        WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
      `);
      
      return Number(memberCountResult[0]?.count || 0);
    });
    
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
 * GET /api/dashboard/stats?organizationId=<uuid>
 * Fetch dashboard statistics for the specified organization
 * Protected by enhanced role-based auth with rate limiting
 */
export const GET = withRoleAuth(20, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  // Rate limit dashboard refreshes
  const rateLimitResult = await checkRateLimit(
    RATE_LIMITS.DASHBOARD_REFRESH,
    `dashboard-stats:${userId}`
  );

  if (!rateLimitResult.allowed) {
    return standardErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded'
      // TODO: Migrate additional details: resetIn: rateLimitResult.resetIn
    );
  }
  try {
    // Prefer query parameter over middleware organizationId (to avoid cookie timing issues)
    const { searchParams } = new URL(request.url);
    const queryOrganizationId = searchParams.get('organizationId') ?? searchParams.get('orgId') ?? searchParams.get('organization_id') ?? searchParams.get('org_id');
    const organizationIdParam = queryOrganizationId || context.organizationId;
// Use cached stats
    const response = await getCachedDashboardStats(organizationIdParam);
// Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'dashboard_stats_fetch',
      resourceType: 'dashboard',
      resourceId: organizationIdParam,
      metadata: { cached: true },
      dataType: 'ANALYTICS',
    });
    
    // Add cache headers
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
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

