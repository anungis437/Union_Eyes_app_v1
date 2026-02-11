import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Clause Search API Route
 * POST /api/clauses/search - Search clauses across CBAs
 */

import { NextRequest, NextResponse } from "next/server";
import { searchClauses } from "@/lib/services/clause-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const body = await request.json();
      const { query, filters = {}, limit = 50 } = body;

      if (!query) {
        return NextResponse.json(
          { error: "query is required" },
          { status: 400 }
        );
      }

      const results = await searchClauses(query, filters, limit);

      return NextResponse.json({ 
        clauses: results,
        count: results.length
      });
    } catch (error) {
return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};

