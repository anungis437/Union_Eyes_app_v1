import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Phase 5B: Shared Clause Library API - Single Clause
 * Route: /api/clause-library/[id]
 * Methods: GET, PATCH, DELETE
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, organizations } from "@/db";
import { 
  sharedClauseLibrary,
  crossOrgAccessLog,
  NewCrossOrgAccessLog
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

// Helper to log cross-org access
async function logCrossOrgAccess(
  userId: string,
  userOrgId: string,
  resourceType: string,
  resourceId: string,
  resourceOwnerOrgId: string,
  accessType: string,
  sharingLevel: string,
  wasGrantExplicit: boolean,
  request: NextRequest
) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const logEntry: NewCrossOrgAccessLog = {
      userId,
      userOrganizationId: userOrgId,
      resourceType,
      resourceId,
      resourceOwnerOrgId,
      accessType,
      sharingLevel,
      wasGrantExplicit,
      ipAddress,
      userAgent,
    };

    await db.insert(crossOrgAccessLog).values(logEntry);
  } catch (error) {
    logger.warn('Failed to log cross-org access', { error: error instanceof Error ? error.message : String(error) });
    // Don't fail the request if logging fails
  }
}

// GET /api/clause-library/[id] - Get single clause
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId } = context;

  try {
      const clauseId = params.id;

      // Get user's organization from cookie (set by organization switcher)
      const cookieStore = await cookies();
      const orgSlug = cookieStore.get('active-organization')?.value;

      if (!orgSlug) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      // Convert slug to UUID
      const orgResult = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (orgResult.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

      const userOrgId = orgResult[0].id;
      // TODO: Add hierarchyPath once tenant hierarchy is implemented
      const userOrgHierarchyPath = '';

      // Fetch clause using explicit select to avoid automatic joins
      const clause = await db.query.sharedClauseLibrary.findFirst({
        where: (c, { eq }) => eq(c.id, clauseId),
        with: {
          tags: true, // Tags don't cause issues
          sourceOrganization: {
            columns: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
      });

      if (!clause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      // Check access permissions
      const isOwner = clause.sourceOrganizationId === userOrgId;
      let hasAccess = isOwner;
      let wasGrantExplicit = false;

      if (!isOwner) {
        const sharingLevel = clause.sharingLevel;
        // TODO: Implement hierarchy-based access control when tenant hierarchy is ready

        switch (sharingLevel) {
          case "private":
            hasAccess = clause.sharedWithOrgIds?.includes(userOrgId) || false;
            wasGrantExplicit = hasAccess;
            break;
          
          case "federation":
            // TODO: Check federation hierarchy when implemented
            // Temporarily allow access until hierarchy is built
            hasAccess = true;
            break;
          
          case "congress":
            // TODO: Check CLC membership when implemented
            // Temporarily allow access until hierarchy is built
            hasAccess = true;
            break;
          
          case "public":
            hasAccess = true;
            break;
        }

        // Log cross-org access
        if (hasAccess) {
          await logCrossOrgAccess( userId,
            userOrgId,
            "clause",
            clauseId,
            clause.sourceOrganizationId,
            "view",
            sharingLevel,
            wasGrantExplicit,
            request
          );

          // Increment view count
          await db
            .update(sharedClauseLibrary)
            .set({
              viewCount: (clause.viewCount ?? 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(sharedClauseLibrary.id, clauseId));
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Return clause with isOwner flag
      return NextResponse.json({
        ...clause,
        isOwner,
      });

    } catch (error) {
      logger.error('Error fetching clause', error as Error, {
        clauseId: params.id,
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to fetch clause" },
        { status: 500 }
      );
    }
    })(request, { params });
};

// PATCH /api/clause-library/[id] - Update clause
export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId } = context;

  try {
      const clauseId = params.id;

      // Get user's organization from cookie (set by organization switcher)
      const cookieStore = await cookies();
      const orgSlug = cookieStore.get('active-organization')?.value;

      if (!orgSlug) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      // Convert slug to UUID
      const orgResult = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (orgResult.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

      const userOrgId = orgResult[0].id;

      // Fetch existing clause
      const existingClause = await db.query.sharedClauseLibrary.findFirst({
        where: (c, { eq }) => eq(c.id, clauseId),
      });

      if (!existingClause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      // Only owner can update
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return NextResponse.json({ error: "Only the owner can update this clause" }, { status: 403 });
      }

      const body = await request.json();

      const {
        clauseTitle,
        clauseText,
        clauseType,
        isAnonymized,
        originalEmployerName,
        anonymizedEmployerName,
        sharingLevel,
        sharedWithOrgIds,
        effectiveDate,
        expiryDate,
        sector,
        province,
      } = body;

      // Build update object (only include provided fields)
      const updates: any = {
        updatedAt: new Date(),
      };

      if (clauseTitle !== undefined) updates.clauseTitle = clauseTitle;
      if (clauseText !== undefined) updates.clauseText = clauseText;
      if (clauseType !== undefined) updates.clauseType = clauseType;
      if (isAnonymized !== undefined) updates.isAnonymized = isAnonymized;
      if (originalEmployerName !== undefined) updates.originalEmployerName = originalEmployerName;
      if (anonymizedEmployerName !== undefined) updates.anonymizedEmployerName = anonymizedEmployerName;
      if (sharingLevel !== undefined) updates.sharingLevel = sharingLevel;
      if (sharedWithOrgIds !== undefined) updates.sharedWithOrgIds = sharedWithOrgIds;
      if (effectiveDate !== undefined) updates.effectiveDate = effectiveDate ? new Date(effectiveDate) : null;
      if (expiryDate !== undefined) updates.expiryDate = expiryDate ? new Date(expiryDate) : null;
      if (sector !== undefined) updates.sector = sector;
      if (province !== undefined) updates.province = province;

      // Update clause
      const [updatedClause] = await db
        .update(sharedClauseLibrary)
        .set(updates)
        .where(eq(sharedClauseLibrary.id, clauseId))
        .returning();

      // Fetch full clause with relations
      const fullClause = await db.query.sharedClauseLibrary.findFirst({
        where: (c, { eq }) => eq(c.id, clauseId),
        with: {
          sourceOrganization: true,
          tags: true,
        },
      });

      return NextResponse.json(fullClause);

    } catch (error) {
      logger.error('Error updating clause', error as Error, {
        clauseId: params.id,
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to update clause" },
        { status: 500 }
      );
    }
    })(request, { params });
};

// DELETE /api/clause-library/[id] - Delete clause
export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId } = context;

  try {
      const clauseId = params.id;

      // Get user's organization from cookie (set by organization switcher)
      const cookieStore = await cookies();
      const orgSlug = cookieStore.get('active-organization')?.value;

      if (!orgSlug) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
      }

      // Convert slug to UUID
      const orgResult = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .limit(1);

      if (orgResult.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

      const userOrgId = orgResult[0].id;

      // Fetch existing clause
      const existingClause = await db.query.sharedClauseLibrary.findFirst({
        where: (c, { eq }) => eq(c.id, clauseId),
      });

      if (!existingClause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      // Only owner can delete
      if (existingClause.sourceOrganizationId !== userOrgId) {
        return NextResponse.json({ error: "Only the owner can delete this clause" }, { status: 403 });
      }

      // Delete clause (cascade will delete tags)
      await db
        .delete(sharedClauseLibrary)
        .where(eq(sharedClauseLibrary.id, clauseId));

      return NextResponse.json({ success: true, message: "Clause deleted" });

    } catch (error) {
      logger.error('Error deleting clause', error as Error, {
        clauseId: params.id,
        correlationId: request.headers.get('x-correlation-id')
      });
      return NextResponse.json(
        { error: "Failed to delete clause" },
        { status: 500 }
      );
    }
    })(request, { params });
};
