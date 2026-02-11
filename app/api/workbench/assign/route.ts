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
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Verify authentication
      // Parse request body
      const body = await request.json();
      const { claimId } = body;

      if (!claimId) {
        return NextResponse.json(
          { error: "claimId is required" },
          { status: 400 }
        );
      }

      // Assign claim to current user
      const updatedClaim = await assignClaim(claimId, userId, userId);

      return NextResponse.json({
        success: true,
        claim: updatedClaim,
        message: "Claim assigned successfully"
      });

    } catch (error) {
      logger.error('Error assigning claim', error as Error, { claimId: body?.claimId });
      return NextResponse.json(
        { error: "Failed to assign claim" },
        { status: 500 }
      );
    }
    })(request);
};

