import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ProvincialPrivacyService } from "@/services/provincial-privacy-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Helper to check if user has security/admin role
 */
async function checkSecurityPermissions(userId: string, organizationId: string): Promise<boolean> {
  try {
    // Check for security officer or admin roles in any organization
    const member = await withRLSContext({ organizationId }, async (db) => {
      return await db.query.organizationMembers.findFirst({
        where: (organizationMembers, { eq, or }) =>
          or(
            eq(organizationMembers.userId, userId),
            // Check multiple roles if available
          ),
      });
    });

    // Allow admin and super_admin roles to access security functions
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check security permissions:', { error });
    return false;
  }
}


const privacyBreachSchema = z.object({
  breachType: z.unknown().optional(),
  severity: z.unknown().optional(),
  affectedProvince: z.unknown().optional(),
  affectedUserCount: z.number().int().positive(),
  dataTypes: z.unknown().optional(),
  breachDescription: z.string().optional(),
  discoveredAt: z.boolean().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check if user has admin/security role
      const hasPermission = await checkSecurityPermissions(userId, organizationId);
      if (!hasPermission) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - admin or security officer role required'
    );
      }

      const body = await request.json();
    // Validate request body
    const validation = privacyBreachSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { breachType, severity, affectedProvince, affectedUserCount, dataTypes, breachDescription, discoveredAt } = validation.data;
      const {
        breachType,
        severity,
        affectedProvince,
        affectedUserCount,
        dataTypes,
        breachDescription,
        discoveredAt,
      } = body;

      if (
        !breachType ||
        !severity ||
        !affectedUserCount ||
        !dataTypes ||
        !breachDescription ||
        !discoveredAt
      ) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields'
    );
      }

      const breach = await ProvincialPrivacyService.reportBreach({
        breachType,
        severity,
        affectedProvince,
        affectedUserCount: parseInt(affectedUserCount),
        dataTypes: Array.isArray(dataTypes) ? dataTypes : [dataTypes],
        breachDescription,
        discoveredAt: new Date(discoveredAt),
        reportedBy: userId,
      });

      logger.info('Privacy breach reported', { userId, breachType, severity });

      return NextResponse.json({
        success: true,
        breach,
        message: "Privacy breach reported successfully",
        notificationDeadline: breach.notificationDeadline,
      });
    } catch (error: any) {
      logger.error("Breach reporting error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to report breach" },
        { status: 500 }
      );
    }
    })(request);
};

export const GET = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check if user has admin/security role
      const hasPermission = await checkSecurityPermissions(userId, organizationId);
      if (!hasPermission) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - admin or security officer role required'
    );
      }

      const breaches = await ProvincialPrivacyService.getBreachesApproachingDeadline();

      logger.info('Retrieved overdue breaches', { userId, count: breaches.length });

      return NextResponse.json({ breaches, count: breaches.length });
    } catch (error: any) {
      logger.error("Breach retrieval error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to retrieve breaches" },
        { status: 500 }
      );
    }
    })(request);
};



