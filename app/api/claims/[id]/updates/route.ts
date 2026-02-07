import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { claimUpdates } from "@/db/schema/claims-schema";
import { desc, eq } from "drizzle-orm";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * GET /api/claims/[id]/updates
 * Fetch all updates for a specific claim
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  const resolvedParams = await params;
      const claimId = resolvedParams.id;

      // Fetch updates
      const updates = await db
        .select()
        .from(claimUpdates)
        .where(eq(claimUpdates.claimId, claimId))
        .orderBy(desc(claimUpdates.createdAt));

      return NextResponse.json({ updates });
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
    const user = { id: context.userId, organizationId: context.organizationId };

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

      // Insert new update
      const [newUpdate] = await db
        .insert(claimUpdates)
        .values({
          claimId,
          updateType: body.updateType,
          message: body.message,
          createdBy: user.id,
          isInternal: body.isInternal || false,
          metadata: body.metadata || {},
        })
        .returning();

      return NextResponse.json({
        update: newUpdate,
        message: "Update added successfully",
      }, { status: 201 });
  })(request, { params });
};
