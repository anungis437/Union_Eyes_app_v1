import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Precedents API Routes - Main endpoints for arbitration decisions
 * GET /api/precedents - List precedents with filtering
 * POST /api/precedents - Create a new precedent
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  listPrecedents, 
  createPrecedent,
  getPrecedentStatistics,
  getMostCitedPrecedents,
  getPrecedentsByIssueType
} from "@/lib/services/precedent-service";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      
      // Check for special modes
      const statistics = searchParams.get("statistics") === "true";
      const mostCited = searchParams.get("mostCited") === "true";
      const issueType = searchParams.get("issueType");

      // Return statistics
      if (statistics) {
        const stats = await getPrecedentStatistics();
        return NextResponse.json(stats);
      }

      // Return most cited
      if (mostCited) {
        const limit = parseInt(searchParams.get("limit") || "10");
        const precedents = await getMostCitedPrecedents(limit);
        return NextResponse.json({ precedents });
      }

      // Return by issue type
      if (issueType) {
        const limit = parseInt(searchParams.get("limit") || "20");
        const precedents = await getPrecedentsByIssueType(issueType, limit);
        return NextResponse.json({ precedents, count: precedents.length });
      }

      // Build filters
      const filters: any = {};
      
      const tribunal = searchParams.get("tribunal");
      if (tribunal) {
        filters.tribunal = tribunal.split(",");
      }

      const decisionType = searchParams.get("decisionType");
      if (decisionType) {
        filters.decisionType = decisionType.split(",");
      }

      const outcome = searchParams.get("outcome");
      if (outcome) {
        filters.outcome = outcome.split(",");
      }

      const precedentValue = searchParams.get("precedentValue");
      if (precedentValue) {
        filters.precedentValue = precedentValue.split(",");
      }

      const arbitrator = searchParams.get("arbitrator");
      if (arbitrator) {
        filters.arbitrator = arbitrator;
      }

      const union = searchParams.get("union");
      if (union) {
        filters.union = union;
      }

      const employer = searchParams.get("employer");
      if (employer) {
        filters.employer = employer;
      }

      const jurisdiction = searchParams.get("jurisdiction");
      if (jurisdiction) {
        filters.jurisdiction = jurisdiction;
      }

      const sector = searchParams.get("sector");
      if (sector) {
        filters.sector = sector;
      }

      const searchQuery = searchParams.get("searchQuery");
      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      // Date filters
      const dateFrom = searchParams.get("dateFrom");
      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom);
      }

      const dateTo = searchParams.get("dateTo");
      if (dateTo) {
        filters.dateTo = new Date(dateTo);
      }

      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const sortBy = searchParams.get("sortBy") || "decisionDate";
      const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

      const result = await listPrecedents(filters, { page, limit, sortBy, sortOrder });

      return NextResponse.json(result);
    } catch (error) {
return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();

      // Validate required fields
      if (!body.caseNumber) {
        return NextResponse.json(
          { error: "caseNumber is required" },
          { status: 400 }
        );
      }

      if (!body.caseTitle) {
        return NextResponse.json(
          { error: "caseTitle is required" },
          { status: 400 }
        );
      }

      if (!body.tribunal) {
        return NextResponse.json(
          { error: "tribunal is required" },
          { status: 400 }
        );
      }

      if (!body.decisionType) {
        return NextResponse.json(
          { error: "decisionType is required" },
          { status: 400 }
        );
      }

      if (!body.decisionDate) {
        return NextResponse.json(
          { error: "decisionDate is required" },
          { status: 400 }
        );
      }

      if (!body.arbitrator) {
        return NextResponse.json(
          { error: "arbitrator is required" },
          { status: 400 }
        );
      }

      if (!body.union) {
        return NextResponse.json(
          { error: "union is required" },
          { status: 400 }
        );
      }

      if (!body.employer) {
        return NextResponse.json(
          { error: "employer is required" },
          { status: 400 }
        );
      }

      if (!body.outcome) {
        return NextResponse.json(
          { error: "outcome is required" },
          { status: 400 }
        );
      }

      if (!body.precedentValue) {
        return NextResponse.json(
          { error: "precedentValue is required" },
          { status: 400 }
        );
      }

      if (!body.fullText) {
        return NextResponse.json(
          { error: "fullText is required" },
          { status: 400 }
        );
      }

      // Create precedent
      const precedent = await createPrecedent(body);

      return NextResponse.json({ precedent }, { status: 201 });
    } catch (error) {
// Handle unique constraint violations
      if ((error as any)?.code === "23505") {
        return NextResponse.json(
          { error: "Case number already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};

