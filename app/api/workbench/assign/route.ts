import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { logger } from '@/lib/logger';
/**
 * Workbench API - Assign claim to user
 * 
 * POST /api/workbench/assign
 * Assigns a claim to the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { assignClaim } from "@/db/queries/claims-queries";
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const workbenchAssignSchema = z.object({
  claimId: z.string().uuid('Invalid claimId'),
});

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Parse request body
      const body = await request.json();
      
      // Validate request body
      const validation = workbenchAssignSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validation.error.errors[0]?.message || "Invalid request data"
        );
      }
      
      const { claimId } = validation.data;

      // Assign claim to current user
      const updatedClaim = await assignClaim(claimId, userId, userId);

      return NextResponse.json({
        success: true,
        claim: updatedClaim,
        message: "Claim assigned successfully"
      });

    } catch (error) {
      logger.error('Error assigning claim', error as Error, { claimId: body?.claimId });
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to assign claim',
      error
    );
    }
    })(request);
};

