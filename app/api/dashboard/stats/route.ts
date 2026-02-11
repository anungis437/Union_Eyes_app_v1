/**
 * Dashboard Statistics API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - Database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { getClaimStatistics } from "@/db/queries/claims-queries";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { sql } from "drizzle-orm";
import { unstable_cache } from 'next/cache';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/request-validation';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// Cache dashboard stats for 60 seconds per tenant
const getCachedDashboardStats = unstable_cache(
  async (tenantId: string) => {
    const statistics = await getClaimStatistics(tenantId);
    
    // Get member count using RLS-protected query
    const memberCount = await withRLSContext(async (tx) => {
      const memberCountResult = await tx.execute(sql`
        SELECT COUNT(*) as count
        FROM organization_members
        WHERE organization_id = ${tenantId}
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
 * GET /api/dashboard/stats?tenantId=<uuid>
 * Fetch dashboard statistics for the specified tenant
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
    // Prefer query parameter over middleware tenantId (to avoid cookie timing issues)
    const { searchParams } = new URL(request.url);
    const queryTenantId = (searchParams.get('organizationId') ?? searchParams.get('tenantId'));
    const tenantId = queryTenantId || context.organizationId;
// Use cached stats
    const response = await getCachedDashboardStats(tenantId);
// Log audit event
    await logApiAuditEvent({
      userId,
      organizationId,
      action: 'dashboard_stats_fetch',
      resourceType: 'dashboard',
      resourceId: tenantId,
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

