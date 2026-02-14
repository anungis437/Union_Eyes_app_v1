/**
 * Individual Field Note API
 * 
 * Endpoints:
 * - GET /api/organizing/notes/[id] - Get note details
 * - PUT /api/organizing/notes/[id] - Update note
 * - DELETE /api/organizing/notes/[id] - Delete note
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { fieldNotes } from '@/db/schema';
import { organizationMembers } from '@/db/schema-organizations';
import { and, or, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/organizing/notes/[id]
 * Get field note details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const note = await db
      .select()
      .from(fieldNotes)
      .where(
        and(
          eq(fieldNotes.id, params.id),
          eq(fieldNotes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (note.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Privacy check: users can only see their own private notes
    if (note[0].isPrivate && note[0].authorId !== userId) {
      return NextResponse.json({ error: 'Access denied: private note' }, { status: 403 });
    }

    // Confidentiality check: only admins, stewards, and officers can access confidential notes
    if (note[0].isConfidential && note[0].authorId !== userId) {
      const [membership] = await db
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.status, 'active')
          )
        )
        .limit(1);
      
      const hasConfidentialAccess = membership && ['admin', 'steward', 'officer'].includes(membership.role);
      
      if (!hasConfidentialAccess) {
        return NextResponse.json({ error: 'Access denied: confidential note' }, { status: 403 });
      }
    }

    return NextResponse.json(note[0]);
  } catch (error) {
    logger.error('[API] Error fetching field note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field note' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizing/notes/[id]
 * Update field note
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const body = await request.json();

    // Verify note exists and user has permission to edit
    const existing = await db
      .select()
      .from(fieldNotes)
      .where(
        and(
          eq(fieldNotes.id, params.id),
          eq(fieldNotes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Authorization: only author can edit their own notes
    // TODO: Add admin override
    if (existing[0].authorId !== userId) {
      return NextResponse.json({ error: 'Only the author can edit this note' }, { status: 403 });
    }

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    };

    if (body.memberId !== undefined) updateData.memberId = body.memberId;
    if (body.noteType !== undefined) updateData.noteType = body.noteType;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.sentiment !== undefined) updateData.sentiment = body.sentiment;
    if (body.engagementLevel !== undefined) updateData.engagementLevel = body.engagementLevel;
    if (body.followUpDate !== undefined) updateData.followUpDate = body.followUpDate;
    if (body.followUpCompleted !== undefined) {
      updateData.followUpCompleted = body.followUpCompleted;
      if (body.followUpCompleted === true) {
        updateData.followUpCompletedAt = new Date();
      }
    }
    if (body.relatedCaseId !== undefined) updateData.relatedCaseId = body.relatedCaseId;
    if (body.relatedGrievanceId !== undefined) updateData.relatedGrievanceId = body.relatedGrievanceId;
    if (body.interactionDate !== undefined) updateData.interactionDate = body.interactionDate;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate;
    if (body.isConfidential !== undefined) updateData.isConfidential = body.isConfidential;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Update note
    const [updated] = await db
      .update(fieldNotes)
      .set(updateData)
      .where(
        and(
          eq(fieldNotes.id, params.id),
          eq(fieldNotes.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('[API] Error updating field note:', error);
    return NextResponse.json(
      { error: 'Failed to update field note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizing/notes/[id]
 * Delete field note (hard delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    // Verify note exists and user has permission
    const existing = await db
      .select()
      .from(fieldNotes)
      .where(
        and(
          eq(fieldNotes.id, params.id),
          eq(fieldNotes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Authorization: only author can delete
    // TODO: Add admin override
    if (existing[0].authorId !== userId) {
      return NextResponse.json({ error: 'Only the author can delete this note' }, { status: 403 });
    }

    // Hard delete (field notes are typically safe to delete)
    await db
      .delete(fieldNotes)
      .where(
        and(
          eq(fieldNotes.id, params.id),
          eq(fieldNotes.organizationId, organizationId)
        )
      );

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    logger.error('[API] Error deleting field note:', error);
    return NextResponse.json(
      { error: 'Failed to delete field note' },
      { status: 500 }
    );
  }
}
