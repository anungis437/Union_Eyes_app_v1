/**
 * Stripe Webhook Handler
 * 
 * Handles incoming Stripe webhook events for subscription management.
 * This should be integrated into your API endpoint (Next.js API route or Express endpoint).
 * 
 * @module StripeWebhookHandler
 */

import Stripe from 'stripe';
import { BillingService } from '../services/billingService';
import { SimpleLogger } from '../utils/logger';
import { logger } from '@/lib/logger';

export interface WebhookHandlerConfig {
  /** Stripe webhook signing secret */
  webhookSecret: string;
  
  /** Stripe secret key */
  stripeSecretKey: string;
  
  /** Supabase client instance */
  supabase: any;
}

export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  statusCode: number;
  event?: Stripe.Event;
  error?: string;
}

/**
 * Stripe Webhook Handler Class
 * 
 * @example
 * ```typescript
 * // Next.js API Route (pages/api/webhooks/stripe.ts)
 * import { createClient } from '@supabase/supabase-js';
 * import { StripeWebhookHandler } from '@unioneyes/multi-tenant';
 * 
 * export const config = { api: { bodyParser: false } }; // Required for Stripe webhooks
 * 
 * export default async function handler(req, res) {
 *   if (req.method !== 'POST') {
 *     return res.status(405).json({ error: 'Method not allowed' });
 *   }
 * 
 *   const supabase = createClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
 *   );
 * 
 *   const webhookHandler = new StripeWebhookHandler({
 *     webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 *     stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *     supabase,
 *   });
 * 
 *   const result = await webhookHandler.handleWebhook(req.body, req.headers['stripe-signature']);
 *   return res.status(result.statusCode).json(result);
 * }
 * ```
 */
export class StripeWebhookHandler {
  private stripe: Stripe;
  private webhookSecret: string;
  private billingService: BillingService;
  private logger = new SimpleLogger('StripeWebhookHandler');

  constructor(config: WebhookHandlerConfig) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-06-20' as any,
    });
    this.webhookSecret = config.webhookSecret;
    this.billingService = new BillingService(config.supabase, config.stripeSecretKey);
  }

  /**
   * Handle incoming webhook event
   */
  async handleWebhook(
    body: string | Buffer,
    signature: string | string[] | undefined
  ): Promise<WebhookHandlerResult> {
    try {
      // Verify webhook signature
      if (!signature) {
        return {
          success: false,
          message: 'Missing signature',
          statusCode: 400,
          error: 'No Stripe signature header provided',
        };
      }

      const event = this.verifyWebhookSignature(body, signature);

      // Process event based on type
      await this.processEvent(event);

      return {
        success: true,
        message: 'Webhook processed successfully',
        statusCode: 200,
        event,
      };
    } catch (error) {
      this.logger.error('Webhook handler error', { error });
      
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        return {
          success: false,
          message: 'Invalid signature',
          statusCode: 400,
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Webhook processing failed',
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature using Stripe SDK
   */
  private verifyWebhookSignature(
    body: string | Buffer,
    signature: string | string[]
  ): Stripe.Event {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    
    return this.stripe.webhooks.constructEvent(
      body,
      sig,
      this.webhookSecret
    );
  }

  /**
   * Process webhook event based on type
   */
  private async processEvent(event: Stripe.Event): Promise<void> {
    this.logger.info('Processing webhook event', { eventType: event.type });

    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.info('Unhandled event type', { eventType: event.type });
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.info('Subscription created', { subscriptionId: subscription.id });
    
    // The subscription is already created by billingService.createSubscription()
    // This webhook confirms the subscription was successfully created in Stripe
    // We can use this to trigger notifications or additional processing
    
    try {
      // Trigger the standard subscription updated handler to ensure sync
      await this.billingService.handleWebhook({
        type: 'customer.subscription.updated',
        data: { object: subscription },
        id: subscription.id,
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        livemode: subscription.livemode,
        pending_webhooks: 0,
        request: null,
      } as Stripe.Event);

      // Log subscription creation in audit log
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      this.logger.info('Subscription created - Audit log entry', {
        action: 'subscription.created',
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        planId: subscription.items.data[0]?.price.id,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      });

      // Send welcome email to customer
      // Note: Email implementation depends on the consuming application's email service
      this.logger.info('Welcome email should be sent to customer', {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        planName: subscription.items.data[0]?.price.nickname || subscription.items.data[0]?.price.id,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      });
    } catch (error) {
      this.logger.error('Error handling subscription created', { error });
      throw error;
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.info('Subscription updated', { subscriptionId: subscription.id });
    
    try {
      await this.billingService.handleWebhook({
        type: 'customer.subscription.updated',
        data: { object: subscription },
        id: subscription.id,
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        livemode: subscription.livemode,
        pending_webhooks: 0,
        request: null,
      } as Stripe.Event);

      // Log subscription update in audit log
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      this.logger.info('Subscription updated - Audit log entry', {
        action: 'subscription.updated',
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });

      // Notify user of subscription changes
      // Note: Email implementation depends on the consuming application's email service
      const notificationMessage = subscription.cancel_at_period_end
        ? 'Your subscription will be canceled at the end of the billing period'
        : subscription.status === 'past_due'
        ? 'Your subscription payment is past due'
        : subscription.status === 'active'
        ? 'Your subscription has been updated'
        : `Your subscription status has changed to: ${subscription.status}`;
      
      this.logger.info('Subscription update notification should be sent to customer', {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        message: notificationMessage,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error) {
      this.logger.error('Error handling subscription updated', { error });
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    this.logger.info('Subscription deleted', { subscriptionId: subscription.id });
    
    try {
      await this.billingService.handleWebhook({
        type: 'customer.subscription.deleted',
        data: { object: subscription },
        id: subscription.id,
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        livemode: subscription.livemode,
        pending_webhooks: 0,
        request: null,
      } as Stripe.Event);

      // Log subscription deletion in audit log
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      this.logger.info('Subscription deleted - Audit log entry', {
        action: 'subscription.deleted',
        customerId,
        subscriptionId: subscription.id,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      });

      // Archive organization data (if applicable)
      // Note: Data archival should be implemented by the consuming application
      // This is a business decision that varies by application
      this.logger.info('Organization data archival should be considered for', {
        subscriptionId: subscription.id,
        customerId,
        metadata: subscription.metadata,
      });

      // Send cancellation confirmation email
      // Note: Email implementation depends on the consuming application's email service
      this.logger.info('Cancellation confirmation email should be sent to customer', {
        subscriptionId: subscription.id,
        customerId,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      });
    } catch (error) {
      this.logger.error('Error handling subscription deleted', { error });
      throw error;
    }
  }

  /**
   * Handle invoice payment succeeded event
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.info('Invoice payment succeeded', { invoiceId: invoice.id });
    
    try {
      await this.billingService.handleWebhook({
        type: 'invoice.payment_succeeded',
        data: { object: invoice },
        id: invoice.id,
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        livemode: invoice.livemode,
        pending_webhooks: 0,
        request: null,
      } as Stripe.Event);

      // Log successful payment in audit log
      if (invoice.customer) {
        // Extract customer and subscription details for audit
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        
        this.logger.info('Payment succeeded - Audit log entry', {
          action: 'invoice.payment_succeeded',
          customerId,
          subscriptionId,
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
        });
      }

      // Send payment receipt email
      // Note: Email implementation depends on the consuming application's email service
      // Applications should implement email sending by listening to webhook events or
      // extending this handler with their email service
      this.logger.info('Payment receipt email should be sent to customer', {
        invoiceId: invoice.id,
        customerEmail: invoice.customer_email,
        amountPaid: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
      });
    } catch (error) {
      this.logger.error('Error handling invoice payment succeeded', { error });
      throw error;
    }
  }

  /**
   * Handle invoice payment failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.info('Invoice payment failed', { invoiceId: invoice.id });
    
    try {
      await this.billingService.handleWebhook({
        type: 'invoice.payment_failed',
        data: { object: invoice },
        id: invoice.id,
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        livemode: invoice.livemode,
        pending_webhooks: 0,
        request: null,
      } as Stripe.Event);

      // Update subscription status to past_due
      if (invoice.subscription) {
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription.id;
        
        try {
          await this.stripe.subscriptions.update(subscriptionId, {
            metadata: {
              payment_status: 'past_due',
              last_payment_failure: new Date().toISOString(),
            },
          });
          
          this.logger.info('Subscription marked as past_due', { subscriptionId });
        } catch (error) {
          this.logger.error('Failed to update subscription status', { error });
        }
      }

      // Log payment failure in audit log
      const customerId = invoice.customer 
        ? (typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id)
        : undefined;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      
      this.logger.info('Payment failed - Audit log entry', {
        action: 'invoice.payment_failed',
        customerId,
        subscriptionId,
        invoiceId: invoice.id,
        amountDue: invoice.amount_due,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      });

      // Send payment failed notification email
      // Note: Email implementation depends on the consuming application's email service
      this.logger.info('Payment failed notification should be sent to customer', {
        invoiceId: invoice.id,
        customerEmail: invoice.customer_email,
        amountDue: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
      });
    } catch (error) {
      this.logger.error('Error handling invoice payment failed', { error });
      throw error;
    }
  }

  /**
   * Handle trial will end event (3 days before trial ends)
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    this.logger.info('Trial will end soon', { subscriptionId: subscription.id });
    
    try {
      // Calculate days remaining
      const trialEnd = new Date(subscription.trial_end! * 1000);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Log trial reminder in audit log
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      this.logger.info('Trial ending reminder - Audit log entry', {
        action: 'subscription.trial_will_end',
        customerId,
        subscriptionId: subscription.id,
        trialEnd: trialEnd.toISOString(),
        daysRemaining,
      });

      // Check if payment method is attached
      const hasPaymentMethod = subscription.default_payment_method !== null;
      
      // Prompt user to add payment method if not already added
      if (!hasPaymentMethod) {
        this.logger.info('Customer needs to add payment method before trial ends', {
          subscriptionId: subscription.id,
          customerId,
          daysRemaining,
          trialEnd: trialEnd.toISOString(),
        });
      }

      // Send trial ending reminder email with days remaining
      // Note: Email implementation depends on the consuming application's email service
      this.logger.info('Trial ending reminder email should be sent to customer', {
        subscriptionId: subscription.id,
        customerId,
        daysRemaining,
        trialEnd: trialEnd.toISOString(),
        hasPaymentMethod,
        actionRequired: !hasPaymentMethod ? 'Add payment method' : 'No action required',
      });
      
      this.logger.info('Trial ends in days for subscription', {
        subscriptionId: subscription.id,
        daysRemaining,
      });
    } catch (error) {
      this.logger.error('Error handling trial will end', { error });
      throw error;
    }
  }
}

/**
 * Helper function to read raw body from request
 * Required for Next.js API routes
 * 
 * @example
 * ```typescript
 * // Next.js API Route
 * export const config = { api: { bodyParser: false } };
 * 
 * export default async function handler(req, res) {
 *   const rawBody = await getRawBody(req);
 *   // ... rest of webhook handling
 * }
 * ```
 */
export async function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}
