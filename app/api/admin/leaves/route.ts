/**
 * Member Leaves API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - POST /api/admin/leaves - Create leave request
 * - GET /api/admin/leaves - List leave records with filters
 * 
 * @module app/api/admin/leaves/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import {
  createMemberLeave,
  getAllMemberLeaves,
  getActiveMemberLeaves,
} from "@/db/queries/member-employment-queries";
import { createMemberLeaveSchema } from "@/lib/validation/member-employment-schemas";

/**
 * GET /api/admin/leaves
 * List leave records
 * Query params:
 * - memberId: string (required)
 * - activeOnly: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  return withApiAuth(async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get("memberId");
      const activeOnly = searchParams.get("activeOnly") === "true";

      if (!memberId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "memberId is required"
        );
      }

      const leaveRecords = activeOnly
        ? await getActiveMemberLeaves(memberId)
        : await getAllMemberLeaves(memberId);

      return standardSuccessResponse({
        leaves: leaveRecords,
        count: leaveRecords.length,
      });
    } catch (error) {
      logger.error("Failed to fetch leave records", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve leave records"
      );
    }
  });
}

/**
 * POST /api/admin/leaves
 * Create a new leave request
 */
export async function POST(request: NextRequest) {
  return withApiAuth(async (user) => {
    try {
      const body = await request.json();

      // Validate request body
      const validationResult = createMemberLeaveSchema.safeParse(body);
      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const leave = await createMemberLeave(validationResult.data);

      return standardSuccessResponse(leave);
    } catch (error) {
      logger.error("Failed to create leave request", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create leave request"
      );
    }
  });
}
