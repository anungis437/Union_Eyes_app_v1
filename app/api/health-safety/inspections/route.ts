/**
 * Health & Safety Inspections API Routes
 * 
 * Safety inspection scheduling, tracking, and reporting.
 * Handles routine inspections, compliance checks, and follow-ups.
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */


import { z } from "zod";
import { safetyInspections } from "@/db/schema/domains/health-safety/health-safety-schema";
import { desc, and, or, like, sql } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limiter";
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

/**
 * Validation schema for creating inspections
 */
const createInspectionSchema = z.object({
  inspectionType: z.enum([
    'routine', 'comprehensive', 'targeted', 'post_incident',
    'regulatory', 'pre_operational', 'contractor', 'joint_committee', 'other'
  ]),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format').optional(),
  
  // Location
  workplaceId: z.string().uuid().optional(),
  workplaceName: z.string().optional(),
  areasInspected: z.array(z.string()).optional(),
  specificLocation: z.string().optional(),
  
  // Inspection team
  leadInspectorId: z.string().uuid().optional(),
  leadInspectorName: z.string().optional(),
  inspectorIds: z.array(z.string()).optional(),
  inspectorNames: z.array(z.string()).optional(),
  
  // Scope
  inspectionScope: z.string().optional(),
  checklistUsed: z.string().optional(),
  checklistItems: z.array(z.object({
    item: z.string(),
    status: z.enum(['pass', 'fail', 'na', 'requires_attention']),
    notes: z.string().optional(),
  })).optional(),
  
  // Regulatory
  regulatoryRequirement: z.boolean().optional().default(false),
  regulatoryAgency: z.string().optional(),
  
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/health-safety/inspections
 * List and filter safety inspections
 * 
 * Query parameters:
 * - status: Filter by status
 * - inspectionType: Filter by inspection type
 * - fromDate: Filter from this date
 * - toDate: Filter to this date
 * - workplaceId: Filter by workplace
 * - followUpRequired: Filter by follow-up status (true/false)
 * - search: Search in inspection number and scope
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const inspectionType = searchParams.get("inspectionType");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const workplaceId = searchParams.get("workplaceId");
    const followUpRequired = searchParams.get("followUpRequired");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    return withRLSContext(async (tx) => {
      // Build query conditions
      const conditions = [];
      
      if (status) {
        conditions.push(eq(safetyInspections.status, status));
      }
      
      if (inspectionType) {
        conditions.push(eq(safetyInspections.inspectionType, inspectionType));
      }
      
      if (fromDate) {
        conditions.push(gte(safetyInspections.scheduledDate, new Date(fromDate)));
      }
      
      if (toDate) {
        conditions.push(lte(safetyInspections.scheduledDate, new Date(toDate)));
      }
      
      if (workplaceId) {
        conditions.push(eq(safetyInspections.workplaceId, workplaceId));
      }
      
      if (followUpRequired !== null && followUpRequired !== undefined) {
        conditions.push(eq(safetyInspections.followUpRequired, followUpRequired === 'true'));
      }
      
      if (search) {
        conditions.push(
          or(
            like(safetyInspections.inspectionNumber, `%${search}%`),
            like(safetyInspections.inspectionScope, `%${search}%`)
          ) as SQL<unknown> | undefined
        );
      }

      // Execute query
      const result = await tx
        .select()
        .from(safetyInspections)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(safetyInspections.scheduledDate))
        .limit(limit)
        .offset(offset);

      // Count total
      const totalResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(safetyInspections)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult[0]?.count || 0;

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/inspections',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { organizationId, count: result.length, total },
      });

      return standardSuccessResponse({
        inspections: result,
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
      endpoint: '/api/health-safety/inspections',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch inspections',
      error
    );
  }
});

/**
 * POST /api/health-safety/inspections
 * Create a new safety inspection
 * 
 * Rate limited: 30 inspections per hour per user
 */
export const POST = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(userId, {
      limit: 30,
      window: 3600,
      identifier: 'inspection-create'
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

    const parsed = createInspectionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { errors: parsed.error.errors }
      );
    }

    const data = parsed.data;

    return withRLSContext(async (tx) => {
      // Generate unique inspection number
      const year = new Date().getFullYear();
      const countResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(safetyInspections)
        .where(
          sql`EXTRACT(YEAR FROM ${safetyInspections.scheduledDate}) = ${year}`
        );
      
      const count = (countResult[0]?.count || 0) + 1;
      const inspectionNumber = `INS-${year}-${String(count).padStart(5, '0')}`;

      // Create inspection record
      const [inspection] = await tx
        .insert(safetyInspections)
        .values({
          organizationId,
          inspectionNumber,
          inspectionType: data.inspectionType,
          scheduledDate: new Date(data.scheduledDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: 'scheduled',
          
          workplaceId: data.workplaceId,
          workplaceName: data.workplaceName,
          areasInspected: data.areasInspected,
          specificLocation: data.specificLocation,
          
          leadInspectorId: data.leadInspectorId || userId,
          leadInspectorName: data.leadInspectorName,
          inspectorIds: data.inspectorIds,
          inspectorNames: data.inspectorNames,
          
          inspectionScope: data.inspectionScope,
          checklistUsed: data.checklistUsed,
          checklistItems: data.checklistItems,
          
          regulatoryRequirement: data.regulatoryRequirement,
          regulatoryAgency: data.regulatoryAgency,
          
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
        endpoint: '/api/health-safety/inspections',
        method: 'POST',
        eventType: 'create',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { 
          organizationId, 
          inspectionNumber,
          inspectionType: data.inspectionType,
        },
      });

      return standardSuccessResponse({ inspection }, 201);
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/inspections',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create inspection',
      error
    );
  }
});
