import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Clause Search API Route
 * POST /api/clauses/search - Search clauses across CBAs
 */

import { NextRequest, NextResponse } from "next/server";
import { searchClauses } from "@/lib/services/clause-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const clauseSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  filters: z.record(z.string(), z.unknown()).default({}),
  limit: z.number().int().min(1).max(100).default(50),
});
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      
      // Validate request body
      const validation = clauseSearchSchema.safeParse(body);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid search request',
          validation.error.errors
        );
      }

      const { query, filters, limit } = validation.data;

      const results = await searchClauses(query, filters, limit);

      return NextResponse.json({ 
        clauses: results,
        count: results.length
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

