import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { perCapitaInvoices, members } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member to verify tenant
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { paidDate, paymentReference, paymentMethod } = body;

    // Get invoice
    const [invoice] = await db
      .select()
      .from(perCapitaInvoices)
      .where(eq(perCapitaInvoices.id, params.id))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.tenantId !== member.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update invoice
    await db
      .update(perCapitaInvoices)
      .set({
        paymentStatus: 'paid',
        paidDate: paidDate || new Date().toISOString().split('T')[0],
        paymentReference,
        paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(perCapitaInvoices.id, params.id));

    return NextResponse.json({
      success: true,
      message: 'Invoice marked as paid',
    });

  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json(
      { error: 'Failed to mark invoice as paid' },
      { status: 500 }
    );
  }
}
