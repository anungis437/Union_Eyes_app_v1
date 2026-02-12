/**
 * Claims Workflow History API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { claimUpdates, claims, profilesTable } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

    const resolvedParams = await params;
    const claimNumber = resolvedParams.id;

    // All database operations wrapped in withRLSContext - RLS policies handle organization isolation
    return withRLSContext(async (tx) => {
      // Get claim with member info - RLS policies automatically enforce organization filtering
      const claim = await tx
        .select({
          id: claims.claimId,
          organizationId: claims.organizationId,
          memberId: claims.memberId,
          assignedTo: claims.assignedTo,
        })
        .from(claims)
        .where(eq(claims.claimNumber, claimNumber))
        .limit(1);

      if (claim.length === 0) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Claim not found'
    );
      }

      const claimData = claim[0];

      // Get member info to check ownership - RLS policies enforce access
      const member = await tx
        .select({ userId: profilesTable.userId })
        .from(profilesTable)
        .where(eq(profilesTable.userId, claimData.memberId))
        .limit(1);

      const isOwner = member.length > 0 && member[0].userId === userId;

      // Check if user is assigned steward
      let isSteward = false;
      if (claimData.assignedTo) {
        const steward = await tx
          .select({ userId: profilesTable.userId })
          .from(profilesTable)
          .where(eq(profilesTable.userId, claimData.assignedTo))
          .limit(1);

        isSteward = steward.length > 0 && steward[0].userId === userId;
      }

      // User must be owner or assigned steward
      if (!isOwner && !isSteward) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
      }

      // Get workflow history with user emails - RLS policies enforce organization isolation
      const historyRecords = await tx
        .select({
          id: claimUpdates.updateId,
          updateType: claimUpdates.updateType,
          message: claimUpdates.message,
          createdBy: claimUpdates.createdBy,
          createdAt: claimUpdates.createdAt,
          createdByEmail: profilesTable.email,
        })
        .from(claimUpdates)
        .leftJoin(
          profilesTable,
          eq(claimUpdates.createdBy, profilesTable.userId)
        )
        .where(eq(claimUpdates.claimId, claimData.id))
        .orderBy(desc(claimUpdates.createdAt));

      const history = historyRecords.map((record) => ({
        id: record.id,
        updateType: record.updateType,
        message: record.message,
        createdBy: record.createdBy,
        createdByEmail: record.createdByEmail || "Unknown",
        createdAt: record.createdAt,
      }));

      return NextResponse.json({
        history,
        totalEvents: history.length,
      });
    });
  })(request, { params });
};
