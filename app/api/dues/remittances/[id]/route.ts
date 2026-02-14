/**
 * Individual Remittance API
 * 
 * Manages specific remittance operations (process, reconcile, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { 
  employerRemittances, 
  remittanceLineItems,
  remittanceExceptions 
} from '@/db/schema/dues-finance-schema';
import { eq } from 'drizzle-orm';
import { requireUserForOrganization } from '@/lib/api-auth-guard';

/**
 * GET /api/dues/remittances/[id]
 * Get remittance details with line items and exceptions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [remittance] = await db
      .select()
      .from(employerRemittances)
      .where(eq(employerRemittances.id, id));

    if (!remittance) {
      return NextResponse.json(
        { error: 'Remittance not found' },
        { status: 404 }
      );
    }

    // Get line items
    const lineItems = await db
      .select()
      .from(remittanceLineItems)
      .where(eq(remittanceLineItems.remittanceId, id));

    // Get exceptions
    const exceptions = await db
      .select()
      .from(remittanceExceptions)
      .where(eq(remittanceExceptions.remittanceId, id));

    return NextResponse.json({
      remittance,
      lineItems,
      exceptions,
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching remittance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remittance', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dues/remittances/[id]
 * Update remittance status or reconcile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const [existingRemittance] = await db
      .select({ organizationId: employerRemittances.organizationId })
      .from(employerRemittances)
      .where(eq(employerRemittances.id, id));

    if (!existingRemittance) {
      return NextResponse.json(
        { error: 'Remittance not found' },
        { status: 404 }
      );
    }

    const authContext = await requireUserForOrganization(existingRemittance.organizationId);

    const updateData = {
      updatedAt: new Date(),
      lastModifiedBy: authContext.userId,
    };

    if (body.processingStatus) {
      updateData.processingStatus = body.processingStatus;
      if (body.processingStatus === 'completed') {
        updateData.processedAt = new Date();
        updateData.processedBy = authContext.userId;
      }
    }

    if (body.isReconciled !== undefined) {
      updateData.isReconciled = body.isReconciled;
      if (body.isReconciled) {
        updateData.reconciledAt = new Date();
        updateData.reconciledBy = authContext.userId;
      }
    }

    if (body.notes) {
      updateData.notes = body.notes;
    }

    const [updatedRemittance] = await db
      .update(employerRemittances)
      .set(updateData)
      .where(eq(employerRemittances.id, id))
      .returning();

    if (!updatedRemittance) {
      return NextResponse.json(
        { error: 'Remittance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Remittance updated successfully',
      remittance: updatedRemittance,
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
    console.error('Error updating remittance:', error);
    return NextResponse.json(
      { error: 'Failed to update remittance', details: error.message },
      { status: 500 }
    );
  }
}
