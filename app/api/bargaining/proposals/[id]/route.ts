/**
 * Proposal Detail API
 * GET /api/bargaining/proposals/[id] - Get proposal details
 * PATCH /api/bargaining/proposals/[id] - Update proposal
 * DELETE /api/bargaining/proposals/[id] - Delete proposal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { bargainingProposals, negotiations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { standardSuccessResponse } from '@/lib/api/standardized-responses';

// Validation schema for updates
const updateProposalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum([
    "draft",
    "submitted",
    "under_review",
    "accepted",
    "rejected",
    "counter_offered",
    "withdrawn",
    "superseded"
  ]).optional(),
  proposedLanguage: z.string().optional(),
  rationale: z.string().optional(),
  estimatedCost: z.string().optional(),
  costingNotes: z.string().optional(),
  unionPosition: z.string().max(50).optional(),
  managementPosition: z.string().max(50).optional(),
  responseDeadline: z.string().datetime().optional(),
  resolvedDate: z.string().datetime().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    fileType: z.string(),
    uploadedAt: z.string()
  })).optional(),
  internalNotes: z.string().optional(),
});

/**
 * GET /api/bargaining/proposals/[id]
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
        // Fetch proposal
        const [proposal] = await tx
          .select()
          .from(bargainingProposals)
          .where(eq(bargainingProposals.id, id))
          .limit(1);
        
        if (!proposal) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Proposal not found'
          );
        }
        
        // Verify access through negotiation
        const [negotiation] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, proposal.negotiationId))
          .limit(1);
        
        if (!negotiation || negotiation.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Fetch related proposals (parent and counter-offers)
        const [parentProposal, counterOffers] = await Promise.all([
          proposal.parentProposalId
            ? tx
                .select()
                .from(bargainingProposals)
                .where(eq(bargainingProposals.id, proposal.parentProposalId))
                .limit(1)
            : Promise.resolve([null]),
          tx
            .select()
            .from(bargainingProposals)
            .where(eq(bargainingProposals.parentProposalId, id))
        ]);
        
        return NextResponse.json({
          proposal,
          parentProposal: parentProposal[0] || null,
          counterOffers,
        });
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch proposal',
        error
      );
    }
  })(request, { params });
};

/**
 * PATCH /api/bargaining/proposals/[id]
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
      const validatedData = updateProposalSchema.parse(body);
      
      return withRLSContext(async (tx) => {
        // Verify proposal exists
        const [existing] = await tx
          .select()
          .from(bargainingProposals)
          .where(eq(bargainingProposals.id, id))
          .limit(1);
        
        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Proposal not found'
          );
        }
        
        // Verify access
        const [negotiation] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, existing.negotiationId))
          .limit(1);
        
        if (!negotiation || negotiation.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Update proposal
        const [updated] = await tx
          .update(bargainingProposals)
          .set({
            ...validatedData,
            responseDeadline: validatedData.responseDeadline ? new Date(validatedData.responseDeadline) : undefined,
            resolvedDate: validatedData.resolvedDate ? new Date(validatedData.resolvedDate) : undefined,
            updatedAt: new Date(),
            lastModifiedBy: userId,
          })
          .where(eq(bargainingProposals.id, id))
          .returning();
        
        return standardSuccessResponse(
          updated,
          'Proposal updated successfully'
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
        'Failed to update proposal',
        error
      );
    }
  })(request, { params });
};

/**
 * DELETE /api/bargaining/proposals/[id]
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { organizationId } = context;
    const { id } = params;
    
    try {
      return withRLSContext(async (tx) => {
        // Verify proposal exists
        const [existing] = await tx
          .select()
          .from(bargainingProposals)
          .where(eq(bargainingProposals.id, id))
          .limit(1);
        
        if (!existing) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Proposal not found'
          );
        }
        
        // Verify access
        const [negotiation] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, existing.negotiationId))
          .limit(1);
        
        if (!negotiation || negotiation.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Delete proposal
        await tx
          .delete(bargainingProposals)
          .where(eq(bargainingProposals.id, id));
        
        return standardSuccessResponse(
          { id },
          'Proposal deleted successfully'
        );
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to delete proposal',
        error
      );
    }
  })(request, { params });
};
