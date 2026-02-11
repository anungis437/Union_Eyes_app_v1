/**
 * Negotiation Detail API
 * GET /api/bargaining/negotiations/[id] - Get negotiation details
 * PATCH /api/bargaining/negotiations/[id] - Update negotiation
 * DELETE /api/bargaining/negotiations/[id] - Delete negotiation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { 
  negotiations, 
  bargainingProposals, 
  tentativeAgreements, 
  negotiationSessions,
  bargainingTeamMembers 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

// Validation schema for updates
const updateNegotiationSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum([
    "scheduled",
    "active",
    "impasse",
    "conciliation",
    "tentative",
    "ratified",
    "rejected",
    "strike_lockout",
    "completed",
    "abandoned"
  ]).optional(),
  firstSessionDate: z.string().datetime().optional(),
  targetCompletionDate: z.string().datetime().optional(),
  tentativeAgreementDate: z.string().datetime().optional(),
  ratificationDate: z.string().datetime().optional(),
  completionDate: z.string().datetime().optional(),
  keyIssues: z.array(z.object({
    issue: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    status: z.enum(["unresolved", "progress", "resolved"]),
    notes: z.string().optional()
  })).optional(),
  strikeVotePassed: z.boolean().optional(),
  strikeVoteDate: z.string().datetime().optional(),
  strikeVoteYesPercent: z.string().optional(),
  progressSummary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/bargaining/negotiations/[id]
 * Get negotiation with all related data
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { organizationId } = context;
    const { id } = params;
    
    try {
      return withRLSContext(async (tx) => {
        // Fetch negotiation
        const [negotiation] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, id))
          .limit(1);
        
        if (!negotiation) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Negotiation not found'
          );
        }
        
        // Verify organization access
        if (negotiation.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Fetch related data in parallel
        const [proposals, agreements, sessions, teamMembers] = await Promise.all([
          tx
            .select()
            .from(bargainingProposals)
            .where(eq(bargainingProposals.negotiationId, id)),
          tx
            .select()
            .from(tentativeAgreements)
            .where(eq(tentativeAgreements.negotiationId, id)),
          tx
            .select()
            .from(negotiationSessions)
            .where(eq(negotiationSessions.negotiationId, id)),
          tx
            .select()
            .from(bargainingTeamMembers)
            .where(eq(bargainingTeamMembers.negotiationId, id))
        ]);
        
        return NextResponse.json({
          negotiation,
          proposals,
          tentativeAgreements: agreements,
          sessions,
          teamMembers,
          statistics: {
            totalProposals: proposals.length,
            acceptedProposals: proposals.filter(p => p.status === 'accepted').length,
            tentativeAgreements: agreements.filter(a => !a.ratified).length,
            ratifiedAgreements: agreements.filter(a => a.ratified).length,
            totalSessions: sessions.length,
            teamSize: teamMembers.filter(m => m.isActive).length,
          }
        });
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch negotiation',
        error
      );
    }
  })(request, { params });
};

/**
 * PATCH /api/bargaining/negotiations/[id]
 * Update negotiation details
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;
    const { id } = params;
    
    try {
      const body = await request.json();
      const validatedData = updateNegotiationSchema.parse(body);
      
      return withRLSContext(async (tx) => {
        // Verify negotiation exists and belongs to org
        const [existing] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, id))
          .limit(1);
        
        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Negotiation not found'
          );
        }
        
        if (existing.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Update negotiation
        const [updated] = await tx
          .update(negotiations)
          .set({
            ...validatedData,
            firstSessionDate: validatedData.firstSessionDate ? new Date(validatedData.firstSessionDate) : undefined,
            targetCompletionDate: validatedData.targetCompletionDate ? new Date(validatedData.targetCompletionDate) : undefined,
            tentativeAgreementDate: validatedData.tentativeAgreementDate ? new Date(validatedData.tentativeAgreementDate) : undefined,
            ratificationDate: validatedData.ratificationDate ? new Date(validatedData.ratificationDate) : undefined,
            completionDate: validatedData.completionDate ? new Date(validatedData.completionDate) : undefined,
            strikeVoteDate: validatedData.strikeVoteDate ? new Date(validatedData.strikeVoteDate) : undefined,
            lastActivityDate: new Date(),
            updatedAt: new Date(),
            lastModifiedBy: userId,
          })
          .where(eq(negotiations.id, id))
          .returning();
        
        return standardSuccessResponse(
          updated,
          'Negotiation updated successfully'
        );
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid update data',
          error.errors
        );
      }
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update negotiation',
        error
      );
    }
  })(request, { params });
};

/**
 * DELETE /api/bargaining/negotiations/[id]
 * Delete negotiation (soft delete by setting status to abandoned)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;
    const { id } = params;
    
    try {
      return withRLSContext(async (tx) => {
        // Verify negotiation exists and belongs to org
        const [existing] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, id))
          .limit(1);
        
        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Negotiation not found'
          );
        }
        
        if (existing.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Soft delete by setting status to abandoned
        await tx
          .update(negotiations)
          .set({
            status: 'abandoned',
            updatedAt: new Date(),
            lastModifiedBy: userId,
          })
          .where(eq(negotiations.id, id));
        
        return standardSuccessResponse(
          { id },
          'Negotiation deleted successfully'
        );
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to delete negotiation',
        error
      );
    }
  })(request, { params });
};
