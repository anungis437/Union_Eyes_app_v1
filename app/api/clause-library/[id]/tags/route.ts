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

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// POST /api/clause-library/[id]/tags - Add tag

const clauseLibraryTagsSchema = z.object({
  tagName: z.string().min(1, 'tagName is required'),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const clauseId = params.id;

      // Validate organization context
      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'No active organization'
    );
      }

      const userOrgId = organizationId;

      // Fetch existing clause
      const existingClause = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.sharedClauseLibrary.findFirst({
          where: (c, { eq }) => eq(c.id, clauseId),
        });
      });

      if (!existingClause) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Clause not found'
    );
      }

      // Only owner can add tags
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the owner can add tags'
    );
      }

      const body = await request.json();
    // Validate request body
    const validation = clause-libraryTagsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { tagName } = validation.data;
      const { tagName } = body;

      if (!tagName || typeof tagName !== "string") {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tag name is required'
    );
      }

      const trimmedTag = tagName.trim();
      if (trimmedTag.length === 0) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Tag name cannot be empty'
        );
      }

      if (trimmedTag.length > 100) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Tag name cannot exceed 100 characters'
        );
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
        return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Tag already exists'
    );
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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to add tag',
      error
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
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'No active organization'
    );
      }

      const userOrgId = organizationId;

      // Fetch existing clause
      const existingClause = await withRLSContext({ organizationId: userOrgId }, async (db) => {
        return await db.query.sharedClauseLibrary.findFirst({
          where: (c, { eq }) => eq(c.id, clauseId),
        });
      });

      if (!existingClause) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Clause not found'
    );
      }

      // Only owner can remove tags
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the owner can remove tags'
    );
      }

      const body = await request.json();
      const { tagName } = body;

      if (!tagName || typeof tagName !== "string") {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Tag name is required'
    );
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
      return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to remove tag',
      error
    );
    }
    })(request, { params });
};
