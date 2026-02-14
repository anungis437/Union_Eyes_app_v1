/**
 * Member Dues Ledger API
 * 
 * Manages member dues transactions, charges, payments, and balance tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { memberDuesLedger, memberArrears } from '@/db/schema/dues-finance-schema';
import { and, desc, eq, gte, lte, sql, lt } from 'drizzle-orm';
import { requireUserForOrganization } from '@/lib/api-auth-guard';
import { logger } from '@/lib/logger';

// Validation schema for creating transaction
const createTransactionSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  transactionType: z.enum(['charge', 'payment', 'credit', 'adjustment', 'write_off']),
  amount: z.number(),
  effectiveDate: z.string(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  description: z.string(),
  notes: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
});

/**
 * GET /api/dues/ledger
 * Get member dues ledger with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const transactionType = searchParams.get('transactionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const fiscalYear = searchParams.get('fiscalYear');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (userId) {
      conditions.push(eq(memberDuesLedger.userId, userId));
    }
    if (organizationId) {
      conditions.push(eq(memberDuesLedger.organizationId, organizationId));
    }
    if (transactionType) {
      conditions.push(eq(memberDuesLedger.transactionType, transactionType));
    }
    if (startDate) {
      conditions.push(gte(memberDuesLedger.transactionDate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(memberDuesLedger.transactionDate, new Date(endDate)));
    }
    if (fiscalYear) {
      conditions.push(eq(memberDuesLedger.fiscalYear, parseInt(fiscalYear)));
    }

    // Fetch transactions
    const transactions = await db
      .select()
      .from(memberDuesLedger)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(memberDuesLedger.transactionDate))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberDuesLedger)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get current balance if userId provided
    let currentBalance = null;
    if (userId) {
      const latestTransaction = await db
        .select({ balanceAfter: memberDuesLedger.balanceAfter })
        .from(memberDuesLedger)
        .where(eq(memberDuesLedger.userId, userId))
        .orderBy(desc(memberDuesLedger.transactionDate))
        .limit(1);
      
      currentBalance = latestTransaction[0]?.balanceAfter || '0.00';
    }

    return NextResponse.json({
      transactions,
      currentBalance,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: Record<string, unknown>) {
    logger.error('Error fetching dues ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dues ledger', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dues/ledger
 * Create new dues transaction (immutable)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);
    const authContext = await requireUserForOrganization(validatedData.organizationId);

    // Get current balance
    const latestTransaction = await db
      .select({ balanceAfter: memberDuesLedger.balanceAfter })
      .from(memberDuesLedger)
      .where(eq(memberDuesLedger.userId, validatedData.userId))
      .orderBy(desc(memberDuesLedger.transactionDate))
      .limit(1);

    const currentBalance = Number(latestTransaction[0]?.balanceAfter || 0);

    // Calculate new balance based on transaction type
    let balanceChange = validatedData.amount;
    if (validatedData.transactionType === 'charge') {
      balanceChange = validatedData.amount; // Charges increase balance
    } else if (['payment', 'credit'].includes(validatedData.transactionType)) {
      balanceChange = -validatedData.amount; // Payments/credits decrease balance
    } else if (validatedData.transactionType === 'adjustment') {
      // Adjustment can be positive or negative (amount includes sign)
      balanceChange = validatedData.amount;
    } else if (validatedData.transactionType === 'write_off') {
      balanceChange = -Math.abs(validatedData.amount); // Write-offs always decrease
    }

    const newBalance = currentBalance + balanceChange;

    // Create transaction (immutable)
    const [newTransaction] = await db
      .insert(memberDuesLedger)
      .values({
        ...validatedData,
        amount: validatedData.amount.toString(),
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString(),
        effectiveDate: new Date(validatedData.effectiveDate),
        periodStart: validatedData.periodStart ? new Date(validatedData.periodStart) : null,
        periodEnd: validatedData.periodEnd ? new Date(validatedData.periodEnd) : null,
        fiscalYear: validatedData.periodStart 
          ? new Date(validatedData.periodStart).getFullYear() 
          : new Date().getFullYear(),
        fiscalMonth: validatedData.periodStart 
          ? new Date(validatedData.periodStart).getMonth() + 1 
          : new Date().getMonth() + 1,
        status: 'posted',
        createdBy: authContext.userId,
      })
      .returning();

    // Update arrears if balance is now positive
    if (newBalance > 0) {
      await updateMemberArrears(validatedData.userId, validatedData.organizationId);
    }

    return NextResponse.json(
      {
        message: 'Transaction posted successfully',
        transaction: newTransaction,
        newBalance,
      },
      { status: 201 }
    );
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
    logger.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update member arrears
 */
async function updateMemberArrears(userId: string, organizationId: string) {
  // Get current balance
  const latestTransaction = await db
    .select({ balanceAfter: memberDuesLedger.balanceAfter })
    .from(memberDuesLedger)
    .where(eq(memberDuesLedger.userId, userId))
    .orderBy(desc(memberDuesLedger.transactionDate))
    .limit(1);

  const totalOwed = Number(latestTransaction[0]?.balanceAfter || 0);

  // Calculate aging buckets
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Calculate unpaid charges by age
  // Get all charge transactions that contributed to current balance
  const charges = await db
    .select({
      effectiveDate: memberDuesLedger.effectiveDate,
      amount: memberDuesLedger.amount,
    })
    .from(memberDuesLedger)
    .where(
      and(
        eq(memberDuesLedger.userId, userId),
        eq(memberDuesLedger.organizationId, organizationId),
        eq(memberDuesLedger.transactionType, 'charge'),
        eq(memberDuesLedger.status, 'posted')
      )
    );

  // Allocate charges to aging buckets based on effective date
  let over30Days = 0;
  let over60Days = 0;
  let over90Days = 0;

  for (const charge of charges) {
    const chargeAmount = Number(charge.amount);
    const chargeDate = new Date(charge.effectiveDate);
    
    if (chargeDate < ninetyDaysAgo) {
      over90Days += chargeAmount;
    } else if (chargeDate < sixtyDaysAgo) {
      over60Days += chargeAmount;
    } else if (chargeDate < thirtyDaysAgo) {
      over30Days += chargeAmount;
    }
  }

  // Determine status
  let arrearsStatus = 'current';
  if (totalOwed > 0) {
    if (over90Days > 0) {
      arrearsStatus = 'suspended';
    } else if (over60Days > 0) {
      arrearsStatus = 'warning';
    } else if (totalOwed > 0) {
      arrearsStatus = 'warning';
    }
  }

  // Upsert arrears record
  await db
    .insert(memberArrears)
    .values({
      userId,
      organizationId,
      totalOwed: totalOwed.toString(),
      over30Days: over30Days.toString(),
      over60Days: over60Days.toString(),
      over90Days: over90Days.toString(),
      arrearsStatus,
      firstArrearsDate: totalOwed > 0 ? now : null,
      lastCalculatedAt: now,
    })
    .onConflictDoUpdate({
      target: [memberArrears.userId],
      set: {
        totalOwed: totalOwed.toString(),
        over30Days: over30Days.toString(),
        over60Days: over60Days.toString(),
        over90Days: over90Days.toString(),
        arrearsStatus,
        lastCalculatedAt: now,
        updatedAt: now,
      },
    });
}
