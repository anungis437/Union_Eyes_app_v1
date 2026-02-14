import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * API Route: GET /api/activities
 * 
 * Get recent activity feed for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizationMembers } from '@/db/schema';
import { and, desc, or, isNull } from 'drizzle-orm';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { getCurrentUser } from '@/lib/api-auth-guard';

export const GET = withEnhancedRoleAuth(10, async (request: NextRequest, context) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return standardErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const organizationId = searchParams.get('organizationId');
      const limit = parseInt(searchParams.get('limit') || '10');

      if (!organizationId) {
        return standardErrorResponse(
          ErrorCode.MISSING_REQUIRED_FIELD,
          'organizationId parameter is required'
        );
      }
// Get recent member additions (simplified approach for now)
      const recentMembers = await db
        .select({
          id: organizationMembers.id,
          type: sql<string>`'member_joined'`,
          claimNumber: sql<string>`NULL`,
          title: sql<string>`NULL`,
          status: sql<string>`NULL`,
          priority: sql<string>`NULL`,
          createdBy: organizationMembers.userId,
          createdAt: organizationMembers.createdAt,
          description: sql<string>`'Member joined the organization'`,
          email: organizationMembers.email,
        })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            or(
              isNull(organizationMembers.deletedAt),
              sql`${organizationMembers.deletedAt} IS NULL`
            )
          )
        )
        .orderBy(desc(organizationMembers.createdAt))
        .limit(limit);

      // Map to activity format
      const activities = recentMembers.map(a => ({
        id: a.id,
        type: 'member_joined',
        claimNumber: null,
        title: null,
        status: null,
        priority: null,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        description: `New member: ${a.email || 'Unknown'}`,
        icon: 'user',
        color: 'purple',
      }));
return standardSuccessResponse({
        activities: activities,
        count: activities.length,
      });
    } catch (error) {
return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch activities',
        error
      );
    }
});

