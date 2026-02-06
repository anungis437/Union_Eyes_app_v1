/**
 * Phase 5B: Shared Clause Library API - Tags
 * Route: /api/clause-library/[id]/tags
 * Methods: POST, DELETE
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, organizations } from "@/db";
import { clauseLibraryTags, sharedClauseLibrary } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { logger } from '@/lib/logger';

// POST /api/clause-library/[id]/tags - Add tag
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  
  try {
    const auth_result = await auth();
    userId = auth_result.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const existingTag = await db.query.clauseLibraryTags.findFirst({
      where: (t, { and, eq }) => 
        and(
          eq(t.clauseId, clauseId),
          eq(t.tagName, trimmedTag)
        ),
    });

    if (existingTag) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }

    // Add tag
    const [newTag] = await db
      .insert(clauseLibraryTags)
      .values({
        clauseId,
        tagName: trimmedTag,
        createdBy: userId,
      })
      .returning();

    // Update clause updated_at
    await db
      .update(sharedClauseLibrary)
      .set({ updatedAt: new Date() })
      .where(eq(sharedClauseLibrary.id, clauseId));

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
}

// DELETE /api/clause-library/[id]/tags - Remove tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  
  try {
    const auth_result = await auth();
    userId = auth_result.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    await db
      .delete(clauseLibraryTags)
      .where(
        and(
          eq(clauseLibraryTags.clauseId, clauseId),
          eq(clauseLibraryTags.tagName, tagName.trim())
        )
      );

    // Update clause updated_at
    await db
      .update(sharedClauseLibrary)
      .set({ updatedAt: new Date() })
      .where(eq(sharedClauseLibrary.id, clauseId));

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
}
