/**
 * Member Segments API Routes
 * 
 * Phase 1.3: Search & Segmentation
 * 
 * Endpoints:
 * - POST /api/admin/segments - Create new segment
 * - GET /api/admin/segments - List segments
 * 
 * @module app/api/admin/segments/route
 */

import { NextRequest } from "next/server";
import { withApiAuth, getCurrentUser } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from "@/lib/api/standardized-responses";
import {
  createSegment,
  getSegments,
} from "@/db/queries/member-segments-queries";
import {
  createMemberSegmentSchema,
} from "@/lib/validation/member-segments-schemas";

/**
 * POST /api/admin/segments
 * Create a new member segment
 */
export async function POST(request: NextRequest) {
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
      const validationResult = createMemberSegmentSchema.safeParse(body);

      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const data = validationResult.data;
      const segment = await createSegment({
        ...data,
        createdBy: user.id,
      });

      return standardSuccessResponse(segment);
    } catch (error) {
      logger.error("Failed to create segment", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create segment"
      );
    }
  });
}

/**
 * GET /api/admin/segments
 * List segments for an organization
 * 
 * Query params:
 * - organizationId: string (required)
 * - includePrivate: boolean (optional, default: false)
 */
export async function GET(request: NextRequest) {
  return withApiAuth(async (request: NextRequest) => {
    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        return standardErrorResponse(
          ErrorCode.UNAUTHORIZED,
          "Unauthorized - must be logged in"
        );
      }

      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const includePrivate = searchParams.get("includePrivate") === "true";

      if (!organizationId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "organizationId is required"
        );
      }

      const segments = await getSegments(
        organizationId,
        includePrivate ? user.id : undefined
      );

      return standardSuccessResponse(segments);
    } catch (error) {
      logger.error("Failed to get segments", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to get segments"
      );
    }
  });
}
