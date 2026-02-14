/**
 * Individual Steward Assignment API
 * 
 * Manages specific steward assignment operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { stewardAssignments } from '@/db/schema/union-structure-schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

// Validation schema for updating steward assignment
const updateStewardSchema = z.object({
  stewardType: z.enum(['steward', 'chief_steward', 'rep', 'officer']).optional(),
  isPrimary: z.boolean().optional(),
  coverageArea: z.string().optional(),
  memberCount: z.number().int().optional(),
  effectiveTo: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'resigned', 'removed']).optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  availabilityNotes: z.string().optional(),
  trainingCompletedDate: z.string().optional(),
  certificationExpiryDate: z.string().optional(),
});

/**
 * GET /api/stewards/[id]
 * Get steward assignment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [steward] = await db
      .select()
      .from(stewardAssignments)
      .where(eq(stewardAssignments.id, id));

    if (!steward) {
      return NextResponse.json(
        { error: 'Steward assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ steward });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steward assignment', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stewards/[id]
 * Update steward assignment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = updateStewardSchema.parse(body);
    const authContext = await requireUser();

    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
      lastModifiedBy: authContext.userId,
    };

    if (validatedData.effectiveTo) {
      updateData.effectiveTo = new Date(validatedData.effectiveTo);
    }
    if (validatedData.trainingCompletedDate) {
      updateData.trainingCompletedDate = new Date(validatedData.trainingCompletedDate);
    }
    if (validatedData.certificationExpiryDate) {
      updateData.certificationExpiryDate = new Date(validatedData.certificationExpiryDate);
    }

    const [updatedSteward] = await db
      .update(stewardAssignments)
      .set(updateData)
      .where(eq(stewardAssignments.id, id))
      .returning();

    if (!updatedSteward) {
      return NextResponse.json(
        { error: 'Steward assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Steward assignment updated successfully',
      steward: updatedSteward,
    });
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error updating steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update steward assignment', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stewards/[id]
 * End steward assignment (set effectiveTo to now)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authContext = await requireUser();

    const [deletedSteward] = await db
      .update(stewardAssignments)
      .set({
        effectiveTo: new Date(),
        status: 'resigned',
        updatedAt: new Date(),
        lastModifiedBy: authContext.userId,
      })
      .where(eq(stewardAssignments.id, id))
      .returning();

    if (!deletedSteward) {
      return NextResponse.json(
        { error: 'Steward assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Steward assignment ended successfully',
      steward: deletedSteward,
    });
  } catch (error: Record<string, unknown>) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    logger.error('Error ending steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to end steward assignment', details: error.message },
      { status: 500 }
    );
  }
}
