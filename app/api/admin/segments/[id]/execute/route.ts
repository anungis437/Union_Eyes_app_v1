/**
 * Execute Segment API Route
 * 
 * Phase 1.3: Search & Segmentation
 * 
 * Endpoints:
 * - POST /api/admin/segments/[id]/execute - Execute saved segment
 * 
 * @module app/api/admin/segments/[id]/execute/route
 */

import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import {
  executeSegment,
} from "@/db/queries/member-segments-queries";
import { z } from "zod";

const executeSchema = z.object({
  organizationId: z.string().uuid(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

/**
 * POST /api/admin/segments/[id]/execute
 * Execute a saved segment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (request: NextRequest) => {
    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        return standardErrorResponse(
          ErrorCode.UNAUTHORIZED,
          "Unauthorized - must be logged in"
        );
      }

      const body = await request.json();
      const validationResult = executeSchema.safeParse(body);

      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const { organizationId, page, limit } = validationResult.data;

      const result = await executeSegment(
        params.id,
        organizationId,
        user.id,
        { page, limit }
      );

      return standardSuccessResponse(result);
    } catch (error) {
      logger.error("Failed to execute segment", error as Error, { segmentId: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to execute segment"
      );
    }
  });
}
