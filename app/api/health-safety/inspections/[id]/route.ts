/**
 * Health & Safety Inspection Detail API Routes
 * 
 * Individual inspection operations: get details, update
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safetyInspections } from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

/**
 * Validation schema for updating inspections
 */
const updateInspectionSchema = z.object({
  status: z.enum([
    'scheduled', 'in_progress', 'completed', 
    'requires_followup', 'followup_complete', 'cancelled', 'overdue'
  ]).optional(),
  
  startedDate: z.string().optional(),
  completedDate: z.string().optional(),
  
  // Checklist updates
  checklistItems: z.array(z.object({
    item: z.string(),
    status: z.enum(['pass', 'fail', 'na', 'requires_attention']),
    notes: z.string().optional(),
  })).optional(),
  
  // Findings
  totalItemsChecked: z.number().int().min(0).optional(),
  itemsPassed: z.number().int().min(0).optional(),
  itemsFailed: z.number().int().min(0).optional(),
  itemsRequiringAttention: z.number().int().min(0).optional(),
  hazardsIdentified: z.number().int().min(0).optional(),
  criticalHazards: z.number().int().min(0).optional(),
  
  // Results
  overallRating: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  scorePercentage: z.number().min(0).max(100).optional(),
  findings: z.string().optional(),
  observations: z.string().optional(),
  positiveFindings: z.string().optional(),
  areasOfConcern: z.string().optional(),
  recommendations: z.string().optional(),
  
  // Actions
  immediateActionRequired: z.boolean().optional(),
  correctiveActionsRequired: z.boolean().optional(),
  
  // Follow-up
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
  followUpCompleted: z.boolean().optional(),
  followUpNotes: z.string().optional(),
  
  // Documents
  documentIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  reportUrl: z.string().optional(),
  
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/health-safety/inspections/[id]
 * Fetch a single inspection by ID
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const inspectionId = params.id;

      return withRLSContext(async (tx) => {
        const [inspection] = await tx
          .select()
          .from(safetyInspections)
          .where(eq(safetyInspections.id, inspectionId));

        if (!inspection) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/health-safety/inspections/${inspectionId}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'HEALTH_SAFETY',
            details: { reason: 'Inspection not found', inspectionId },
          });
          
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Inspection not found'
          );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/inspections/${inspectionId}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'HEALTH_SAFETY',
          details: { inspectionId, inspectionNumber: inspection.inspectionNumber },
        });

        return standardSuccessResponse({ inspection });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/inspections/${params.id}`,
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch inspection',
        error
      );
    }
  })(request);
};

/**
 * PATCH /api/health-safety/inspections/[id]
 * Update an inspection with findings and results
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const inspectionId = params.id;

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

      const parsed = updateInspectionSchema.safeParse(rawBody);
      if (!parsed.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          { errors: parsed.error.errors }
        );
      }

      const updates = parsed.data;

      return withRLSContext(async (tx) => {
        // Verify inspection exists
        const [existing] = await tx
          .select()
          .from(safetyInspections)
          .where(eq(safetyInspections.id, inspectionId));

        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Inspection not found'
          );
        }

        // Prepare update data
        const updateData: any = {
          ...updates,
          updatedBy: userId,
          updatedAt: new Date(),
        };

        // Convert date strings
        if (updates.startedDate) {
          updateData.startedDate = new Date(updates.startedDate);
        }
        if (updates.completedDate) {
          updateData.completedDate = new Date(updates.completedDate);
        }
        if (updates.followUpDate) {
          updateData.followUpDate = new Date(updates.followUpDate);
        }

        // Update inspection
        const [updated] = await tx
          .update(safetyInspections)
          .set(updateData)
          .where(eq(safetyInspections.id, inspectionId))
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/inspections/${inspectionId}`,
          method: 'PATCH',
          eventType: 'update',
          severity: 'medium',
          dataType: 'HEALTH_SAFETY',
          details: { 
            inspectionId, 
            inspectionNumber: updated.inspectionNumber,
            updatedFields: Object.keys(updates),
            statusChanged: !!updates.status,
          },
        });

        return standardSuccessResponse({ inspection: updated });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/inspections/${params.id}`,
        method: 'PATCH',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update inspection',
        error
      );
    }
  })(request);
};
