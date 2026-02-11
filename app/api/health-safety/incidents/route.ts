/**
 * Health & Safety Incidents API Routes
 * 
 * Comprehensive incident tracking and reporting for workplace safety.
 * Handles injuries, near-misses, property damage, and environmental incidents.
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { workplaceIncidents } from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq, desc, and, or, like, sql, gte, lte, inArray } from "drizzle-orm";
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
 * Validation schema for creating incidents
 */
const createIncidentSchema = z.object({
  incidentType: z.enum([
    'injury', 'near_miss', 'property_damage', 'environmental', 
    'vehicle', 'ergonomic', 'exposure', 'occupational_illness',
    'fire', 'electrical', 'fall', 'other'
  ]),
  severity: z.enum(['near_miss', 'minor', 'moderate', 'serious', 'critical', 'fatal']),
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
  reportedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format').optional(),
  locationDescription: z.string().min(10, 'Location description must be at least 10 characters'),
  workplaceName: z.string().optional(),
  departmentName: z.string().optional(),
  
  // Injured person details
  injuredPersonId: z.string().uuid().optional(),
  injuredPersonName: z.string().optional(),
  injuredPersonJobTitle: z.string().optional(),
  injuredPersonEmployeeId: z.string().optional(),
  
  // Injury specifics
  bodyPartAffected: z.enum([
    'head', 'eyes', 'face', 'neck', 'shoulder', 'arm', 'elbow', 
    'wrist', 'hand', 'fingers', 'chest', 'back', 'abdomen', 'hip',
    'leg', 'knee', 'ankle', 'foot', 'toes', 'multiple', 'internal', 'other'
  ]).optional(),
  injuryNature: z.enum([
    'cut', 'laceration', 'puncture', 'bruise', 'contusion', 'fracture',
    'sprain', 'strain', 'dislocation', 'amputation', 'burn', 'chemical_burn',
    'concussion', 'crushing', 'electric_shock', 'exposure', 'hearing_loss',
    'infection', 'inflammation', 'poisoning', 'respiratory', 'multiple', 'other'
  ]).optional(),
  treatmentProvided: z.string().optional(),
  lostTimeDays: z.number().int().min(0).optional(),
  restrictedWorkDays: z.number().int().min(0).optional(),
  
  // Incident description
  description: z.string().min(20, 'Description must be at least 20 characters'),
  whatHappened: z.string().optional(),
  taskBeingPerformed: z.string().optional(),
  equipmentInvolved: z.string().optional(),
  
  // Witnesses
  witnessesPresent: z.boolean().optional().default(false),
  witnessNames: z.array(z.string()).optional(),
  
  // Reporter info
  reportedByName: z.string().optional(),
  reportedByJobTitle: z.string().optional(),
  
  // Investigation
  investigationRequired: z.boolean().optional().default(true),
  rootCauseAnalysis: z.string().optional(),
  immediateActionsToken: z.string().optional(),
  
  // Regulatory
  reportableToAuthority: z.boolean().optional().default(false),
  authorityName: z.string().optional(),
  
  // Documents
  documentIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/health-safety/incidents
 * List and filter workplace incidents
 * 
 * Query parameters:
 * - status: Filter by status (reported, investigating, closed)
 * - severity: Filter by severity level
 * - incidentType: Filter by incident type
 * - fromDate: Filter incidents from this date
 * - toDate: Filter incidents to this date
 * - workplaceId: Filter by workplace
 * - search: Search in description and incident number
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const incidentType = searchParams.get("incidentType");
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
        conditions.push(eq(workplaceIncidents.status, status));
      }
      
      if (severity) {
        conditions.push(eq(workplaceIncidents.severity, severity as any));
      }
      
      if (incidentType) {
        conditions.push(eq(workplaceIncidents.incidentType, incidentType as any));
      }
      
      if (fromDate) {
        conditions.push(gte(workplaceIncidents.incidentDate, new Date(fromDate)));
      }
      
      if (toDate) {
        conditions.push(lte(workplaceIncidents.incidentDate, new Date(toDate)));
      }
      
      if (workplaceId) {
        conditions.push(eq(workplaceIncidents.workplaceId, workplaceId));
      }
      
      if (search) {
        conditions.push(
          or(
            like(workplaceIncidents.incidentNumber, `%${search}%`),
            like(workplaceIncidents.description, `%${search}%`),
            like(workplaceIncidents.locationDescription, `%${search}%`)
          ) as any
        );
      }

      // Execute query with RLS enforcement
      const result = await tx
        .select()
        .from(workplaceIncidents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(workplaceIncidents.incidentDate), desc(workplaceIncidents.createdAt))
        .limit(limit)
        .offset(offset);

      // Count total for pagination
      const totalResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(workplaceIncidents)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = totalResult[0]?.count || 0;

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/incidents',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'HEALTH_SAFETY',
        details: { organizationId, count: result.length, total },
      });

      return standardSuccessResponse({
        incidents: result,
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
      endpoint: '/api/health-safety/incidents',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch incidents',
      error
    );
  }
});

/**
 * POST /api/health-safety/incidents
 * Create a new workplace incident report
 * 
 * Rate limited: 20 incidents per hour per user
 */
export const POST = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting check
    const rateLimitResult = await checkRateLimit(userId, {
      limit: 20,
      window: 3600,
      identifier: 'incident-create'
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

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body'
      );
    }

    const parsed = createIncidentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { errors: parsed.error.errors }
      );
    }

    const data = parsed.data;

    return withRLSContext(async (tx) => {
      // Generate unique incident number
      const year = new Date().getFullYear();
      const countResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(workplaceIncidents)
        .where(
          and(
            sql`EXTRACT(YEAR FROM ${workplaceIncidents.incidentDate}) = ${year}`
          )
        );
      
      const count = (countResult[0]?.count || 0) + 1;
      const incidentNumber = `INC-${year}-${String(count).padStart(5, '0')}`;

      // Create incident record
      const [incident] = await tx
        .insert(workplaceIncidents)
        .values({
          organizationId,
          incidentNumber,
          incidentType: data.incidentType,
          severity: data.severity,
          incidentDate: new Date(data.incidentDate),
          reportedDate: data.reportedDate ? new Date(data.reportedDate) : new Date(),
          locationDescription: data.locationDescription,
          workplaceName: data.workplaceName,
          departmentName: data.departmentName,
          
          injuredPersonId: data.injuredPersonId,
          injuredPersonName: data.injuredPersonName,
          injuredPersonJobTitle: data.injuredPersonJobTitle,
          injuredPersonEmployeeId: data.injuredPersonEmployeeId,
          
          bodyPartAffected: data.bodyPartAffected,
          injuryNature: data.injuryNature,
          treatmentProvided: data.treatmentProvided,
          lostTimeDays: data.lostTimeDays,
          restrictedWorkDays: data.restrictedWorkDays,
          
          description: data.description,
          whatHappened: data.whatHappened,
          taskBeingPerformed: data.taskBeingPerformed,
          equipmentInvolved: data.equipmentInvolved,
          
          witnessesPresent: data.witnessesPresent,
          witnessNames: data.witnessNames,
          
          reportedById: userId,
          reportedByName: data.reportedByName,
          reportedByJobTitle: data.reportedByJobTitle,
          
          investigationRequired: data.investigationRequired,
          rootCauseAnalysis: data.rootCauseAnalysis,
          immediateActionsToken: data.immediateActionsToken,
          
          reportableToAuthority: data.reportableToAuthority,
          authorityName: data.authorityName,
          
          documentIds: data.documentIds,
          photoUrls: data.photoUrls,
          
          status: 'reported',
          metadata: data.metadata,
          tags: data.tags,
          
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/health-safety/incidents',
        method: 'POST',
        eventType: 'create',
        severity: data.severity === 'critical' || data.severity === 'fatal' ? 'high' : 'medium',
        dataType: 'HEALTH_SAFETY',
        details: { 
          organizationId, 
          incidentNumber, 
          severity: data.severity,
          incidentType: data.incidentType 
        },
      });

      // TODO: Trigger notifications for critical incidents
      if (data.severity === 'critical' || data.severity === 'fatal') {
        // Call notification service here
      }

      return standardSuccessResponse({ incident }, 201);
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/health-safety/incidents',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'HEALTH_SAFETY',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create incident',
      error
    );
  }
});
