import { manageSubscriptionStatusChange, updateStripeCustomer } from "@/actions/stripe-actions";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";
import { updateProfile, updateProfileByStripeCustomerId } from "@/db/queries/profiles-queries";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { logger } from '@/lib/logger';

const relevantEvents = new Set<Stripe.Event.Type>([
  "checkout.session.completed", 
  "customer.subscription.updated", 
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  // Dues payment events
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_method.attached",
  "payment_method.detached",
  // DISABLED: Payment methods not implemented yet
  // "setup_intent.succeeded"
]);

// Default usage credits for Pro plan
const DEFAULT_USAGE_CREDITS = 250;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("Stripe-Signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: 'webhook:stripe',
        endpoint: '/api/stripe/webhooks',
        method: 'POST',
        eventType: 'auth_failed',
        severity: 'high',
        details: { reason: 'Webhook secret or signature missing' },
      });
      throw new Error("Webhook secret or signature missing");
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: 'webhook:stripe',
      endpoint: '/api/stripe/webhooks',
      method: 'POST',
      eventType: 'success',
      severity: 'low',
      details: { eventType: event.type, eventId: event.id },
    });
  } catch (err: any) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId: 'webhook:stripe',
      endpoint: '/api/stripe/webhooks',
      method: 'POST',
      eventType: 'auth_failed',
      severity: 'high',
      details: { error: err.message },
    });
    logger.error('Stripe webhook signature validation failed', new Error(err.message));
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await handleSubscriptionChange(event);
          break;

        case "checkout.session.completed":
          await handleCheckoutSession(event);
          break;
          
        case "invoice.payment_succeeded":
          await handlePaymentSuccess(event);
          break;
          
        case "invoice.payment_failed":
          await handlePaymentFailed(event);
          break;

        // Dues payment events
        case "payment_intent.succeeded":
          await handleDuesPaymentSuccess(event);
          break;
          
        case "payment_intent.payment_failed":
          await handleDuesPaymentFailed(event);
          break;
          
        // DISABLED: Payment methods table not implemented yet
        // case "setup_intent.succeeded":
        //   await handleSetupIntentSuccess(event);
        //   break;

        default:
          throw new Error("Unhandled relevant event!");
      }

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: 'webhook:stripe',
        endpoint: '/api/stripe/webhooks',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: { eventType: event.type, processed: true },
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: 'webhook:stripe',
        endpoint: '/api/stripe/webhooks',
        method: 'POST',
        eventType: 'auth_failed',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      });
      logger.error('Webhook handler failed', error as Error, { eventType: event.type });
      return new Response("Webhook handler failed. View your nextjs function logs.", {
        status: 400
      });
    }
  }

  return new Response(JSON.stringify({ received: true }));
}

async function handleSubscriptionChange(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const productId = subscription.items.data[0].price.product as string;
  await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);
}

async function handleCheckoutSession(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  if (checkoutSession.mode === "subscription") {
    const subscriptionId = checkoutSession.subscription as string;
    await updateStripeCustomer(checkoutSession.client_reference_id as string, subscriptionId, checkoutSession.customer as string);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method"]
    });

    const productId = subscription.items.data[0].price.product as string;
    await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);
    
    // Reset usage credits on new subscription
    if (checkoutSession.client_reference_id) {
      try {
        const billingCycleStart = new Date(subscription.current_period_start * 1000);
        const billingCycleEnd = new Date(subscription.current_period_end * 1000);
        
        await updateProfile(checkoutSession.client_reference_id, {
          usageCredits: DEFAULT_USAGE_CREDITS,
          usedCredits: 0,
          status: "active",
          billingCycleStart,
          billingCycleEnd
        });
      } catch (error) {
        logger.error('Error updating usage credits', error as Error, { userId: checkoutSession.client_reference_id });
      }
    }
  }
}

async function handlePaymentSuccess(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  if (invoice.subscription) {
    try {
      // Get the subscription to determine billing cycle dates
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      
      const billingCycleStart = new Date(subscription.current_period_start * 1000);
      const billingCycleEnd = new Date(subscription.current_period_end * 1000);
      
      // Update profile directly by Stripe customer ID
      await updateProfileByStripeCustomerId(customerId, {
        usageCredits: DEFAULT_USAGE_CREDITS,
        usedCredits: 0,
        status: "active",
        billingCycleStart,
        billingCycleEnd
      });
      
      console.log(`Reset usage credits to ${DEFAULT_USAGE_CREDITS} for Stripe customer ${customerId}`);
    } catch (error) {
      console.error(`Error processing payment success: ${error}`);
    }
  }
}

async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  try {
    // Update profile directly by Stripe customer ID
    const updatedProfile = await updateProfileByStripeCustomerId(customerId, {
      status: "payment_failed"
    });
    
    if (updatedProfile) {
      logger.info('Marked payment as failed', { userId: updatedProfile.userId, customerId });
    } else {
      logger.warn('No profile found for Stripe customer', { customerId });
    }
  } catch (error) {
    logger.error('Error processing payment failure', error as Error, { customerId });
  }
}

// Dues payment webhook handlers
async function handleDuesPaymentSuccess(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  try {
    const { db } = await import('@/db');
    const { duesTransactions, members, autopaySettings } = await import('@/services/financial-service/src/db/schema');
    const { eq, and, sql } = await import('drizzle-orm');
    
    // Find transaction by Stripe payment intent ID
    const [transaction] = await db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.stripePaymentIntentId, paymentIntent.id))
      .limit(1);
    
    if (transaction) {
      // Update transaction status
      await db
        .update(duesTransactions)
        .set({
          status: 'completed',
          paymentDate: new Date(),
          paymentMethod: paymentIntent.payment_method_types[0] || 'card',
          paymentReference: paymentIntent.id,
          updatedAt: new Date(),
        })
        .where(eq(duesTransactions.id, transaction.id));
      
      console.log(`Dues payment succeeded for transaction ${transaction.id}`);
      
      // Update AutoPay settings if this was an AutoPay charge
      const [settings] = await db
        .select()
        .from(autopaySettings)
        .where(
          and(
            eq(autopaySettings.memberId, transaction.memberId),
            eq(autopaySettings.enabled, true)
          )
        )
        .limit(1);
      
      if (settings) {
        await db
          .update(autopaySettings)
          .set({
            lastChargeDate: new Date().toISOString().split('T')[0],
            lastChargeAmount: transaction.totalAmount,
            lastChargeStatus: 'completed',
            failureCount: '0',
            updatedAt: new Date(),
          })
          .where(eq(autopaySettings.id, settings.id));
        
        console.log(`Updated AutoPay settings for member ${transaction.memberId}`);
      }
      
      // Send payment confirmation email
      try {
        const { FinancialEmailService } = await import('@/lib/services/financial-email-service');
        const { Decimal } = await import('decimal.js');
        
        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.id, transaction.memberId))
          .limit(1);
        
        if (member && member.email) {
          await FinancialEmailService.sendPaymentConfirmation({
            to: member.email,
            memberName: `${member.firstName} ${member.lastName}`,
            transactionId: transaction.id,
            amount: new Decimal(transaction.totalAmount),
            currency: 'CAD',
            paymentMethod: 'Credit Card',
            paymentDate: new Date(),
            receiptUrl: transaction.receiptUrl,
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
        // Don't fail the webhook if email fails
      }
    } else {
      console.warn(`No transaction found for payment intent ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error(`Error processing dues payment success: ${error}`);
  }
}

async function handleDuesPaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  try {
    const { db } = await import('@/db');
    const { duesTransactions, autopaySettings } = await import('@/services/financial-service/src/db/schema');
    const { eq, and, sql } = await import('drizzle-orm');
    
    // Find transaction by Stripe payment intent ID
    const [transaction] = await db
      .select()
      .from(duesTransactions)
      .where(eq(duesTransactions.stripePaymentIntentId, paymentIntent.id))
      .limit(1);
    
    if (transaction) {
      // Update transaction status
      await db
        .update(duesTransactions)
        .set({
          status: 'failed',
          notes: paymentIntent.last_payment_error?.message || 'Payment failed',
          updatedAt: new Date(),
        })
        .where(eq(duesTransactions.id, transaction.id));
      
      console.log(`Dues payment failed for transaction ${transaction.id}: ${paymentIntent.last_payment_error?.message}`);
      
      // Update AutoPay settings if this was an AutoPay charge
      const [settings] = await db
        .select()
        .from(autopaySettings)
        .where(
          and(
            eq(autopaySettings.memberId, transaction.memberId),
            eq(autopaySettings.enabled, true)
          )
        )
        .limit(1);
      
      if (settings) {
        const newFailureCount = (parseInt(settings.failureCount?.toString() || '0') + 1).toString();
        
        await db
          .update(autopaySettings)
          .set({
            lastChargeDate: new Date().toISOString().split('T')[0],
            lastChargeAmount: transaction.totalAmount,
            lastChargeStatus: 'failed',
            failureCount: newFailureCount,
            lastFailureDate: new Date().toISOString().split('T')[0],
            lastFailureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
            updatedAt: new Date(),
          })
          .where(eq(autopaySettings.id, settings.id));
        
        console.log(`Updated AutoPay failure count to ${newFailureCount} for member ${transaction.memberId}`);
        
        // Disable AutoPay after 3 failures
        if (parseInt(newFailureCount) >= 3) {
          await db
            .update(autopaySettings)
            .set({
              enabled: false,
              updatedAt: new Date(),
            })
            .where(eq(autopaySettings.id, settings.id));
          
          console.log(`Disabled AutoPay for member ${transaction.memberId} after 3 failures`);
        }
      }
      
      // Send payment failure email
      try {
        const { FinancialEmailService } = await import('@/lib/services/financial-email-service');
        const { Decimal } = await import('decimal.js');
        
        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.id, transaction.memberId))
          .limit(1);
        
        if (member && member.email) {
          await FinancialEmailService.sendPaymentFailure({
            to: member.email,
            memberName: `${member.firstName} ${member.lastName}`,
            amount: new Decimal(transaction.totalAmount),
            currency: 'CAD',
            failureReason: paymentIntent.last_payment_error?.message || 'Payment processing failed',
            failureDate: new Date(),
            retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dues/pay?retry=${transaction.id}`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@unioneyes.com',
          });
          
          // If AutoPay was disabled, send additional notification
          if (settings && parseInt(newFailureCount) >= 3) {
            await FinancialEmailService.sendAutopayDisabled({
              to: member.email,
              memberName: `${member.firstName} ${member.lastName}`,
              failureCount: 3,
              lastFailureReason: paymentIntent.last_payment_error?.message || 'Payment processing failed',
              updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/settings/autopay`,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send payment failure email:', emailError);
        // Don't fail the webhook if email fails
      }
    } else {
      console.warn(`No transaction found for payment intent ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error(`Error processing dues payment failure: ${error}`);
  }
}

// DISABLED: Payment methods table not implemented yet
/* async function handleSetupIntentSuccess(event: Stripe.Event) {
  const setupIntent = event.data.object as Stripe.SetupIntent;
  
  try {
    const { db } = await import('@/db');
    const { paymentMethods, members } = await import('@/services/financial-service/src/db/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const memberId = setupIntent.metadata?.memberId;
    const tenantId = setupIntent.metadata?.tenantId;
    
    if (!memberId || !tenantId) {
      logger.warn('SetupIntent missing required metadata', { setupIntentId: setupIntent.id });
      return;
    }
    
    // Check if payment method already saved
    const [existing] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.stripePaymentMethodId, setupIntent.payment_method as string))
      .limit(1);
    
    if (existing) {
      console.log(`Payment method ${setupIntent.payment_method} already saved`);
      return;
    }
    
    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
    
    // Check if member has other payment methods
    const existingMethods = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.memberId, memberId),
          eq(paymentMethods.isActive, true)
        )
      );
    
    const isDefault = existingMethods.length === 0;
    
    // Save payment method
    await withRLSContext({ organizationId: tenantId }, async (db) => {
      return await db.insert(paymentMethods).values({
        tenantId,
        memberId,
        stripePaymentMethodId: setupIntent.payment_method as string,
        stripeCustomerId: setupIntent.customer as string,
        type: paymentMethod.type === 'us_bank_account' ? 'bank_account' : 'card',
        last4: paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4,
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month?.toString(),
        expiryYear: paymentMethod.card?.exp_year?.toString(),
        bankName: paymentMethod.us_bank_account?.bank_name,
        isDefault,
        isActive: true,
      });
    });

    logger.info('Saved payment method', { paymentMethodId: setupIntent.payment_method, memberId });
  } catch (error) {
    logger.error('Error processing setup intent success', error as Error, { setupIntentId: setupIntent.id });
  }
} */

