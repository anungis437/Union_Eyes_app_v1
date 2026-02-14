/**
 * Job Classifications API Routes
 * 
 * Phase 1.2: Member Profile v2 - Employment Attributes
 * 
 * Endpoints:
 * - POST /api/admin/job-classifications - Create job classification
 * - GET /api/admin/job-classifications - List job classifications
 * 
 * @module app/api/admin/job-classifications/route
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api-auth-guard";
import { logger } from "@/lib/logger";
import { standardSuccessResponse,
} from "@/lib/api/standardized-responses";
import {
  createJobClassification,
  getJobClassificationsByOrganization,
} from "@/db/queries/member-employment-queries";
import { createJobClassificationSchema } from "@/lib/validation/member-employment-schemas";

/**
 * GET /api/admin/job-classifications
 * List job classifications
 * Query params:
 * - organizationId: string (required)
 * - activeOnly: boolean (default: true)
 */
export async function GET(request: NextRequest) {
  return withApiAuth(async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get("organizationId");
      const activeOnly = searchParams.get("activeOnly") !== "false";

      if (!organizationId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "organizationId is required"
        );
      }

      const classifications = await getJobClassificationsByOrganization(
        organizationId,
        activeOnly
      );

      return standardSuccessResponse({
        classifications,
        count: classifications.length,
      });
    } catch (error) {
      logger.error("Failed to fetch job classifications", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve job classifications"
      );
    }
  });
}

/**
 * POST /api/admin/job-classifications
 * Create a new job classification
 */
export async function POST(request: NextRequest) {
  return withApiAuth(async (user) => {
    try {
      const body = await request.json();

      // Validate request body
      const validationResult = createJobClassificationSchema.safeParse(body);
      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const classification = await createJobClassification(validationResult.data as any);

      return standardSuccessResponse(classification);
    } catch (error) {
      logger.error("Failed to create job classification", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create job classification"
      );
    }
  });
}
