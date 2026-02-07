import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Workbench API - Assign claim to user
 * 
 * POST /api/workbench/assign
 * Assigns a claim to the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { assignClaim } from "@/db/queries/claims-queries";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

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
      const updatedClaim = await assignClaim(claimId, user.id, user.id);

      return NextResponse.json({
        success: true,
        claim: updatedClaim,
        message: "Claim assigned successfully"
      });

    } catch (error) {
      console.error("Error assigning claim:", error);
      return NextResponse.json(
        { error: "Failed to assign claim" },
        { status: 500 }
      );
    }
  })
  })(request);
};
