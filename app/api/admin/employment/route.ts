/**
 * Member Employment API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - POST /api/admin/employment - Create employment record
 * - GET /api/admin/employment - List employment records with filters
 * 
 * @module app/api/admin/employment/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from "@/lib/api/standardized-responses";
import {
  createMemberEmployment,
  getEmploymentByOrganization,
} from "@/db/queries/member-employment-queries";
import { createMemberEmploymentSchema } from "@/lib/validation/member-employment-schemas";

/**
 * GET /api/admin/employment
 * List employment records with optional filters
 */
export async function GET(request: NextRequest) {
  return withApiAuth(async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const status = searchParams.get("status") || undefined;

      if (!organizationId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "organizationId is required"
        );
      }

      const employmentRecords = await getEmploymentByOrganization(
        organizationId,
        status
      );

      return standardSuccessResponse({
        records: employmentRecords,
        count: employmentRecords.length,
      });
    } catch (error) {
      logger.error("Failed to fetch employment records", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve employment records"
      );
    }
  });
}

/**
 * POST /api/admin/employment
 * Create a new employment record
 */
export async function POST(request: NextRequest) {
  return withApiAuth(async (user) => {
    try {
      const body = await request.json();

      // Validate request body
      const validationResult = createMemberEmploymentSchema.safeParse(body);
      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const employment = await createMemberEmployment(validationResult.data as any);

      return standardSuccessResponse(
        employment
      );
    } catch (error) {
      logger.error("Failed to create employment record", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : "Failed to create employment record"
      );
    }
  });
}
