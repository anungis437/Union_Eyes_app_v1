import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Precedent API Routes - Individual precedent operations
 * GET /api/precedents/[id] - Get precedent by ID
 * PATCH /api/precedents/[id] - Update precedent
 * DELETE /api/precedents/[id] - Delete precedent
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getPrecedentById, 
  updatePrecedent, 
  deletePrecedent,
  getRelatedPrecedents
} from "@/lib/services/precedent-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { id } = params;
      const { searchParams } = new URL(request.url);

      const includeFullText = searchParams.get("includeFullText") !== "false"; // Default true
      const includeRelated = searchParams.get("includeRelated") === "true";

      // Fetch precedent
      const precedent = await getPrecedentById(id, { 
        includeFullText,
        includeSummary: true
      });

      if (!precedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      const response: any = { precedent };

      // Optionally fetch related precedents
      if (includeRelated) {
        const related = await getRelatedPrecedents(id);
        response.relatedPrecedents = related;
      }

      return NextResponse.json(response);
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { id } = params;
      const body = await request.json();

      // Update precedent
      const updatedPrecedent = await updatePrecedent(id, body);

      if (!updatedPrecedent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      return NextResponse.json({ precedent: updatedPrecedent });
    } catch (error) {
// Handle unique constraint violations
      if ((error as any)?.code === "23505") {
        return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Case number already exists',
      error
    );
      }

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { id } = params;

      const success = await deletePrecedent(id);
      
      if (!success) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Precedent not found'
    );
      }

      return NextResponse.json({ 
        message: "Precedent deleted successfully",
        deleted: true 
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};
