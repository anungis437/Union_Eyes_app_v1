import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { members, duesTransactions } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit, createRateLimitResponse, createRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting: 5 requests per minute per user/IP
  const rateLimitResult = rateLimit(request, {
    maxRequests: 5,
    windowSeconds: 60,
  });

  if (!rateLimitResult.success) {
    console.warn('[create-payment-intent] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: requestedUserId, amount, savePaymentMethod } = body;

    console.log('[create-payment-intent] Request body:', { requestedUserId, amount, savePaymentMethod });

    if (!requestedUserId || !amount || amount <= 0) {
      console.error('[create-payment-intent] Invalid parameters:', { requestedUserId, amount });
      return NextResponse.json({ error: 'Invalid parameters', details: { requestedUserId: !!requestedUserId, amount, isValid: amount > 0 } }, { status: 400 });
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

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      {
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { 
        status: 500,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }
}
