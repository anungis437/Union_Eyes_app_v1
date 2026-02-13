/**
 * Individual Local API
 * 
 * Manages specific local operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { locals } from '@/db/schema/union-structure-schema';
import { eq } from 'drizzle-orm';

// Validation schema for updating local
const updateLocalSchema = z.object({
  localNumber: z.string().optional(),
  name: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  presidentUserId: z.string().uuid().optional(),
  secretaryUserId: z.string().uuid().optional(),
  treasurerUserId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'merged', 'dissolved']).optional(),
  charterDate: z.string().optional(),
});

/**
 * GET /api/locals/[id]
 * Get local details with statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [local] = await db
      .select()
      .from(locals)
      .where(eq(locals.id, id));

    if (!local) {
      return NextResponse.json(
        { error: 'Local not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ local });
  } catch (error: any) {
    console.error('Error fetching local:', error);
    return NextResponse.json(
      { error: 'Failed to fetch local', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/locals/[id]
 * Update local
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = updateLocalSchema.parse(body);

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
      lastModifiedBy: 'system', // TODO: Get from auth
    };

    if (validatedData.charterDate) {
      updateData.charterDate = new Date(validatedData.charterDate);
    }

    const [updatedLocal] = await db
      .update(locals)
      .set(updateData)
      .where(eq(locals.id, id))
      .returning();

    if (!updatedLocal) {
      return NextResponse.json(
        { error: 'Local not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Local updated successfully',
      local: updatedLocal,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating local:', error);
    return NextResponse.json(
      { error: 'Failed to update local', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locals/[id]
 * Delete local (soft delete by setting status to inactive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Soft delete by setting status to inactive
    const [deletedLocal] = await db
      .update(locals)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
        lastModifiedBy: 'system', // TODO: Get from auth
      })
      .where(eq(locals.id, id))
      .returning();

    if (!deletedLocal) {
      return NextResponse.json(
        { error: 'Local not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Local deactivated successfully',
      local: deletedLocal,
    });
  } catch (error: any) {
    console.error('Error deleting local:', error);
    return NextResponse.json(
      { error: 'Failed to delete local', details: error.message },
      { status: 500 }
    );
  }
}
