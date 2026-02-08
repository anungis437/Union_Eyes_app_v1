/**
 * Claims Updates API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { NextRequest, NextResponse } from "next/server";
import { claimUpdates } from "@/db/schema/claims-schema";
import { desc, eq } from "drizzle-orm";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { withRLSContext } from '@/lib/db/with-rls-context';

/**
 * GET /api/claims/[id]/updates
 * Fetch all updates for a specific claim
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

    const resolvedParams = await params;
    const claimId = resolvedParams.id;

    // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
    return withRLSContext(async (tx) => {
      // Fetch updates - RLS policies automatically enforce tenant filtering
      const updates = await tx
        .select()
        .from(claimUpdates)
        .where(eq(claimUpdates.claimId, claimId))
        .orderBy(desc(claimUpdates.createdAt));

      return NextResponse.json({ updates });
    });
  })(request, { params });
};

/**
 * POST /api/claims/[id]/updates
 * Add a new update to a claim
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    const resolvedParams = await params;
    const claimId = resolvedParams.id;
    const body = await request.json();

    // Validate required fields
    if (!body.updateType || !body.message) {
      return NextResponse.json(
        { error: "Update type and message are required" },
        { status: 400 }
      );
    }

    // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
    return withRLSContext(async (tx) => {
      // Insert new update - RLS policies enforce tenant isolation
      const [newUpdate] = await tx
        .insert(claimUpdates)
        .values({
          claimId,
          updateType: body.updateType,
          message: body.message,
          createdBy: userId,
          isInternal: body.isInternal || false,
          metadata: body.metadata || {},
        })
        .returning();

      return NextResponse.json({
        update: newUpdate,
        message: "Update added successfully",
      }, { status: 201 });
    });
  })(request, { params });
};
