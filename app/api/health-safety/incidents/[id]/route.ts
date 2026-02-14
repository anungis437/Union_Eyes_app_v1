/**
 * Health & Safety Incident Detail API Routes
 * 
 * Individual incident operations: get details, update, delete
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { workplaceIncidents } from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

/**
 * Validation schema for updating incidents
 */
const updateIncidentSchema = z.object({
  status: z.enum(['reported', 'investigating', 'closed']).optional(),
  severity: z.enum(['near_miss', 'minor', 'moderate', 'serious', 'critical', 'fatal']).optional(),
  description: z.string().min(20).optional(),
  whatHappened: z.string().optional(),
  taskBeingPerformed: z.string().optional(),
  equipmentInvolved: z.string().optional(),
  
  // Investigation updates
  investigationStartDate: z.string().optional(),
  investigationCompletedDate: z.string().optional(),
  investigatorId: z.string().uuid().optional(),
  investigatorName: z.string().optional(),
  investigationReport: z.string().optional(),
  rootCauseAnalysis: z.string().optional(),
  contributingFactors: z.array(z.string()).optional(),
  
  // Corrective actions
  immediateActionsToken: z.string().optional(),
  correctiveActionsRequired: z.boolean().optional(),
  correctiveActionsSummary: z.string().optional(),
  
  // Regulatory
  authorityNotified: z.boolean().optional(),
  authorityReportNumber: z.string().optional(),
  authorityReportDate: z.string().optional(),
  
  // WSIB/Workers Compensation
  wsibClaimNumber: z.string().optional(),
  wsibClaimStatus: z.string().optional(),
  
  // Closure
  closedDate: z.string().optional(),
  closureNotes: z.string().optional(),
  lessonsLearned: z.string().optional(),
  
  // Documents
  documentIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/health-safety/incidents/[id]
 * Fetch a single incident by ID
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const incidentId = params.id;

      return withRLSContext(async (tx) => {
        const [incident] = await tx
          .select()
          .from(workplaceIncidents)
          .where(eq(workplaceIncidents.id, incidentId));

        if (!incident) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/health-safety/incidents/${incidentId}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'HEALTH_SAFETY',
            details: { reason: 'Incident not found', incidentId },
          });
          
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Incident not found'
          );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/incidents/${incidentId}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'HEALTH_SAFETY',
          details: { incidentId, incidentNumber: incident.incidentNumber },
        });

        return standardSuccessResponse({ incident });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/incidents/${params.id}`,
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch incident',
        error
      );
    }
  })(request);
};

/**
 * PATCH /api/health-safety/incidents/[id]
 * Update an incident
 * 
 * Requires role level 50+ for status changes, 30+ for other updates
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId, roleLevel } = context;

    try {
      const incidentId = params.id;

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

      const parsed = updateIncidentSchema.safeParse(rawBody);
      if (!parsed.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          { errors: parsed.error.errors }
        );
      }

      const updates = parsed.data;

      // Check if status change requires higher permissions
      if (updates.status && roleLevel < 50) {
        return standardErrorResponse(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'Status changes require steward role or higher (level 50+)'
        );
      }

      return withRLSContext(async (tx) => {
        // Verify incident exists and user has access (RLS enforces org boundary)
        const [existing] = await tx
          .select()
          .from(workplaceIncidents)
          .where(eq(workplaceIncidents.id, incidentId));

        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Incident not found'
          );
        }

        // Prepare update data
        const updateData = {
          ...updates,
          updatedBy: userId,
          updatedAt: new Date(),
        };

        // Convert date strings to Date objects
        if (updates.investigationStartDate) {
          updateData.investigationStartDate = new Date(updates.investigationStartDate);
        }
        if (updates.investigationCompletedDate) {
          updateData.investigationCompletedDate = new Date(updates.investigationCompletedDate);
        }
        if (updates.authorityReportDate) {
          updateData.authorityReportDate = new Date(updates.authorityReportDate);
        }
        if (updates.closedDate) {
          updateData.closedDate = new Date(updates.closedDate);
        }

        // Update incident
        const [updated] = await tx
          .update(workplaceIncidents)
          .set(updateData)
          .where(eq(workplaceIncidents.id, incidentId))
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/incidents/${incidentId}`,
          method: 'PATCH',
          eventType: 'update',
          severity: 'medium',
          dataType: 'HEALTH_SAFETY',
          details: { 
            incidentId, 
            incidentNumber: updated.incidentNumber,
            updatedFields: Object.keys(updates),
            statusChanged: !!updates.status,
          },
        });

        return standardSuccessResponse({ incident: updated });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/incidents/${params.id}`,
        method: 'PATCH',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update incident',
        error
      );
    }
  })(request);
};

/**
 * DELETE /api/health-safety/incidents/[id]
 * Delete an incident (soft delete by marking as deleted in metadata)
 * 
 * Requires admin role (level 100+)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(100, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const incidentId = params.id;

      return withRLSContext(async (tx) => {
        // Verify incident exists
        const [existing] = await tx
          .select()
          .from(workplaceIncidents)
          .where(eq(workplaceIncidents.id, incidentId));

        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Incident not found'
          );
        }

        // Soft delete by updating metadata
        await tx
          .update(workplaceIncidents)
          .set({
            metadata: {
              ...(existing.metadata as Record<string, unknown> || {}),
              deleted: true,
              deletedAt: new Date().toISOString(),
              deletedBy: userId,
            },
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(workplaceIncidents.id, incidentId));

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/incidents/${incidentId}`,
          method: 'DELETE',
          eventType: 'delete',
          severity: 'high',
          dataType: 'HEALTH_SAFETY',
          details: { 
            incidentId, 
            incidentNumber: existing.incidentNumber,
            organizationId,
          },
        });

        return standardSuccessResponse({ 
          message: 'Incident deleted successfully',
          incidentNumber: existing.incidentNumber 
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/incidents/${params.id}`,
        method: 'DELETE',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to delete incident',
        error
      );
    }
  })(request);
};
