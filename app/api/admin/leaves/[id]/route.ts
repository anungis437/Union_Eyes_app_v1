/**
 * Member Leave Single Record API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - PUT /api/admin/leaves/[id] - Update leave record
 * - PUT /api/admin/leaves/[id]?action=approve - Approve leave request
 * 
 * @module app/api/admin/leaves/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import { updateMemberLeave } from "@/db/queries/member-employment-queries";
import { updateMemberLeaveSchema } from "@/lib/validation/member-employment-schemas";

/**
 * PUT /api/admin/leaves/[id]
 * Update a leave record or approve a leave request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (request: NextRequest) => {
    try {
      const user = await getCurrentUser();
      const { searchParams } = new URL(request.url);
      const action = searchParams.get("action");
      const body = await request.json();

      // Handle approval action
      if (action === "approve") {
        const updatedLeave = await updateMemberLeave(params.id, {
          isApproved: true,
          approvedBy: user?.id || null,
          approvedAt: new Date(),
        });

        return standardSuccessResponse(updatedLeave);
      }

      // Regular update
      const validationResult = updateMemberLeaveSchema.safeParse({
        ...body,
        id: params.id,
      });

      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const { id, ...updateData } = validationResult.data;
      const updatedLeave = await updateMemberLeave(id, updateData);

      return standardSuccessResponse(updatedLeave);
    } catch (error) {
      logger.error("Failed to update leave record", error as Error, { leaveId: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update leave record"
      );
    }
  });
}
