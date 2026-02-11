/**
 * System Activity API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { getRecentActivity } from "@/actions/admin-actions";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizationUsers } from "@/db/schema/domains/member";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check admin role using RLS-protected query
      return withRLSContext(async (tx) => {
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "50");

        const activity = await getRecentActivity(tx, Math.min(limit, 100));

        return NextResponse.json({
          success: true,
          data: activity,
          count: activity.length,
        });
      });
    } catch (error) {
      logger.error("Failed to fetch activity", error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch activity',
      error
    );
    }
    })(request);
};

