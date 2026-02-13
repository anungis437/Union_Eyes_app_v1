/**
 * Members Export API Route
 * 
 * Phase 1.3: Search & Segmentation
 * 
 * Endpoints:
 * - POST /api/admin/members/export - Export members data with watermarking
 * 
 * @module app/api/admin/members/export/route
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
  searchMembersAdvanced,
  executeSegment,
  logSegmentExport,
  generateExportWatermark,
  generateExportHash,
} from "@/db/queries/member-segments-queries";
import {
  exportMembersSchema,
} from "@/lib/validation/member-segments-schemas";

/**
 * POST /api/admin/members/export
 * Export members data with watermarking and audit logging
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
      const validationResult = exportMembersSchema.safeParse(body);

      if (!validationResult.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validationResult.error.message
        );
      }

      const {
        organizationId,
        segmentId,
        filters,
        format,
        includeFields,
        purpose,
        includeWatermark,
      } = validationResult.data;

      // Get members data
      let members: any[];
      let totalCount: number;

      if (segmentId) {
        // Execute segment
        const result = await executeSegment(segmentId, organizationId, user.id, { limit: 10000 });
        members = result.members;
        totalCount = result.total;
      } else if (filters) {
        // Execute ad-hoc search
        const result = await searchMembersAdvanced(organizationId, filters, { limit: 10000 });
        members = result.members;
        totalCount = result.total;
      } else {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Must provide either segmentId or filters"
        );
      }

      // Generate watermark
      let watermark: string | undefined;
      if (includeWatermark) {
        watermark = generateExportWatermark(
          user.id,
          user.email || "Unknown User",
          "Organization" // TODO: Get actual org name
        );
      }

      // Generate export hash
      const exportHash = generateExportHash(JSON.stringify(members));

      // Log export
      const exportLog = await logSegmentExport({
        organizationId,
        segmentId: segmentId || undefined,
        exportedBy: user.id,
        format,
        includeFields,
        memberCount: totalCount,
        filtersUsed: filters || undefined,
        watermark,
        exportHash,
        purpose,
      });

      // Filter members to only include requested fields
      const filteredMembers = members.map((member) => {
        const filtered: any = {};
        includeFields.forEach((field) => {
          if (member[field] !== undefined) {
            filtered[field] = member[field];
          }
        });
        return filtered;
      });

      // Return export data
      return standardSuccessResponse({
        exportId: exportLog.id,
        members: filteredMembers,
        total: totalCount,
        watermark,
        exportedAt: exportLog.exportedAt,
      });
    } catch (error) {
      logger.error("Failed to export members", error as Error);
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to export members"
      );
    }
  });
}
