import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { members, paymentMethods } from '@/services/financial-service/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

/**
 * DELETE: Remove payment method
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const methodId = params.id;

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get payment method
    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.memberId, member.id)
        )
      )
      .limit(1);

    if (!method) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(method.stripePaymentMethodId);

    // Soft delete in database
    await db
      .update(paymentMethods)
      .set({
        isActive: false,
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, methodId));

    return NextResponse.json({
      success: true,
      message: 'Payment method removed',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
