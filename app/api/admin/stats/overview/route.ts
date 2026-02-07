import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { getSystemStats, getRecentActivity } from "@/actions/admin-actions";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Check admin role
      const adminCheck = await db
        .select({ role: tenantUsers.role })
        .from(tenantUsers)
        .where(eq(tenantUsers.user.id, user.id))
        .limit(1);

      if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      const stats = await getSystemStats();

      return NextResponse.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to fetch system stats", error);
      return NextResponse.json(
        { error: "Failed to fetch statistics" },
        { status: 500 }
      );
    }
  })
  })(request);
};
