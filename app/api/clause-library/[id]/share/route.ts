import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Share Settings
 * Route: /api/clause-library/[id]/share
 * Methods: PATCH
 */

import { NextRequest, NextResponse } from "next/server";
import { db, organizations } from "@/db";
import { sharedClauseLibrary } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { withRLSContext } from "@/lib/db/with-rls-context";

// PATCH /api/clause-library/[id]/share - Update sharing settings
export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const clauseId = params.id;

      // Validate organization context
      if (!organizationId) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      const userOrgId = organizationId;

      // Fetch existing clause
      const existingClause = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.sharedClauseLibrary.findFirst({
          where: (c, { eq }) => eq(c.id, clauseId),
        });
      });

      if (!existingClause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      // Only owner can update sharing settings
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return NextResponse.json({ error: "Only the owner can update sharing settings" }, { status: 403 });
      }

      const body = await request.json();
      const { 
        sharingLevel, 
        sharedWithOrgIds, 
        isAnonymized,
        anonymizedEmployerName 
      } = body;

      // Validate sharing level
      const validLevels = ["private", "federation", "congress", "public"];
      if (sharingLevel && !validLevels.includes(sharingLevel)) {
        return NextResponse.json(
          { error: `Invalid sharing level. Must be one of: ${validLevels.join(", ")}` },
          { status: 400 }
        );
      }

      // Build update object
      const updates: any = {
        updatedAt: new Date(),
      };

      if (sharingLevel !== undefined) {
        updates.sharingLevel = sharingLevel;
      }

      if (sharedWithOrgIds !== undefined) {
        updates.sharedWithOrgIds = sharedWithOrgIds;
      }

      if (isAnonymized !== undefined) {
        updates.isAnonymized = isAnonymized;
      }

      if (anonymizedEmployerName !== undefined) {
        updates.anonymizedEmployerName = anonymizedEmployerName;
      }

      // Update clause
      const [updatedClause] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(sharedClauseLibrary)
          .set(updates)
          .where(eq(sharedClauseLibrary.id, clauseId))
          .returning();
      });

      return NextResponse.json({
        success: true,
        clause: updatedClause,
        message: "Sharing settings updated successfully",
      });

    } catch (error) {
      logger.error('Error updating sharing settings', error as Error, {
        clauseId: params.id,
        userId,
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to update sharing settings" },
        { status: 500 }
      );
    }
    })(request, { params });
};
