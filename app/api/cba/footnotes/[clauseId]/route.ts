/**
 * CBA Footnotes API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { cbaFootnotes, cbaClause, arbitrationDecisions } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { clauseId: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { clauseId } = params;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Get outgoing footnotes (this clause references others)
        const outgoingFootnotes = await tx
          .select({
            footnote: cbaFootnotes,
            targetClause: cbaClause,
            targetDecision: arbitrationDecisions,
          })
          .from(cbaFootnotes)
          .leftJoin(cbaClause, eq(cbaFootnotes.targetClauseId, cbaClause.id))
          .leftJoin(arbitrationDecisions, eq(cbaFootnotes.targetDecisionId, arbitrationDecisions.id))
          .where(eq(cbaFootnotes.sourceClauseId, clauseId));

        // Get incoming footnotes (other clauses reference this one)
        const incomingFootnotes = await tx
          .select({
            footnote: cbaFootnotes,
            sourceClause: cbaClause,
          })
          .from(cbaFootnotes)
          .leftJoin(cbaClause, eq(cbaFootnotes.sourceClauseId, cbaClause.id))
          .where(eq(cbaFootnotes.targetClauseId, clauseId));

        return NextResponse.json({
          outgoing: outgoingFootnotes,
          incoming: incomingFootnotes,
        });
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};


const cbaFootnotesSchema = z.object({
  targetClauseId: z.string().uuid('Invalid targetClauseId'),
  targetDecisionId: z.string().uuid('Invalid targetDecisionId'),
  footnoteText: z.unknown().optional(),
  linkType: z.unknown().optional(),
  footnoteNumber: z.unknown().optional(),
  context: z.unknown().optional(),
  startOffset: z.unknown().optional(),
  endOffset: z.unknown().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { clauseId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { clauseId } = params;
      const body = await request.json();
    // Validate request body
    const validation = cbaFootnotesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { targetClauseId, targetDecisionId, footnoteText, linkType, footnoteNumber, context, startOffset, endOffset } = validation.data;

      const { 
        targetClauseId, 
        targetDecisionId, 
        footnoteText, 
        linkType,
        footnoteNumber,
        context: noteContext,
        startOffset,
        endOffset,
      } = body;

      // Validate that at least one target is provided
      if (!targetClauseId && !targetDecisionId) {
        return NextResponse.json(
          { error: "Either targetClauseId or targetDecisionId must be provided" },
          { status: 400 }
        );
      }

      // Create footnote using RLS-protected transaction
      return withRLSContext(async (tx) => {
        const [footnote] = await tx
          .insert(cbaFootnotes)
          .values({
            sourceClauseId: clauseId,
            targetClauseId,
            targetDecisionId,
            footnoteText,
            linkType,
            footnoteNumber,
            context: noteContext,
            startOffset,
            endOffset,
            createdBy: userId,
            createdAt: new Date(),
          })
          .returning();

        return NextResponse.json(footnote);
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { clauseId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      const footnoteId = searchParams.get("footnoteId");

      if (!footnoteId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Footnote ID required'
    );
      }

      // Increment click count
      await db
        .update(cbaFootnotes)
        .set({
          clickCount: sql`${cbaFootnotes.clickCount} + 1`,
        })
        .where(eq(cbaFootnotes.id, footnoteId));

      return NextResponse.json({ success: true });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};
