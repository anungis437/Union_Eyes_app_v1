import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Clauses API Routes - Main endpoints for CBA clauses
 * GET /api/clauses - List clauses with filtering
 * POST /api/clauses - Create a new clause
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  listClauses, 
  createClause,
  bulkCreateClauses,
  searchClauses,
  getClausesByType,
  getClauseTypeDistribution
} from "@/lib/services/clause-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { searchParams } = new URL(request.url);
      
      // Check for special modes
      const byType = searchParams.get("byType");
      const distribution = searchParams.get("distribution") === "true";
      const cbaId = searchParams.get("cbaId");

      // Return clause type distribution
      if (distribution && cbaId) {
        const dist = await getClauseTypeDistribution(cbaId);
        return NextResponse.json({ distribution: dist });
      }

      // Return clauses by type
      if (byType) {
        const limit = parseInt(searchParams.get("limit") || "100");
        const clauses = await getClausesByType(byType, { limit });
        return NextResponse.json({ clauses });
      }

      // Build filters
      const filters = {};
      
      if (cbaId) {
        filters.cbaId = cbaId;
      }

      const clauseType = searchParams.get("clauseType");
      if (clauseType) {
        filters.clauseType = clauseType.split(",");
      }

      const articleNumber = searchParams.get("articleNumber");
      if (articleNumber) {
        filters.articleNumber = articleNumber;
      }

      const confidenceMin = searchParams.get("confidenceMin");
      if (confidenceMin) {
        filters.confidenceMin = parseFloat(confidenceMin);
      }

      const searchQuery = searchParams.get("searchQuery");
      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      const pageNumber = searchParams.get("pageNumber");
      if (pageNumber) {
        filters.pageNumber = parseInt(pageNumber);
      }

      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");

      const result = await listClauses(filters, { page, limit });

      return NextResponse.json(result);
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};


const clausesSchema = z.object({
  cbaId: z.string().uuid('Invalid cbaId'),
  clauseNumber: z.unknown().optional(),
  clauseType: z.unknown().optional(),
  title: z.string().min(1, 'title is required'),
  content: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
    // Validate request body
    const validation = clausesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { cbaId, clauseNumber, clauseType, title, content } = validation.data;

      // Check if bulk create
      if (Array.isArray(body)) {
        // Validate all required fields
        for (const clause of body) {
          if (!clause.cbaId || !clause.clauseNumber || !clause.clauseType || !clause.title || !clause.content) {
            return NextResponse.json(
              { error: "All clauses must have cbaId, clauseNumber, clauseType, title, and content" },
              { status: 400 }
            );
          }
        }

        const clauses = await bulkCreateClauses(body);
        return standardSuccessResponse(
      {  clauses, count: clauses.length  },
      undefined,
      201
    );
      }

      // Single clause creation
      // Validate required fields
      if (!body.cbaId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'cbaId is required'
    );
      }

      if (!body.clauseNumber) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'clauseNumber is required'
    );
      }

      if (!body.clauseType) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'clauseType is required'
    );
      }

      if (!body.title) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'title is required'
    );
      }

      if (!body.content) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'content is required'
    );
      }

      // Create clause
      const clause = await createClause(body);

      return standardSuccessResponse(
      {  clause  },
      undefined,
      201
    );
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

