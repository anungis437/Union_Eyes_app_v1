/**
 * CLC Per-Capita Remittance Submission API
 * Purpose: Mark remittance as submitted with file upload/reference
 * 
 * Endpoint:
 * - POST /api/admin/clc/remittances/[id]/submit - Submit remittance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { perCapitaRemittances } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// =====================================================================================
// POST - Submit remittance
// =====================================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set session context for RLS
    await db.execute(sql`SET app.current_user_id = ${userId}`);

    const remittanceId = params.id;
    const body = await request.json();

    // Validate remittance exists
    const [existing] = await db
      .select()
      .from(perCapitaRemittances)
      .where(eq(perCapitaRemittances.id, remittanceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Remittance not found' },
        { status: 404 }
      );
    }

    // Validate current status
    if (existing.status === 'paid') {
      return NextResponse.json(
        { error: 'Remittance already paid' },
        { status: 400 }
      );
    }

    if (existing.status === 'submitted') {
      return NextResponse.json(
        { error: 'Remittance already submitted' },
        { status: 400 }
      );
    }

    // Update remittance status to submitted
    const [updated] = await db
      .update(perCapitaRemittances)
      .set({
        status: 'submitted',
        submittedDate: new Date().toISOString(),
        notes: body.notes || existing.notes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(perCapitaRemittances.id, remittanceId))
      .returning();

    // TODO: If file upload is included in body, save to storage
    // This would integrate with your file storage system (S3, Azure Blob, etc.)
    // For now, we'll just store metadata in notes field

    return NextResponse.json({
      ...updated,
      message: 'Remittance submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting remittance:', error);
    return NextResponse.json(
      { error: 'Failed to submit remittance' },
      { status: 500 }
    );
  }
}
