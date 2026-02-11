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
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { logger } from "@/lib/logger";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      
      // Check for special modes
      const expiringSoon = searchParams.get("expiringSoon") === "true";
      const statistics = searchParams.get("statistics") === "true";
      const organizationId = searchParams.get("organizationId");
  if (organizationId && organizationId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
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
      logger.error("Error listing CBAs", error as Error);
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};


const cbasSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  cbaNumber: z.unknown().optional(),
  title: z.string().min(1, 'title is required'),
  jurisdiction: z.boolean().optional(),
  employerName: z.string().min(1, 'employerName is required'),
  unionName: z.string().min(1, 'unionName is required'),
  effectiveDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  industrySector: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = cbasSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, cbaNumber, title, jurisdiction, employerName, unionName, effectiveDate, expiryDate, industrySector } = validation.data;

      // Validate required fields
      if (!body.organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
      }

      if (!body.cbaNumber) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'cbaNumber is required'
    );
      }

      if (!body.title) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'title is required'
    );
      }

      if (!body.jurisdiction) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'jurisdiction is required'
    );
      }

      if (!body.employerName) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'employerName is required'
    );
      }

      if (!body.unionName) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'unionName is required'
    );
      }

      if (!body.effectiveDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'effectiveDate is required'
    );
      }

      if (!body.expiryDate) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'expiryDate is required'
    );
      }

      if (!body.industrySector) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'industrySector is required'
    );
      }

      // Create CBA
      const cba = await createCBA({
        ...body,
        createdBy: userId,
        lastModifiedBy: userId,
      });

      return standardSuccessResponse(
      {  cba  },
      undefined,
      201
    );
    } catch (error) {
      logger.error("Error creating CBA", error as Error);
      
      // Handle unique constraint violations
      if ((error as any)?.code === "23505") {
        return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'CBA number already exists',
      error
    );
      }

      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request);
};

