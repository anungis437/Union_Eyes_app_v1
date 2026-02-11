/**
 * Health & Safety Hazards API Routes
 * 
 * Worker-reported hazards and unsafe condition management.
 * Allows anonymous reporting and risk assessment tracking.
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hazardReports } from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq, desc, and, or, like, sql, gte, lte } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limiter";
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

/**
 * Validation schema for creating hazard reports
 */
const createHazardSchema = z.object({
  hazardCategory: z.enum([
    'biological', 'chemical', 'ergonomic', 'physical', 'psychosocial',
    'safety', 'environmental', 'electrical', 'fire', 'confined_space',
    'working_at_heights', 'machinery', 'other'
  ]),
  hazardLevel: z.enum(['low', 'moderate', 'high', 'critical', 'extreme']),
  
  hazardDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format').optional(),
  
  // Location
  workplaceId: z.string().uuid().optional(),
  workplaceName: z.string().optional(),
  department: z.string().optional(),
  specificLocation: z.string().min(5, 'Specific location required'),
  
  // Reporter (can be anonymous)
  isAnonymous: z.boolean().optional().default(false),
  reporterContactInfo: z.string().optional(),
  
  // Hazard description
  hazardDescription: z.string().min(20, 'Description must be at least 20 characters'),
  whoIsAtRisk: z.string().optional(),
  potentialConsequences: z.string().optional(),
  existingControls: z.string().optional(),
  suggestedCorrections: z.string().optional(),
  
  // Risk assessment (optional, can be done later)
  likelihoodScore: z.number().int().min(1).max(5).optional(),
  severityScore: z.number().int().min(1).max(5).optional(),
  
  // Documents
  documentIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/health-safety/hazards
 * List and filter hazard reports
 * 
 * Query parameters:
 * - status: Filter by status
 * - hazardLevel: Filter by risk level
 * - hazardCategory: Filter by category
 * - fromDate: Filter from this date
 * - toDate: Filter to this date
 * - workplaceId: Filter by workplace
 * - search: Search in description and report number
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const hazardLevel = searchParams.get("hazardLevel");
    const hazardCategory = searchParams.get("hazardCategory");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const workplaceId = searchParams.get("workplaceId");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    return withRLSContext(async (tx) => {
      // Build query conditions
      const conditions = [];
      
      if (status) {
        conditions.push(eq(hazardReports.status, status));
      }
      
      if (hazardLevel) {
        conditions.push(eq(hazardReports.hazardLevel, hazardLevel as any));
      }
      
      if (hazardCategory) {
        conditions.push(eq(hazardReports.hazardCategory, hazardCategory as any));
      }
      
      if (fromDate) {
        conditions.push(gte(hazardReports.reportedDate, new Date(fromDate)));
      }
      
      if (toDate) {
        conditions.push(lte(hazardReports.reportedDate, new Date(toDate)));
      }
      
      if (workplaceId) {
        conditions.push(eq(hazardReports.workplaceId, workplaceId));
      }
      
      if (search) {
        conditions.push(
          or(
            like(hazardReports.reportNumber, `%${search}%`),
            like(hazardReports.hazardDescription, `%${search}%`),
            like(hazardReports.specificLocation, `%${search}%`)
          ) as any
        );
      }

      // Execute query
      const result = await tx
        .select()
        .from(hazardReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(hazardReports.hazardLevel), desc(hazardReports.reportedDate))
        .limit(limit)
        .offset(offset);

      // Count total
      const totalResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(hazardReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult[0]?.count || 0;

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/hazards',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { organizationId, count: result.length, total },
      });

      return standardSuccessResponse({
        hazards: result,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/hazards',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch hazards',
      error
    );
  }
});

/**
 * POST /api/health-safety/hazards
 * Create a new hazard report
 * 
 * Rate limited: 15 hazard reports per hour per user
 */
export const POST = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(userId, {
      limit: 15,
      window: 3600,
      identifier: 'hazard-create'
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        standardErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Try again in ${rateLimitResult.resetIn} seconds`
        ),
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Parse and validate
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body'
      );
    }

    const parsed = createHazardSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { errors: parsed.error.errors }
      );
    }

    const data = parsed.data;

    return withRLSContext(async (tx) => {
      // Generate unique report number
      const year = new Date().getFullYear();
      const countResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(hazardReports)
        .where(
          sql`EXTRACT(YEAR FROM ${hazardReports.reportedDate}) = ${year}`
        );
      
      const count = (countResult[0]?.count || 0) + 1;
      const reportNumber = `HAZ-${year}-${String(count).padStart(5, '0')}`;

      // Calculate risk score if both values provided
      let riskScore = null;
      if (data.likelihoodScore && data.severityScore) {
        riskScore = data.likelihoodScore * data.severityScore;
      }

      // Create hazard report
      const [hazard] = await tx
        .insert(hazardReports)
        .values({
          organizationId,
          reportNumber,
          hazardCategory: data.hazardCategory,
          hazardLevel: data.hazardLevel,
          reportedDate: new Date(),
          hazardDate: data.hazardDate ? new Date(data.hazardDate) : null,
          
          workplaceId: data.workplaceId,
          workplaceName: data.workplaceName,
          department: data.department,
          specificLocation: data.specificLocation,
          
          reportedById: data.isAnonymous ? null : userId,
          isAnonymous: data.isAnonymous,
          reporterContactInfo: data.reporterContactInfo,
          
          hazardDescription: data.hazardDescription,
          whoIsAtRisk: data.whoIsAtRisk,
          potentialConsequences: data.potentialConsequences,
          existingControls: data.existingControls,
          suggestedCorrections: data.suggestedCorrections,
          
          likelihoodScore: data.likelihoodScore,
          severityScore: data.severityScore,
          riskScore,
          
          status: 'reported',
          correctiveActionRequired: true,
          
          documentIds: data.documentIds,
          photoUrls: data.photoUrls,
          
          metadata: data.metadata,
          tags: data.tags,
          notes: data.notes,
          
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/hazards',
        method: 'POST',
        eventType: 'create',
        severity: data.hazardLevel === 'critical' || data.hazardLevel === 'extreme' ? 'high' : 'medium',
        dataType: 'HEALTH_SAFETY',
        details: { 
          organizationId, 
          reportNumber,
          hazardLevel: data.hazardLevel,
          hazardCategory: data.hazardCategory,
          isAnonymous: data.isAnonymous,
        },
      });

      // TODO: Trigger notifications for critical/extreme hazards
      if (data.hazardLevel === 'critical' || data.hazardLevel === 'extreme') {
        // Call notification service here
      }

      return standardSuccessResponse({ hazard }, 201);
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/hazards',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create hazard report',
      error
    );
  }
});
