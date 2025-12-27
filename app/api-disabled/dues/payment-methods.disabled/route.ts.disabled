import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, paymentMethods } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

/**
 * GET: List member's saved payment methods
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get payment methods from database
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.memberId, member.id),
          eq(paymentMethods.isActive, true)
        )
      )
      .orderBy(paymentMethods.isDefault);

    return NextResponse.json({
      paymentMethods: methods.map(method => ({
        id: method.id,
        type: method.type,
        last4: method.last4,
        brand: method.brand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        bankName: method.bankName,
        isDefault: method.isDefault,
        stripePaymentMethodId: method.stripePaymentMethodId,
      })),
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

/**
 * POST: Add new payment method (after SetupIntent confirmation)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing paymentMethodId' },
        { status: 400 }
      );
    }

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberMetadata = member.metadata ? JSON.parse(member.metadata) as Record<string, unknown> : {};
    const customerId = memberMetadata?.stripeCustomerId as string | undefined;
    if (!customerId) {
      return NextResponse.json(
        { error: 'Stripe customer not found' },
        { status: 404 }
      );
    }

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Determine if this should be default (if no other payment methods exist)
    const existingMethods = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.memberId, member.id),
          eq(paymentMethods.isActive, true)
        )
      );

    const isDefault = existingMethods.length === 0;

    // Save to database
    const [savedMethod] = await db
      .insert(paymentMethods)
      .values({
        tenantId: member.tenantId,
        memberId: member.id,
        stripePaymentMethodId: paymentMethodId,
        stripeCustomerId: customerId,
        type: paymentMethod.type === 'us_bank_account' ? 'bank_account' : 'card',
        last4: paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4,
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month?.toString(),
        expiryYear: paymentMethod.card?.exp_year?.toString(),
        bankName: paymentMethod.us_bank_account?.bank_name,
        isDefault,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: savedMethod.id,
        type: savedMethod.type,
        last4: savedMethod.last4,
        brand: savedMethod.brand,
        isDefault: savedMethod.isDefault,
      },
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    );
  }
}
