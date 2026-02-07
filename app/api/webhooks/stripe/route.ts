/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for payment processing
 * Integrates with notification system, payment schema, and financial reporting
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/database";
import {
  payments,
  paymentMethods,
  paymentCycles,
  stripeWebhookEvents,
} from "@/db/schema/financial-payments-schema";
import { createAuditLog } from "@/lib/services/audit-service";
import { postGLTransaction } from "@/lib/services/general-ledger-service";
import {
  sendPaymentReceivedNotification,
  sendPaymentFailedNotification,
} from "@/lib/services/payment-notifications";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";

// ============================================================================
// INITIALIZATION
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * Verify Stripe webhook signature
 * @throws Error if signature is invalid
 */
function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.error("Failed to verify Stripe webhook signature", { error });
    throw error;
  }
}

/**
 * Main webhook handler
 * GET /api/webhooks/stripe
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    if (!signature) {
      logger.warn("Stripe webhook received without signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify signature
    const event = verifyWebhookSignature(body, signature);

    logger.info("Stripe webhook event received", { type: event.type });

    // Store webhook event for audit trail and recovery
    await db.insert(stripeWebhookEvents).values({
      organizationId: (event.data.object as any)?.metadata?.organizationId || "system",
      eventId: event.id,
      eventType: event.type,
      eventData: event.data as any,
      timestamp: new Date(event.created * 1000),
      processed: false,
      processedAt: null,
      status: "pending",
    });

    // Route to appropriate handler based on event type
    switch (event.type) {
      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(
          event.data.object as Stripe.PaymentMethod
        );
        break;

      case "payment_method.detached":
        await handlePaymentMethodDetached(
          event.data.object as Stripe.PaymentMethod
        );
        break;

      default:
        logger.warn("Unhandled Stripe webhook event", { type: event.type });
    }

    // Mark webhook as processed
    await db
      .update(stripeWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        status: "completed",
      })
      .where(eq(stripeWebhookEvents.stripeEventId, event.id));

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook handler failed", { error });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle successful payment
 * - Updates payment record to completed
 * - Posts GL transaction
 * - Sends notification
 */
async function handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
  try {
    logger.info("Processing charge succeeded", { chargeId: charge.id });

    if (!charge.metadata?.paymentId) {
      logger.warn("Charge succeeded but no payment ID in metadata", {
        chargeId: charge.id,
      });
      return;
    }

    const paymentId = charge.metadata.paymentId;
    const organizationId = charge.metadata.organizationId || "system";
    const memberId = charge.metadata.memberId;

    // Update payment record
    await db
      .update(payments)
      .set({
        status: "completed",
        stripeChargeId: charge.id,
        stripePaymentIntentId: charge.payment_intent as string,
        amount: (charge.amount / 100).toString(), // Convert from cents
        completedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // Post GL transaction for payment received
    await postGLTransaction({
      organizationId,
      accountNumber: "1010", // Cash/Bank Account (debit)
      debitAmount: charge.amount / 100,
      creditAmount: 0,
      description: `Payment received from member via Stripe - Charge ${charge.id}`,
      sourceSystem: "stripe",
      sourceRecordId: charge.id,
      userId: "system",
    }).catch((err) => {
      logger.error("Failed to post GL transaction for payment", { error: err, chargeId: charge.id });
    });

    // Post offsetting credit to revenue account
    await postGLTransaction({
      organizationId,
      accountNumber: "4010", // Revenue Account (credit)
      debitAmount: 0,
      creditAmount: charge.amount / 100,
      description: `Revenue from member payment via Stripe - Charge ${charge.id}`,
      sourceSystem: "stripe",
      sourceRecordId: charge.id,
      userId: "system",
    }).catch((err) => {
      logger.error("Failed to post GL revenue transaction", { error: err, chargeId: charge.id });
    });

    // Send success notification
    if (memberId) {
      await sendPaymentReceivedNotification(
        organizationId,
        memberId,
        charge.amount / 100,
        "Credit Card",
        charge.id,
        "system"
      ).catch((err) =>
        logger.warn("Failed to send payment received notification", err)
      );
    }

    logger.info("Charge succeeded processed", { paymentId });
  } catch (error) {
    logger.error("Failed to process charge succeeded", { error });
  }
}

/**
 * Handle failed payment
 * - Updates payment record to failed
 * - Captures failure reason
 * - Sends retry notification
 */
async function handleChargeFailed(charge: Stripe.Charge): Promise<void> {
  try {
    logger.info("Processing charge failed", { chargeId: charge.id });

    if (!charge.metadata?.paymentId) {
      logger.warn("Charge failed but no payment ID in metadata", {
        chargeId: charge.id,
      });
      return;
    }

    const paymentId = charge.metadata.paymentId;
    const organizationId = charge.metadata.organizationId || "system";
    const memberId = charge.metadata.memberId;

    // Update payment record
    await db
      .update(payments)
      .set({
        status: "failed",
        failureReason: charge.failure_message || "Unknown error",
        failureCode: charge.failure_code || undefined,
        stripeChargeId: charge.id,
      })
      .where(eq(payments.id, paymentId));

    // Send failure notification with retry action
    if (memberId) {
      await sendPaymentFailedNotification(
        organizationId,
        memberId,
        charge.amount / 100,
        charge.failure_message || "Payment failed",
        `/pay/retry/${paymentId}`,
        "system"
      ).catch((err) =>
        logger.warn("Failed to send payment failed notification", err)
      );
    }

    logger.info("Charge failed processed", { paymentId });
  } catch (error) {
    logger.error("Failed to process charge failed", { error });
  }
}

/**
 * Handle refund
 * - Creates reverse GL transaction
 * - Updates payment status
 * - Sends refund notification
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  try {
    logger.info("Processing charge refunded", {
      chargeId: charge.id,
      refunded: charge.refunded,
    });

    if (!charge.metadata?.paymentId) {
      return;
    }

    const paymentId = charge.metadata.paymentId;
    const organizationId = charge.metadata.organizationId || "system";

    // Update payment record
    await db
      .update(payments)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        refundAmount: (charge.refunded && charge.amount_refunded
          ? charge.amount_refunded / 100
          : 0
        ).toString(),
      })
      .where(eq(payments.id, paymentId));

    // Post reverse GL transaction for refund
    // For refunds, we credit the revenue account and debit accounts receivable
    await postGLTransaction({
      organizationId,
      accountNumber: "4100", // Revenue account
      debitAmount: charge.amount_refunded ? charge.amount_refunded / 100 : 0,
      creditAmount: 0,
      description: `Refund for payment - Charge ${charge.id}`,
      sourceSystem: "stripe",
      sourceRecordId: `REFUND-${charge.id}`,
      userId: "system",
    }).catch((err) => {
      logger.warn("Failed to post GL transaction for refund", { error: err, chargeId: charge.id });
    });

    logger.info("Charge refunded processed", { paymentId });
  } catch (error) {
    logger.error("Failed to process charge refunded", { error });
  }
}

/**
 * Handle subscription updated
 * - Updates subscription schedule
 * - Sends confirmation notification
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    logger.info("Processing subscription updated", {
      subscriptionId: subscription.id,
    });

    // Update subscription schedule in database
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Note: Payment cycles are managed separately via payment schedule service
    // No direct Stripe metadata tracking in current schema

    // Create audit log for subscription update
    await createAuditLog({
      organizationId: subscription.metadata?.organizationId || 'unknown',
      userId: "system",
      action: "SUBSCRIPTION_UPDATED",
      resourceType: "subscription",
      resourceId: subscription.id,
      description: `Stripe subscription updated - status: ${subscription.status}, current period end: ${currentPeriodEnd.toISOString()}`,
      metadata: {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
      },
    }).catch((err: any) => logger.warn("Failed to create audit log for subscription update", { error: err instanceof Error ? err.message : String(err) }));

    logger.info("Subscription updated processed", {
      subscriptionId: subscription.id

    // Extract organization ID from subscription metadata
    const organizationId = subscription.metadata?.organizationId || "system";

    // Find payment cycles linked to this subscription and mark as cancelled
    const existingCycles = await db.query.paymentCycles.findMany({
      where: and(
        sql`${paymentCycles.metadata}->>'stripeSubscriptionId' = ${subscription.id}`,
      ),
    }).catch(() => []);

    // Update cycles with cancelled status
    for (const cycle of existingCycles) {
      await db.update(paymentCycles)
        .set({
          status: "cancelled" as any,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paymentCycles.id, cycle.id))
        .catch((err) => {
          logger.error("Failed to update payment cycle on subscription deletion", { error: err, cycleId: cycle.id });
       Note: Payment cycles are managed separately via payment schedule service
    // No direct Stripe metadata tracking in current schema

    // Create audit log for subscription cancellation
    await createAuditLog({
      organizationId,
      userId: "system",
      action: "SUBSCRIPTION_DELETED",
      resourceType: "subscription",
      resourceId: subscription.id,
      description: `Stripe subscription deleted`,
      metadata: {
        subscriptionId: subscription.id,
        cancelledAt: new Date().toISOString(),
      },
    }).catch((err: any) => logger.warn("Failed to create audit log for subscription deletion", { error: err instanceof Error ? err.message : String(err) }));

    logger.info("Subscription deleted processed", {
      subscriptionId: subscription.id
        accountNumber: "1200", // Accounts Receivable (credit)
        debitAmount: 0,
        creditAmount: (invoice.amount_paid || 0) / 100,
        description: `Invoice payment applied - Invoice ${invoice.number || invoice.id}`,
        sourceSystem: "stripe",
        sourceRecordId: invoice.id,
        invoiceNumber: invoice.number || invoice.id,
        userId: "system",
      }).catch((err) => {
        logger.error("Failed to post GL AR transaction", { error: err, invoiceId: invoice.id });
      });
    }

    logger.info("Invoice payment succeeded processed", { invoiceId: invoice.id });
  } catch (error) {
    logger.error("Failed to process invoice payment succeeded", { error });
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    logger.info("Processing invoice payment failed", { invoiceId: invoice.id });

    // Create payment dispute record
    const organizationId = invoice.metadata?.organizationId;
    const memberId = invoice.metadata?.memberId;

    if (organizationId) {
      // Create audit log for failed payment
      await createAuditLog({
        organizationId,
        userId: memberId || "system",
        action: "INVOICE_PAYMENT_FAILED",
        resourceType: "invoice",
        resourceId: invoice.id,
        details: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          attemptedAmount: (invoice.amount_due || 0) / 100,
          failureCode: invoice.last_finalization_error?.code,
          failureMessage: invoice.last_finalization_error?.message,
        },
      }).catch((err) => {
        logger.error("Failed to create audit log for invoice payment failure", { error: err });
      });

      // Send retry notification to member
      if (memberId) {
        await sendPaymentFailedNotification(
          organizationId,
          memberId,
          (invoice.amount_due || 0) / 100,
          "Invoice Payment",
          invoice.last_finalization_error?.message || "Payment failed",
          "system"
        ).catch((err) => {
          logger.error("Failed to send payment failed notification", { error: err });
        });
      }
    }

    logger.info("Invoice payment failed processed", { invoiceId: invoice.id });
  } catch (error) {
    logger.error("Failed to process invoice payment failed", { error });
  }
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    logger.info("Processing payment intent succeeded", {
      paymentIntentId: paymentIntent.id,
    });

    // Usually handled by charge.succeeded, but included for completeness

    logger.info("Payment intent succeeded processed", {
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error("Failed to process payment intent succeeded", { error });
  }
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    logger.info("Processing payment intent failed", {
      paymentIntentId: paymentIntent.id,
    });

    // Usually handled by charge.failed, but included for completeness

    logger.info("Payment intent failed processed", {
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error("Failed to process payment intent failed", { error });
  }
}

/**
 * Handle payment method attached
 * - Stores payment method in database
 */
async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod
): Promise<void> {
  try {
    logger.info("Processing payment method attached", {
      paymentMethodId: paymentMethod.id,
    });

    if (!paymentMethod.customer) {
      logger.warn("Payment method attached but no customer", {
        paymentMethodId: paymentMethod.id,
      });
      return;
    }

    // Store payment method for future use
    const organizationId = paymentMethod.metadata?.organizationId;
    const memberId = paymentMethod.metadata?.memberId;

    if (organizationId && memberId) {
      try {
        // Check if payment method already exists
        const existingMethod = await db.query.paymentMethods.findFirst({
          where: eq(paymentMethods.stripePaymentMethodId, paymentMethod.id),
        });

        if (!existingMethod) {
          await db.insert(paymentMethods).values({
            organizationId,
            memberId,
            stripePaymentMethodId: paymentMethod.id,
            stripeCustomerId: paymentMethod.customer as string,
            type: paymentMethod.type as any,
            lastFour: paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4,
            brand: paymentMethod.card?.brand,
            expiryMonth: paymentMethod.card?.exp_month?.toString(),
            expiryYear: paymentMethod.card?.exp_year?.toString(),
            isDefault: false, // Will be updated when set as default
            isActive: true,
            createdBy: memberId,
          });

          logger.info("Payment method stored successfully", {
            paymentMethodId: paymentMethod.id,
            customerId: paymentMethod.customer,
          });
        }
      } catch (error) {
        logger.error("Failed to store payment method", { error, paymentMethodId: paymentMethod.id });
      }
    }

    logger.info("Payment method attached processed", {
      paymentMethodId: paymentMethod.id,
    });
  } catch (error) {
    logger.error("Failed to process payment method attached", { error });
  }
}

/**
 * Handle payment method detached
 */
async function handlePaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod
): Promise<void> {
  try {
    logger.info("Processing payment method detached", {
      paymentMethodId: paymentMethod.id,
    });

    // Mark payment method as inactive
    try {
      const result = await db
        .update(paymentMethods)
        .set({
          isActive: false,
          detachedAt: new Date(),
        })
        .where(eq(paymentMethods.stripePaymentMethodId, paymentMethod.id));

      if (result.rowCount && result.rowCount > 0) {
        logger.info("Payment method marked as inactive", {
          paymentMethodId: paymentMethod.id,
        });
      }
    } catch (error) {
      logger.error("Failed to mark payment method as inactive", {
        error,
        paymentMethodId: paymentMethod.id,
      });
    }

    logger.info("Payment method detached processed", {
      paymentMethodId: paymentMethod.id,
    });
  } catch (error) {
    logger.error("Failed to process payment method detached", { error });
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type StripeWebhookEvent = Stripe.Event;
