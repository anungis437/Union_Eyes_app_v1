/**
 * Stripe Webhook Handler
 *
 * Handles incoming Stripe webhook events for subscription management.
 * This should be integrated into your API endpoint (Next.js API route or Express endpoint).
 *
 * @module StripeWebhookHandler
 */
import Stripe from 'stripe';
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
export declare class StripeWebhookHandler {
    private stripe;
    private webhookSecret;
    private billingService;
    private logger;
    constructor(config: WebhookHandlerConfig);
    /**
     * Handle incoming webhook event
     */
    handleWebhook(body: string | Buffer, signature: string | string[] | undefined): Promise<WebhookHandlerResult>;
    /**
     * Verify webhook signature using Stripe SDK
     */
    private verifyWebhookSignature;
    /**
     * Process webhook event based on type
     */
    private processEvent;
    /**
     * Handle subscription created event
     */
    private handleSubscriptionCreated;
    /**
     * Handle subscription updated event
     */
    private handleSubscriptionUpdated;
    /**
     * Handle subscription deleted event
     */
    private handleSubscriptionDeleted;
    /**
     * Handle invoice payment succeeded event
     */
    private handleInvoicePaymentSucceeded;
    /**
     * Handle invoice payment failed event
     */
    private handleInvoicePaymentFailed;
    /**
     * Handle trial will end event (3 days before trial ends)
     */
    private handleTrialWillEnd;
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
export declare function getRawBody(req: any): Promise<Buffer>;
//# sourceMappingURL=stripeWebhook.d.ts.map