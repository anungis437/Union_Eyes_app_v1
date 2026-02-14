/**
 * Member Segment Single Record API Routes
 * 
 * Phase 1.3: Search & Segmentation
 * 
 * Endpoints:
 * - GET /api/admin/segments/[id] - Get segment by ID
 * - PUT /api/admin/segments/[id] - Update segment
 * - DELETE /api/admin/segments/[id] - Delete segment
 * 
 * @module app/api/admin/segments/[id]/route
 */

import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import {
  getSegmentById,
  updateSegment,
  deleteSegment,
} from "@/db/queries/member-segments-queries";
import {
  updateMemberSegmentSchema,
} from "@/lib/validation/member-segments-schemas";

/**
 * GET /api/admin/segments/[id]
 * Get segment by ID
 * 
 * Query params:
 * - organizationId: string (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");

      if (!organizationId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "organizationId is required"
        );
      }

      const segment = await getSegmentById(params.id, organizationId);

      if (!segment) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          "Segment not found"
        );
      }

      return standardSuccessResponse(segment);
    } catch (error) {
      logger.error("Failed to get segment", error as Error, { segmentId: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to get segment"
      );
    }
  });
}

/**
 * PUT /api/admin/segments/[id]
 * Update segment
 */
export async function PUT(
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
      const validationResult = updateMemberSegmentSchema.safeParse(body);

      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const updated = await updateSegment(params.id, validationResult.data);

      return standardSuccessResponse(updated);
    } catch (error) {
      logger.error("Failed to update segment", error as Error, { segmentId: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update segment"
      );
    }
  });
}

/**
 * DELETE /api/admin/segments/[id]
 * Delete segment (soft delete)
 */
export async function DELETE(
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

      await deleteSegment(params.id);

      return standardSuccessResponse({ success: true });
    } catch (error) {
      logger.error("Failed to delete segment", error as Error, { segmentId: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to delete segment"
      );
    }
  });
}
