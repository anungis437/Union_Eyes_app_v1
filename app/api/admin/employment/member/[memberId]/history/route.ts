/**
 * Employment History API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - GET /api/admin/employment/member/[memberId]/history - Get employment history for a member
 * 
 * @module app/api/admin/employment/member/[memberId]/history/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import { getEmploymentHistoryByMember } from "@/db/queries/member-employment-queries";

/**
 * GET /api/admin/employment/member/[memberId]/history
 * Get employment history for a specific member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  return withApiAuth(async (user) => {
    try {
      const historyRecords = await getEmploymentHistoryByMember(params.memberId);

      return standardSuccessResponse(
        historyRecords,
        "Employment history retrieved successfully"
      );
    } catch (error) {
      logger.error("Failed to fetch employment history", error as Error, { memberId: params.memberId });
      return standardErrorResponse(
        "Failed to retrieve employment history",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }
  });
}
