/**
 * Job Classification Single Record API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - PUT /api/admin/job-classifications/[id] - Update job classification
 * 
 * @module app/api/admin/job-classifications/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from "@/lib/api/standardized-responses";
import { updateJobClassification } from "@/db/queries/member-employment-queries";
import { updateJobClassificationSchema } from "@/lib/validation/member-employment-schemas";

/**
 * PUT /api/admin/job-classifications/[id]
 * Update a job classification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (user) => {
    try {
      const body = await request.json();

      // Validate request body
      const validationResult = updateJobClassificationSchema.safeParse({
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
      const updatedClassification = await updateJobClassification(id, updateData as any);

      return standardSuccessResponse(updatedClassification);
    } catch (error) {
      logger.error("Failed to update job classification", error as Error, { id: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to update job classification"
      );
    }
  });
}
