/**
 * Database Optimize API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Check admin role
        const adminCheck = await tx
          .select({ role: tenantUsers.role })
          .from(tenantUsers)
          .where(eq(tenantUsers.userId, userId))
          .limit(1);

        if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          );
        }

        // Run VACUUM ANALYZE (requires special connection settings)
        // Note: Full VACUUM requires superuser privileges
        await tx.execute(sql`ANALYZE`);

        logger.info("Database optimized", { adminId: userId });

        return NextResponse.json({
          success: true,
          message: "Database optimization completed",
        });
      });
    } catch (error) {
      logger.error("Failed to optimize database", error);
      return NextResponse.json(
        { 
          error: "Failed to optimize database",
          message: "ANALYZE completed, but VACUUM may require database administrator privileges" 
        },
        { status: 500 }
      );
    }
    })(request);
};
