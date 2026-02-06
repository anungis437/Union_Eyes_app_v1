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
      console.error('Webhook handler error:', error);
      
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
    console.log(`Processing webhook event: ${event.type}`);

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
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id);
    
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

      // TODO: Send welcome email to customer
      // TODO: Log subscription creation in audit log
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    
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

      // TODO: Notify user of subscription changes
      // TODO: Log subscription update in audit log
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    
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

      // TODO: Send cancellation confirmation email
      // TODO: Archive organization data (if applicable)
      // TODO: Log subscription deletion in audit log
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handle invoice payment succeeded event
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice payment succeeded:', invoice.id);
    
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

      // TODO: Send payment receipt email
      // TODO: Log successful payment in audit log
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle invoice payment failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice payment failed:', invoice.id);
    
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

      // TODO: Send payment failed notification email
      // TODO: Update subscription status to past_due
      // TODO: Log payment failure in audit log
    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
      throw error;
    }
  }

  /**
   * Handle trial will end event (3 days before trial ends)
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    console.log('Trial will end soon:', subscription.id);
    
    try {
      // Calculate days remaining
      const trialEnd = new Date(subscription.trial_end! * 1000);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // TODO: Send trial ending reminder email with days remaining
      // TODO: Prompt user to add payment method if not already added
      // TODO: Log trial reminder in audit log
      
      console.log(`Trial ends in ${daysRemaining} days for subscription ${subscription.id}`);
    } catch (error) {
      console.error('Error handling trial will end:', error);
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
