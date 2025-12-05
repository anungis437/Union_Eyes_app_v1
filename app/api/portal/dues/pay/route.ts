/**
 * Dues Payment Processing API
 * Handle member dues payments via Stripe
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { duesTransactions } from '@/db/schema/dues-transactions-schema';
import { profilesTable } from '@/db/schema/profiles-schema';
import { tenants } from '@/db/schema/tenant-management-schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { generateReceipt } from '@/lib/receipt-generator';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 payment requests per hour per user (strict for financial operations)
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.DUES_PAYMENT);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for dues payment', {
        limit: rateLimitResult.limit,
        resetIn: rateLimitResult.resetIn,
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many payment requests. Please try again later.',
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { transactionIds, paymentMethodId } = await request.json();

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'Transaction IDs required' }, { status: 400 });
    }

    // Fetch transactions
    const transactions = await db
      .select()
      .from(duesTransactions)
      .where(
        and(
          eq(duesTransactions.memberId, userId),
          eq(duesTransactions.status, 'pending')
        )
      );

    const selectedTransactions = transactions.filter(t => 
      transactionIds.includes(t.id)
    );

    if (selectedTransactions.length === 0) {
      return NextResponse.json({ error: 'No valid transactions found' }, { status: 404 });
    }

    // Calculate total amount
    const totalAmount = selectedTransactions.reduce(
      (sum, t) => sum + Number(t.totalAmount), 
      0
    );

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'cad',
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        userId,
        transactionIds: transactionIds.join(','),
        type: 'dues_payment',
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Fetch member profile
      const [profile] = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId));
      
      // Get tenant/organization from first transaction
      const organizationId = selectedTransactions[0].organizationId;
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, organizationId));

      // Update transactions as paid and generate receipts
      const receipts: string[] = [];
      
      for (const transaction of selectedTransactions) {
        // Generate receipt
        const receiptUrl = await generateReceipt({
          transactionId: transaction.id,
          memberId: userId,
          memberName: profile?.email || userId,
          organizationName: tenant?.tenantName || 'Union',
          duesAmount: Number(transaction.duesAmount),
          copeAmount: Number(transaction.copeAmount),
          pacAmount: Number(transaction.pacAmount),
          strikeFundAmount: Number(transaction.strikeFundAmount),
          lateFeeAmount: Number(transaction.lateFeeAmount),
          totalAmount: Number(transaction.totalAmount),
          paidDate: new Date(),
          paymentReference: paymentIntent.id,
          periodStart: new Date(transaction.periodStart),
          periodEnd: new Date(transaction.periodEnd),
        });

        receipts.push(receiptUrl);

        // Update transaction with receipt
        await db
          .update(duesTransactions)
          .set({
            status: 'paid',
            paidDate: new Date(),
            paymentMethod: 'stripe',
            paymentReference: paymentIntent.id,
            receiptUrl,
            updatedAt: new Date(),
          })
          .where(eq(duesTransactions.id, transaction.id));
      }

      logger.info('Dues payment processed successfully', {
        userId,
        transactionCount: selectedTransactions.length,
        totalAmount,
        paymentIntentId: paymentIntent.id,
        receiptsGenerated: receipts.length,
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        transactionsPaid: selectedTransactions.length,
        receipts,
      }, {
        headers: createRateLimitHeaders(rateLimitResult),
      });
    } else {
      return NextResponse.json({
        error: 'Payment failed',
        status: paymentIntent.status,
      }, { 
        status: 400,
        headers: createRateLimitHeaders(rateLimitResult),
      });
    }
  } catch (error) {
    logger.error('Failed to process dues payment', error as Error, {
      userId: (await auth()).userId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
