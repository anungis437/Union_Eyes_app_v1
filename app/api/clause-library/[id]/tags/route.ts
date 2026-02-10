import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Tags
 * Route: /api/clause-library/[id]/tags
 * Methods: POST, DELETE
 */

import { NextRequest, NextResponse } from "next/server";
import { db, organizations } from "@/db";
import { clauseLibraryTags, sharedClauseLibrary } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

// POST /api/clause-library/[id]/tags - Add tag
export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
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

      // Only owner can add tags
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return NextResponse.json({ error: "Only the owner can add tags" }, { status: 403 });
      }

      const body = await request.json();
      const { tagName } = body;

      if (!tagName || typeof tagName !== "string") {
        return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
      }

      const trimmedTag = tagName.trim();
      if (trimmedTag.length === 0) {
        return NextResponse.json({ error: "Tag name cannot be empty" }, { status: 400 });
      }

      if (trimmedTag.length > 100) {
        return NextResponse.json({ error: "Tag name cannot exceed 100 characters" }, { status: 400 });
      }

      // Check if tag already exists
      const existingTag = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.clauseLibraryTags.findFirst({
          where: (t, { and, eq }) => 
            and(
              eq(t.clauseId, clauseId),
              eq(t.tagName, trimmedTag)
            ),
        });
      });

      if (existingTag) {
        return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
      }

      // Add tag
      const [newTag] = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .insert(clauseLibraryTags)
          .values({
            clauseId,
            tagName: trimmedTag,
            createdBy: userId,
          })
          .returning();
      });

      // Update clause updated_at
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(sharedClauseLibrary)
          .set({ updatedAt: new Date() })
          .where(eq(sharedClauseLibrary.id, clauseId));
      });

      return NextResponse.json(newTag, { status: 201 });

    } catch (error) {
      logger.error('Error adding tag', error as Error, {
        clauseId: params.id,
        userId,
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to add tag" },
        { status: 500 }
      );
    }
    })(request, { params });
};

// DELETE /api/clause-library/[id]/tags - Remove tag
export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
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

      // Only owner can remove tags
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return NextResponse.json({ error: "Only the owner can remove tags" }, { status: 403 });
      }

      const body = await request.json();
      const { tagName } = body;

      if (!tagName || typeof tagName !== "string") {
        return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
      }

      // Delete tag
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .delete(clauseLibraryTags)
          .where(
            and(
              eq(clauseLibraryTags.clauseId, clauseId),
              eq(clauseLibraryTags.tagName, tagName.trim())
            )
          );
      });

      // Update clause updated_at
      await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db
          .update(sharedClauseLibrary)
          .set({ updatedAt: new Date() })
          .where(eq(sharedClauseLibrary.id, clauseId));
      });

      return NextResponse.json({ 
        success: true, 
        message: "Tag removed successfully" 
      });

    } catch (error) {
      logger.error('Error removing tag', error as Error, {
        clauseId: params.id,
        userId,
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to remove tag" },
        { status: 500 }
      );
    }
    })(request, { params });
};
