/**
 * Stripe Webhook Handler for Dues Payments
 * Handles Stripe webhook events for payment processing
 * 
 * POST /api/payments/webhooks/stripe - Process Stripe webhooks
 * 
 * Supported Events:
 * - checkout.session.completed - Payment succeeded
 * - payment_intent.succeeded - Direct payment succeeded
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Refund issued
 * 
 * @module app/api/payments/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PaymentService } from '@/lib/services/payment-service';
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { duesTransactions } from '@/db/schema/domains/finance/dues';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST handler for Stripe webhooks
 */
export async function POST(request: NextRequest) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeWebhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  if (!stripeSecretKey) {
    logger.error('STRIPE_SECRET_KEY not configured');
    return NextResponse.json(
      { error: 'Stripe secret key not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });

  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      logger.error('Webhook signature verification failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    logger.info('Stripe webhook received', {
      eventId: event.id,
      eventType: event.type,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error('Error processing Stripe webhook', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    logger.info('Processing checkout session completed', {
      sessionId: session.id,
      clientReferenceId: session.client_reference_id,
      paymentStatus: session.payment_status,
    });

    // Get transaction ID from client reference
    const transactionId = session.client_reference_id;
    if (!transactionId) {
      logger.error('No transaction ID in checkout session', {
        sessionId: session.id,
      });
      return;
    }

    // Check if already processed (idempotency)
    const existing = await db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.id, transactionId))
      .limit(1);

    if (!existing || existing.length === 0) {
      logger.error('Transaction not found', { transactionId });
      return;
    }

    if (existing[0].status === 'paid') {
      logger.info('Transaction already paid, skipping', { transactionId });
      return;
    }

    // Payment succeeded
    if (session.payment_status === 'paid') {
      await PaymentService.handlePaymentSuccess({
        transactionId,
        processorPaymentId: session.payment_intent as string,
        processorType: 'stripe',
        amount: (session.amount_total! / 100).toFixed(2),
        paymentMethod: 'card',
      });

      // Update metadata with session ID
      await db
        .update(duesTransactions)
        .set({
          metadata: {
            ...((existing[0].metadata as Record<string, unknown>) || {}),
            stripeSessionId: session.id,
          },
          updatedAt: new Date(),
        })
        .where(eq(duesTransactions.id, transactionId));

      logger.info('Checkout session payment processed', {
        transactionId,
        sessionId: session.id,
      });
    } else {
      logger.warn('Checkout session completed but not paid', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
    }
  } catch (error) {
    logger.error('Error handling checkout session completed', {
      error,
      sessionId: session.id,
    });
    throw error;
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    logger.info('Processing payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
    });

    // Get transaction by processor payment ID
    const transaction = await PaymentService.getTransactionByProcessorPaymentId(
      paymentIntent.id,
      'stripe'
    );

    if (!transaction) {
      logger.warn('No transaction found for payment intent', {
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Check if already processed
    if (transaction.status === 'paid') {
      logger.info('Transaction already paid, skipping', {
        transactionId: transaction.id,
      });
      return;
    }

    // Process payment success
    await PaymentService.handlePaymentSuccess({
      transactionId: transaction.id,
      processorPaymentId: paymentIntent.id,
      processorType: 'stripe',
      amount: (paymentIntent.amount / 100).toFixed(2),
      paymentMethod: paymentIntent.payment_method_types[0] || 'card',
    });

    logger.info('Payment intent success processed', {
      transactionId: transaction.id,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Error handling payment intent succeeded', {
      error,
      paymentIntentId: paymentIntent.id,
    });
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    logger.error('Processing payment intent failed', {
      paymentIntentId: paymentIntent.id,
      lastPaymentError: paymentIntent.last_payment_error,
    });

    // Get transaction by metadata (transaction ID should be in metadata)
    const transactionId = paymentIntent.metadata?.transactionId;
    if (!transactionId) {
      logger.warn('No transaction ID in payment intent metadata', {
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Process payment failure
    await PaymentService.handlePaymentFailure({
      transactionId,
      processorPaymentId: paymentIntent.id,
      processorType: 'stripe',
      errorMessage:
        paymentIntent.last_payment_error?.message || 'Payment failed',
      errorCode: paymentIntent.last_payment_error?.code || undefined,
    });

    logger.info('Payment intent failure processed', {
      transactionId,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Error handling payment intent failed', {
      error,
      paymentIntentId: paymentIntent.id,
    });
    throw error;
  }
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  try {
    logger.info('Processing charge refunded', {
      chargeId: charge.id,
      amount: charge.amount_refunded,
    });

    // Get payment intent ID
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      logger.warn('No payment intent ID in charge', { chargeId: charge.id });
      return;
    }

    // Get transaction
    const transaction = await PaymentService.getTransactionByProcessorPaymentId(
      paymentIntentId,
      'stripe'
    );

    if (!transaction) {
      logger.warn('No transaction found for charge', {
        chargeId: charge.id,
        paymentIntentId,
      });
      return;
    }

    // Update transaction status to refunded
    const isPartialRefund = charge.amount_refunded < charge.amount;
    await db
      .update(duesTransactions)
      .set({
        status: isPartialRefund ? 'partial' : 'refunded',
        metadata: {
          ...((transaction.metadata as Record<string, unknown>) || {}),
          refundedAmount: (charge.amount_refunded / 100).toFixed(2),
          refundedAt: new Date().toISOString(),
          refundChargeId: charge.id,
        },
        updatedAt: new Date(),
      })
      .where(eq(duesTransactions.id, transaction.id));

    logger.info('Charge refund processed', {
      transactionId: transaction.id,
      chargeId: charge.id,
      refundedAmount: charge.amount_refunded / 100,
      isPartialRefund,
    });
  } catch (error) {
    logger.error('Error handling charge refunded', {
      error,
      chargeId: charge.id,
    });
    throw error;
  }
}
