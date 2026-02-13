/**
 * Member Employment by Member API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - GET /api/admin/employment/member/[memberId] - Get all employment records for a member
 * 
 * @module app/api/admin/employment/member/[memberId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from "@/lib/api/standardized-responses";
import {
  getAllMemberEmployment,
  getActiveMemberEmployment,
} from "@/db/queries/member-employment-queries";

/**
 * GET /api/admin/employment/member/[memberId]
 * Get employment records for a specific member
 * Query params:
 * - activeOnly: boolean (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  return withApiAuth(async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const activeOnly = searchParams.get("activeOnly") === "true";

      const employmentRecords = activeOnly
        ? [await getActiveMemberEmployment(params.memberId)].filter(Boolean)
        : await getAllMemberEmployment(params.memberId);

      return standardSuccessResponse({
        records: employmentRecords,
        count: employmentRecords.length,
      });
    } catch (error) {
      logger.error("Failed to fetch member employment", error as Error, { memberId: params.memberId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve employment records"
      );
    }
  });
}
