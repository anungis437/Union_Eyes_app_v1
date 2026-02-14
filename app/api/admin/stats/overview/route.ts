/**
 * System Stats Overview API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { getSystemStats, getRecentActivity } from "@/actions/admin-actions";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizationUsers } from "@/db/schema/domains/member";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
  try {
      // Check admin role using RLS-protected query
      return withRLSContext(async (tx) => {
        const adminCheck = await tx
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(eq(organizationUsers.userId, context.userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        const stats = await getSystemStats(tx);

        return NextResponse.json({
          success: true,
          data: stats,
        });
      });
    } catch (error) {
      logger.error("Failed to fetch system stats", error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch statistics',
      error
    );
    }
    })(request);
};

