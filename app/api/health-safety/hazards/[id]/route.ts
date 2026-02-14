/**
 * Health & Safety Hazard Detail API Routes
 * 
 * Individual hazard operations: get details, update, risk assessment
 * 
 * Authentication: Minimum role level 30 (health_safety_rep)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hazardReports } from "@/db/schema/domains/health-safety/health-safety-schema";
import { eq } from "drizzle-orm";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

/**
 * Validation schema for updating hazard reports
 */
const updateHazardSchema = z.object({
  status: z.enum(['reported', 'assessed', 'assigned', 'resolved', 'closed']).optional(),
  hazardLevel: z.enum(['low', 'moderate', 'high', 'critical', 'extreme']).optional(),
  
  // Risk assessment
  riskAssessmentCompleted: z.boolean().optional(),
  riskAssessmentDate: z.string().optional(),
  riskAssessorId: z.string().uuid().optional(),
  riskAssessorName: z.string().optional(),
  likelihoodScore: z.number().int().min(1).max(5).optional(),
  severityScore: z.number().int().min(1).max(5).optional(),
  
  // Assignment
  assignedToId: z.string().uuid().optional(),
  assignedToName: z.string().optional(),
  assignedDate: z.string().optional(),
  
  // Resolution
  resolutionDate: z.string().optional(),
  resolutionDescription: z.string().optional(),
  resolutionCost: z.number().min(0).optional(),
  
  // Verification
  verifiedById: z.string().uuid().optional(),
  verifiedByName: z.string().optional(),
  verifiedDate: z.string().optional(),
  verificationNotes: z.string().optional(),
  
  // Closure
  closedDate: z.string().optional(),
  
  // Documents
  documentIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/health-safety/hazards/[id]
 * Fetch a single hazard report by ID
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const hazardId = params.id;

      return withRLSContext(async (tx) => {
        const [hazard] = await tx
          .select()
          .from(hazardReports)
          .where(eq(hazardReports.id, hazardId));

        if (!hazard) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/health-safety/hazards/${hazardId}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'HEALTH_SAFETY',
            details: { reason: 'Hazard not found', hazardId },
          });
          
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Hazard report not found'
          );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/hazards/${hazardId}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'HEALTH_SAFETY',
          details: { hazardId, reportNumber: hazard.reportNumber },
        });

        return standardSuccessResponse({ hazard });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/hazards/${params.id}`,
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch hazard report',
        error
      );
    }
  })(request);
};

/**
 * PATCH /api/health-safety/hazards/[id]
 * Update a hazard report with assessment, assignment, or resolution
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(30, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const hazardId = params.id;

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

      const parsed = updateHazardSchema.safeParse(rawBody);
      if (!parsed.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Validation failed',
          { errors: parsed.error.errors }
        );
      }

      const updates = parsed.data;

      return withRLSContext(async (tx) => {
        // Verify hazard exists
        const [existing] = await tx
          .select()
          .from(hazardReports)
          .where(eq(hazardReports.id, hazardId));

        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Hazard report not found'
          );
        }

        // Prepare update data
        const updateData = {
          ...updates,
          updatedBy: userId,
          updatedAt: new Date(),
        };

        // Calculate risk score if both likelihood and severity provided
        if (updates.likelihoodScore && updates.severityScore) {
          updateData.riskScore = updates.likelihoodScore * updates.severityScore;
        } else if (updates.likelihoodScore && existing.severityScore) {
          updateData.riskScore = updates.likelihoodScore * existing.severityScore;
        } else if (updates.severityScore && existing.likelihoodScore) {
          updateData.riskScore = existing.likelihoodScore * updates.severityScore;
        }

        // Convert date strings
        if (updates.riskAssessmentDate) {
          updateData.riskAssessmentDate = new Date(updates.riskAssessmentDate);
        }
        if (updates.assignedDate) {
          updateData.assignedDate = new Date(updates.assignedDate);
        }
        if (updates.resolutionDate) {
          updateData.resolutionDate = new Date(updates.resolutionDate);
        }
        if (updates.verifiedDate) {
          updateData.verifiedDate = new Date(updates.verifiedDate);
        }
        if (updates.closedDate) {
          updateData.closedDate = new Date(updates.closedDate);
        }

        // Update hazard
        const [updated] = await tx
          .update(hazardReports)
          .set(updateData)
          .where(eq(hazardReports.id, hazardId))
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/health-safety/hazards/${hazardId}`,
          method: 'PATCH',
          eventType: 'update',
          severity: 'medium',
          dataType: 'HEALTH_SAFETY',
          details: { 
            hazardId, 
            reportNumber: updated.reportNumber,
            updatedFields: Object.keys(updates),
            statusChanged: !!updates.status,
            riskScore: updated.riskScore,
          },
        });

        return standardSuccessResponse({ hazard: updated });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/health-safety/hazards/${params.id}`,
        method: 'PATCH',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'HEALTH_SAFETY',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update hazard report',
        error
      );
    }
  })(request);
};
