/**
 * Tentative Agreements API
 * GET /api/bargaining/tentative-agreements - List tentative agreements
 * POST /api/bargaining/tentative-agreements - Create new tentative agreement
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tentativeAgreements, negotiations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

// Validation schema
const createTentativeAgreementSchema = z.object({
  negotiationId: z.string().uuid(),
  agreementNumber: z.string().max(50),
  title: z.string().min(1).max(500),
  clauseCategory: z.string().min(1).max(100),
  agreedLanguage: z.string().min(1),
  previousLanguage: z.string().optional(),
  relatedProposalIds: z.array(z.string()).optional(),
  relatedClauseId: z.string().uuid().optional(),
  requiresRatification: z.boolean().optional(),
  annualCost: z.string().optional(),
  implementationCost: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    fileType: z.string(),
    uploadedAt: z.string()
  })).optional(),
});

/**
 * GET /api/bargaining/tentative-agreements
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
      const ratified = searchParams.get("ratified");
      const clauseCategory = searchParams.get("clauseCategory");
      
      return withRLSContext(async (tx) => {
        // Verify negotiation
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
        const conditions = [eq(tentativeAgreements.negotiationId, negotiationId)];
        
        if (ratified !== null) {
          conditions.push(eq(tentativeAgreements.ratified, ratified === 'true'));
        }
        
        if (clauseCategory) {
          conditions.push(eq(tentativeAgreements.clauseCategory, clauseCategory));
        }
        
        // Fetch agreements
        const agreementsList = await tx
          .select()
          .from(tentativeAgreements)
          .where(and(...conditions))
          .orderBy(desc(tentativeAgreements.agreedDate));
        
        return NextResponse.json({
          agreements: agreementsList,
          summary: {
            total: agreementsList.length,
            ratified: agreementsList.filter(a => a.ratified).length,
            pending: agreementsList.filter(a => !a.ratified && a.requiresRatification).length,
          }
        });
      });
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to fetch tentative agreements',
        error
      );
    }
  })(request);
};

/**
 * POST /api/bargaining/tentative-agreements
 */
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId, organizationId } = context;
    
    try {
      const body = await request.json();
      const validatedData = createTentativeAgreementSchema.parse(body);
      
      return withRLSContext(async (tx) => {
        // Verify negotiation
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
        
        // Create tentative agreement
        const [newAgreement] = await tx
          .insert(tentativeAgreements)
          .values({
            ...validatedData,
            effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined,
            createdBy: userId,
            lastModifiedBy: userId,
          })
          .returning();
        
        return standardSuccessResponse(
          newAgreement,
          'Tentative agreement created successfully',
          201
        );
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid agreement data',
          error.errors
        );
      }
      
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create tentative agreement',
        error
      );
    }
  })(request);
};
