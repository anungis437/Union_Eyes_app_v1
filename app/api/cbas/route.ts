import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * CBA API Routes - Main endpoints for collective bargaining agreements
 * GET /api/cbas - List CBAs with filtering and pagination
 * POST /api/cbas - Create a new CBA
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  listCBAs, 
  createCBA, 
  getCBAStatistics,
  getCBAsExpiringSoon 
} from "@/lib/services/cba-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      
      // Check for special modes
      const expiringSoon = searchParams.get("expiringSoon") === "true";
      const statistics = searchParams.get("statistics") === "true";
      const organizationId = searchParams.get("organizationId");
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Return expiring CBAs
      if (expiringSoon) {
        const daysAhead = parseInt(searchParams.get("daysAhead") || "90");
        const cbas = await getCBAsExpiringSoon(daysAhead, organizationId || undefined);
        return NextResponse.json({ cbas });
      }

      // Return statistics
      if (statistics && organizationId) {
        const stats = await getCBAStatistics(organizationId);
        return NextResponse.json(stats);
      }

      // Build filters
      const filters: any = {};
      
      if (organizationId) {
        filters.organizationId = organizationId;
      }

      const status = searchParams.get("status");
      if (status) {
        filters.status = status.split(",");
      }

      const jurisdiction = searchParams.get("jurisdiction");
      if (jurisdiction) {
        filters.jurisdiction = jurisdiction.split(",");
      }

      const sector = searchParams.get("sector");
      if (sector) {
        filters.sector = sector;
      }

      const employerName = searchParams.get("employerName");
      if (employerName) {
        filters.employerName = employerName;
      }

      const unionName = searchParams.get("unionName");
      if (unionName) {
        filters.unionName = unionName;
      }

      const searchQuery = searchParams.get("searchQuery");
      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      const isPublic = searchParams.get("isPublic");
      if (isPublic) {
        filters.isPublic = isPublic === "true";
      }

      // Date filters
      const effectiveDateFrom = searchParams.get("effectiveDateFrom");
      if (effectiveDateFrom) {
        filters.effectiveDateFrom = new Date(effectiveDateFrom);
      }

      const effectiveDateTo = searchParams.get("effectiveDateTo");
      if (effectiveDateTo) {
        filters.effectiveDateTo = new Date(effectiveDateTo);
      }

      const expiryDateFrom = searchParams.get("expiryDateFrom");
      if (expiryDateFrom) {
        filters.expiryDateFrom = new Date(expiryDateFrom);
      }

      const expiryDateTo = searchParams.get("expiryDateTo");
      if (expiryDateTo) {
        filters.expiryDateTo = new Date(expiryDateTo);
      }

      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const sortBy = searchParams.get("sortBy") || "effectiveDate";
      const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

      const result = await listCBAs(filters, { page, limit, sortBy, sortOrder });

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error listing CBAs:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();

      // Validate required fields
      if (!body.organizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 }
        );
      }

      if (!body.cbaNumber) {
        return NextResponse.json(
          { error: "cbaNumber is required" },
          { status: 400 }
        );
      }

      if (!body.title) {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 }
        );
      }

      if (!body.jurisdiction) {
        return NextResponse.json(
          { error: "jurisdiction is required" },
          { status: 400 }
        );
      }

      if (!body.employerName) {
        return NextResponse.json(
          { error: "employerName is required" },
          { status: 400 }
        );
      }

      if (!body.unionName) {
        return NextResponse.json(
          { error: "unionName is required" },
          { status: 400 }
        );
      }

      if (!body.effectiveDate) {
        return NextResponse.json(
          { error: "effectiveDate is required" },
          { status: 400 }
        );
      }

      if (!body.expiryDate) {
        return NextResponse.json(
          { error: "expiryDate is required" },
          { status: 400 }
        );
      }

      if (!body.industrySector) {
        return NextResponse.json(
          { error: "industrySector is required" },
          { status: 400 }
        );
      }

      // Create CBA
      const cba = await createCBA({
        ...body,
        createdBy: userId,
        lastModifiedBy: userId,
      });

      return NextResponse.json({ cba }, { status: 201 });
    } catch (error) {
      console.error("Error creating CBA:", error);
      
      // Handle unique constraint violations
      if ((error as any)?.code === "23505") {
        return NextResponse.json(
          { error: "CBA number already exists" },
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
