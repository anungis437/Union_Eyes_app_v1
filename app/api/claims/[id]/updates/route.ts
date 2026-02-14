/**
 * Claims Updates API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from "next/server";
import { claimUpdates } from "@/db/schema/domains/claims";
import { desc } from "drizzle-orm";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
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

    // All database operations wrapped in withRLSContext - RLS policies handle organization isolation
    return withRLSContext(async (tx) => {
      // Fetch updates - RLS policies automatically enforce organization filtering
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

const claimsUpdatesSchema = z.object({
  updateType: z.string().datetime().optional(),
  message: z.unknown().optional(),
  isInternal: z.boolean().optional(),
  metadata: z.unknown().optional(),
});

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    const resolvedParams = await params;
    const claimId = resolvedParams.id;
    const body = await request.json();
    // Validate request body
    const validation = claimsUpdatesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { updateType, message, isInternal, metadata } = validation.data;

    // Validate required fields
    if (!body.updateType || !body.message) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Update type and message are required'
    );
    }

    // All database operations wrapped in withRLSContext - RLS policies handle organization isolation
    return withRLSContext(async (tx) => {
      // Insert new update - RLS policies enforce organization isolation
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

      return standardSuccessResponse(
      { 
        update: newUpdate,
        message: "Update added successfully",
       },
      undefined,
      201
    );
    });
  })(request, { params });
};
