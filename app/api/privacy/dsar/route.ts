import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ProvincialPrivacyService, type Province } from "@/services/provincial-privacy-service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * Helper to check if user has admin/privacy officer role
 */
async function checkPrivacyPermissions(userId: string, organizationId: string): Promise<boolean> {
  try {
    // Check for admin roles that can manage privacy requests
    const member = await withRLSContext({ organizationId }, async (db) => {
      return await db.query.organizationMembers.findFirst({
        where: (organizationMembers, { eq }) =>
          eq(organizationMembers.userId, userId),
      });
    });

    // Allow admin and super_admin roles to access privacy officer functions
    return member ? ['admin', 'super_admin'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check privacy permissions:', { error });
    return false;
  }
}


const privacyDsarSchema = z.object({
  requestType: z.unknown().optional(),
  province: z.unknown().optional(),
  requestDescription: z.string().optional(),
  requestedDataTypes: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = privacyDsarSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { requestType, province, requestDescription, requestedDataTypes } = validation.data;
      const { requestType, province, requestDescription, requestedDataTypes } = body;

      if (!requestType || !province) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields'
    );
      }

      const validTypes = ["access", "rectification", "erasure", "portability", "restriction"];
      if (!validTypes.includes(requestType)) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request type'
    );
      }

      const dsar = await ProvincialPrivacyService.createDSAR({
        userId,
        requestType,
        province: province as Province,
        requestDescription,
        requestedDataTypes,
      });

      logger.info('DSAR created', { userId, requestType, province });

      return NextResponse.json({
        success: true,
        dsar,
        message: "Data subject access request created successfully",
        responseDeadline: dsar.responseDeadline,
      });
    } catch (error: Record<string, unknown>) {
      logger.error("DSAR creation error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to create DSAR" },
        { status: 500 }
      );
    }
    })(request);
};

export const GET = async (request: NextRequest) => {
  return withRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Check if user has admin/privacy officer role
      const hasPermission = await checkPrivacyPermissions(userId, organizationId);
      if (!hasPermission) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden - admin or privacy officer role required'
    );
      }

      const dsars = await ProvincialPrivacyService.getOverdueDSARs();

      logger.info('Retrieved overdue DSARs', { userId, count: dsars.length });

      return NextResponse.json({ dsars, count: dsars.length });
    } catch (error: Record<string, unknown>) {
      logger.error("DSAR retrieval error:", { error });
      return NextResponse.json(
        { error: error.message || "Failed to retrieve DSARs" },
        { status: 500 }
      );
    }
    })(request);
};



