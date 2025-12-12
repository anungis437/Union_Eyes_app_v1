import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { perCapitaInvoices, members } from '@/services/financial-service/src/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
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
    const { parentUnionId, periodStart, periodEnd, perCapitaRate, dueDate } = body;

    // Validate required fields
    if (!periodStart || !periodEnd || !perCapitaRate) {
      return NextResponse.json({ 
        error: 'Missing required fields: periodStart, periodEnd, perCapitaRate' 
      }, { status: 400 });
    }

    // Count active members in the period
    const [memberCountResult] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(members)
      .where(
        and(
          eq(members.tenantId, member.tenantId),
          eq(members.status, 'active'),
          lte(members.unionJoinDate, periodEnd)
        )
      );

    const memberCount = memberCountResult.count;
    const totalAmount = memberCount * parseFloat(perCapitaRate);

    // Generate invoice number: PC-YYYY-MM-SEQ
    const year = new Date(periodStart).getFullYear();
    const month = String(new Date(periodStart).getMonth() + 1).padStart(2, '0');
    
    // Get next sequence number
    const [lastInvoice] = await db
      .select()
      .from(perCapitaInvoices)
      .where(eq(perCapitaInvoices.tenantId, member.tenantId))
      .orderBy(sql`${perCapitaInvoices.invoiceNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/PC-\d{4}-\d{2}-(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    const invoiceNumber = `PC-${year}-${month}-${String(sequence).padStart(3, '0')}`;

    // Calculate due date (default 30 days from now)
    const calculatedDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice
    const [invoice] = await db.insert(perCapitaInvoices).values({
      tenantId: member.tenantId,
      parentUnionId,
      invoiceNumber,
      periodStart,
      periodEnd,
      memberCount: memberCount.toString(),
      perCapitaRate: perCapitaRate.toString(),
      totalAmount: totalAmount.toString(),
      paymentStatus: 'sent',
      dueDate: calculatedDueDate,
      createdBy: member.id,
    }).returning();

    return NextResponse.json({
      success: true,
      invoice,
    });

  } catch (error) {
    console.error('Generate per capita invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
