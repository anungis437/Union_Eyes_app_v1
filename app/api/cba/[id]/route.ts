/**
 * CBA Detail API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { collectiveAgreements, cbaClause, cbaContacts, cbaVersionHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { id } = params;

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Fetch CBA
        const [cba] = await tx
          .select()
          .from(collectiveAgreements)
          .where(eq(collectiveAgreements.id, id))
          .limit(1);

        if (!cba) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'CBA not found'
    );
        }

        // Fetch all clauses for this CBA
        const clauses = await tx
          .select()
          .from(cbaClause)
          .where(eq(cbaClause.cbaId, id))
          .orderBy(cbaClause.orderIndex, desc(cbaClause.clauseNumber));

        // Fetch contacts
        const contacts = await tx
          .select()
          .from(cbaContacts)
          .where(eq(cbaContacts.cbaId, id));

        // Fetch version history
        const versionHistory = await tx
          .select()
          .from(cbaVersionHistory)
          .where(eq(cbaVersionHistory.cbaId, id))
          .orderBy(desc(cbaVersionHistory.createdAt));

        return NextResponse.json({
          cba,
          clauses,
          contacts,
          versionHistory,
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

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { id } = params;
      const body = await request.json();

      // Update CBA using RLS-protected transaction
      return withRLSContext(async (tx) => {
        const [updatedCba] = await tx
          .update(collectiveAgreements)
          .set({
            ...body,
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(collectiveAgreements.id, id))
          .returning();

        if (!updatedCba) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'CBA not found'
    );
        }

        return NextResponse.json(updatedCba);
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

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { id } = params;

      // Delete CBA using RLS-protected transaction (cascade will handle related records)
      return withRLSContext(async (tx) => {
        const [deletedCba] = await tx
          .delete(collectiveAgreements)
          .where(eq(collectiveAgreements.id, id))
          .returning();

        if (!deletedCba) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'CBA not found'
    );
        }

        return NextResponse.json({ success: true, deletedId: id });
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
