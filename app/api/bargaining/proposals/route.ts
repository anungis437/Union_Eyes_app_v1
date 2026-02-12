/**
 * Bargaining Proposals API
 * GET /api/bargaining/proposals - List proposals
 * POST /api/bargaining/proposals - Create new proposal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { bargainingProposals, negotiations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

// Validation schema for creating proposals
const createProposalSchema = z.object({
  negotiationId: z.string().uuid(),
  proposalNumber: z.string().max(50),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  proposalType: z.enum(["union_demand", "management_offer", "joint_proposal", "mediator_proposal"]),
  relatedClauseId: z.string().uuid().optional(),
  clauseCategory: z.string().max(100).optional(),
  currentLanguage: z.string().optional(),
  proposedLanguage: z.string().min(1),
  rationale: z.string().optional(),
  estimatedCost: z.string().optional(),
  costingNotes: z.string().optional(),
  unionPosition: z.string().max(50).optional(),
  managementPosition: z.string().max(50).optional(),
  responseDeadline: z.string().datetime().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    fileType: z.string(),
    uploadedAt: z.string()
  })).optional(),
  internalNotes: z.string().optional(),
});

/**
 * GET /api/bargaining/proposals
 * List proposals with filtering
 */
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { organizationId } = context;
    
    try {
      const { searchParams } = new URL(request.url);
      
      // Required filter
      const negotiationId = searchParams.get("negotiationId");
      if (!negotiationId) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'negotiationId is required'
        );
      }
      
      // Optional filters
      const proposalType = searchParams.get("proposalType");
      const status = searchParams.get("status");
      const clauseCategory = searchParams.get("clauseCategory");
      
      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = (page - 1) * limit;
      
      return withRLSContext(async (tx) => {
        // Verify negotiation belongs to organization
        const [negotiation] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, negotiationId))
          .limit(1);
        
        if (!negotiation) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Negotiation not found'
          );
        }
        
        if (negotiation.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Build conditions
        const conditions = [eq(bargainingProposals.negotiationId, negotiationId)];
        
        if (proposalType) {
          conditions.push(eq(bargainingProposals.proposalType, proposalType));
        }
        
        if (status) {
          conditions.push(eq(bargainingProposals.status, status));
        }
        
        if (clauseCategory) {
          conditions.push(eq(bargainingProposals.clauseCategory, clauseCategory));
        }
        
        // Fetch proposals
        const [proposalsList, countResult] = await Promise.all([
          tx
            .select()
            .from(bargainingProposals)
            .where(and(...conditions))
            .orderBy(desc(bargainingProposals.createdAt))
            .limit(limit)
            .offset(offset),
          tx
            .select({ count: sql<number>`count(*)::int` })
            .from(bargainingProposals)
            .where(and(...conditions))
        ]);
        
        const total = countResult[0]?.count || 0;
        
        return NextResponse.json({
          proposals: proposalsList,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch proposals',
        error
      );
    }
  })(request);
};

/**
 * POST /api/bargaining/proposals
 * Create a new proposal
 */
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;
    
    try {
      const body = await request.json();
      const validatedData = createProposalSchema.parse(body);
      
      return withRLSContext(async (tx) => {
        // Verify negotiation belongs to organization
        const [negotiation] = await tx
          .select()
          .from(negotiations)
          .where(eq(negotiations.id, validatedData.negotiationId))
          .limit(1);
        
        if (!negotiation) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            'Negotiation not found'
          );
        }
        
        if (negotiation.organizationId !== organizationId) {
          return standardErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied'
          );
        }
        
        // Create proposal
        const [newProposal] = await tx
          .insert(bargainingProposals)
          .values({
            ...validatedData,
            submittedDate: new Date(),
            responseDeadline: validatedData.responseDeadline ? new Date(validatedData.responseDeadline) : undefined,
            createdBy: userId,
            lastModifiedBy: userId,
          })
          .returning();
        
        return standardSuccessResponse(
          newProposal,
          'Proposal created successfully',
          201
        );
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid proposal data',
          error.errors
        );
      }
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create proposal',
        error
      );
    }
  })(request);
};
