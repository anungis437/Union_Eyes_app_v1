import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { perCapitaInvoices, members } from '@/services/financial-service/src/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

// List per capita invoices with filters
export async function GET(req: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const parentUnionId = searchParams.get('parentUnionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let whereConditions = [eq(perCapitaInvoices.tenantId, member.tenantId)];

    if (status) {
      whereConditions.push(eq(perCapitaInvoices.paymentStatus, status));
    }
    if (parentUnionId) {
      whereConditions.push(eq(perCapitaInvoices.parentUnionId, parentUnionId));
    }
    if (startDate) {
      whereConditions.push(gte(perCapitaInvoices.periodStart, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(perCapitaInvoices.periodEnd, endDate));
    }

    const invoices = await db
      .select()
      .from(perCapitaInvoices)
      .where(and(...whereConditions))
      .orderBy(desc(perCapitaInvoices.createdAt))
      .limit(limit);

    // Get summary statistics
    const [summary] = await db
      .select({
        totalInvoices: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`COALESCE(SUM(${perCapitaInvoices.totalAmount}), 0)`,
        paidAmount: sql<string>`COALESCE(SUM(CASE WHEN ${perCapitaInvoices.paymentStatus} = 'paid' THEN ${perCapitaInvoices.totalAmount} ELSE 0 END), 0)`,
        overdueAmount: sql<string>`COALESCE(SUM(CASE WHEN ${perCapitaInvoices.paymentStatus} = 'overdue' THEN ${perCapitaInvoices.totalAmount} ELSE 0 END), 0)`,
      })
      .from(perCapitaInvoices)
      .where(and(...whereConditions));

    return NextResponse.json({
      invoices,
      summary: {
        totalInvoices: summary.totalInvoices,
        totalAmount: parseFloat(summary.totalAmount || '0'),
        paidAmount: parseFloat(summary.paidAmount || '0'),
        overdueAmount: parseFloat(summary.overdueAmount || '0'),
      },
    });

  } catch (error) {
    console.error('List per capita invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to list invoices' },
      { status: 500 }
    );
  }
}
