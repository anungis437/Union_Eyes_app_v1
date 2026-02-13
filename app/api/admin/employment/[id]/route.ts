/**
 * Member Employment Single Record API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - GET /api/admin/employment/[id] - Get employment record by ID
 * - PUT /api/admin/employment/[id] - Update employment record
 * - DELETE /api/admin/employment/[id] - Delete employment record
 * 
 * @module app/api/admin/employment/[id]/route
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
  getMemberEmploymentById,
  updateMemberEmployment,
  deleteMemberEmployment,
} from "@/db/queries/member-employment-queries";
import { updateMemberEmploymentSchema } from "@/lib/validation/member-employment-schemas";

/**
 * GET /api/admin/employment/[id]
 * Retrieve a single employment record
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (user) => {
    try {
      const employment = await getMemberEmploymentById(params.id);

      if (!employment) {
        return standardErrorResponse(
          ErrorCode.NOT_FOUND,
          "Employment record not found"
        );
      }

      return standardSuccessResponse(employment);
    } catch (error) {
      logger.error("Failed to fetch employment record", error as Error, { id: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve employment record"
      );
    }
  });
}

/**
 * PUT /api/admin/employment/[id]
 * Update an employment record
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (user) => {
    try {
      const body = await request.json();

      // Validate request body
      const validationResult = updateMemberEmploymentSchema.safeParse({
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
      const updatedEmployment = await updateMemberEmployment(id, updateData as any);

      return standardSuccessResponse(updatedEmployment);
    } catch (error) {
      logger.error("Failed to update employment record", error as Error, { id: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : "Failed to update employment record"
      );
    }
  });
}

/**
 * DELETE /api/admin/employment/[id]
 * Delete an employment record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiAuth(async (user) => {
    try {
      await deleteMemberEmployment(params.id);

      return standardSuccessResponse({ success: true });
    } catch (error) {
      logger.error("Failed to delete employment record", error as Error, { id: params.id });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to delete employment record"
      );
    }
  });
}
