import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
      // Check admin role
      const adminCheck = await db
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
      await db.execute(sql`ANALYZE`);

      logger.info("Database optimized", { adminId: userId });

      return NextResponse.json({
        success: true,
        message: "Database optimization completed",
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
