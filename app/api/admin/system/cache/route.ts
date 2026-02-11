/**
 * System Cache API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizationUsers } from "@/db/schema/domains/member";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting for system operations
      const rateLimitResult = await checkRateLimit(
        `system-ops:${userId}`,
        RATE_LIMITS.SYSTEM_OPERATIONS
      );

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

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

        // Revalidate all paths (Next.js cache)
        revalidatePath("/", "layout");

        logger.info("Cache cleared", { adminId: userId });

        return NextResponse.json({
          success: true,
          message: "Cache cleared successfully",
        }, {
          headers: createRateLimitHeaders(rateLimitResult),
        });
      });
    } catch (error) {
      logger.error("Failed to clear cache", error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to clear cache',
      error
    );
    }
    })(request);
};

