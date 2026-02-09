import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Precedent Search API Route
 * POST /api/precedents/search - Search precedents
 */

import { NextRequest, NextResponse } from "next/server";
import { searchPrecedents } from "@/lib/services/precedent-service";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
      const { query, filters = {}, limit = 50 } = body;

      if (!query) {
        return NextResponse.json(
          { error: "query is required" },
          { status: 400 }
        );
      }

      const results = await searchPrecedents(query, filters, limit);

      return NextResponse.json({ 
        precedents: results,
        count: results.length
      });
    } catch (error) {
      console.error("Error searching precedents:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};
