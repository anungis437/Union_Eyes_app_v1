import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest) => {
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

      // Revalidate all paths (Next.js cache)
      revalidatePath("/", "layout");

      logger.info("Cache cleared", { adminId: user.id });

      return NextResponse.json({
        success: true,
        message: "Cache cleared successfully",
      });
    } catch (error) {
      logger.error("Failed to clear cache", error);
      return NextResponse.json(
        { error: "Failed to clear cache" },
        { status: 500 }
      );
    }
  })
  })(request);
};
