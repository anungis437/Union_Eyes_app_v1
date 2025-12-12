import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: requestedUserId, amount, savePaymentMethod } = body;

    if (!requestedUserId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get member record
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, requestedUserId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Create Stripe customer if doesn't exist
    const memberMetadata = member.metadata ? JSON.parse(member.metadata) as Record<string, unknown> : {};
    let customerId = memberMetadata?.stripeCustomerId as string | undefined;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: member.name,
        metadata: {
          memberId: member.id,
          tenantId: member.tenantId,
        },
      });
      customerId = customer.id;

      // Update member with Stripe customer ID
      await db
        .update(members)
        .set({
          metadata: JSON.stringify({
            ...memberMetadata,
            stripeCustomerId: customerId,
          }),
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      setup_future_usage: savePaymentMethod ? 'off_session' : undefined,
      metadata: {
        memberId: member.id,
        tenantId: member.tenantId,
        type: 'dues_payment',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
