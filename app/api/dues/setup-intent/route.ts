import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members } from '@/services/financial-service/src/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

/**
 * Create Stripe SetupIntent for saving payment method without charging
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find member by userId
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    const memberMetadata = member.metadata ? JSON.parse(member.metadata) as Record<string, unknown> : {};
    let customerId = memberMetadata?.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email || undefined,
        name: member.name,
        metadata: {
          memberId: member.id,
          tenantId: member.tenantId,
        },
      });

      customerId = customer.id;

      // Store customer ID in member metadata
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

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'us_bank_account'],
      usage: 'off_session', // For future payments
      metadata: {
        memberId: member.id,
        tenantId: member.tenantId,
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (error) {
    console.error('Error creating SetupIntent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}
