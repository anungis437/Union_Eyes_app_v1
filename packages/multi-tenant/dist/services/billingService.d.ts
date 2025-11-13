/**
 * Billing Service
 *
 * Handles Stripe integration, subscription management, usage tracking,
 * and billing operations for the multi-tenant architecture.
 *
 * @module billingService
 * @category Multi-Tenant
 */
import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'incomplete' | 'unpaid';
export type BillingInterval = 'monthly' | 'yearly';
export interface BillingSubscription {
    id: string;
    organization_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    stripe_price_id: string;
    stripe_product_id: string;
    plan_name: 'free' | 'starter' | 'professional' | 'enterprise';
    billing_interval: BillingInterval;
    amount_cents: number;
    currency: string;
    status: SubscriptionStatus;
    current_period_start: string;
    current_period_end: string;
    trial_start?: string;
    trial_end?: string;
    cancelled_at?: string;
    cancel_at_period_end: boolean;
    ended_at?: string;
    next_invoice_date?: string;
    last_invoice_date?: string;
    last_invoice_amount_cents?: number;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}
export interface BillingUsage {
    id: string;
    organization_id: string;
    period_start: string;
    period_end: string;
    active_users: number;
    matters_created: number;
    documents_uploaded: number;
    storage_used_gb: number;
    api_calls: number;
    advanced_analytics_used: number;
    ai_queries: number;
    exports_generated: number;
    users_overage: number;
    matters_overage: number;
    storage_overage_gb: number;
    api_calls_overage: number;
    overage_charges_cents: number;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}
export interface PlanLimits {
    max_users: number;
    max_matters: number;
    max_storage_gb: number;
    max_api_calls_per_day: number;
    features: string[];
}
export interface CreateSubscriptionInput {
    organization_id: string;
    price_id: string;
    payment_method_id?: string;
    trial_days?: number;
}
export interface UpdateSubscriptionInput {
    price_id?: string;
    cancel_at_period_end?: boolean;
    quantity?: number;
}
export interface UsageMetrics {
    current: BillingUsage;
    limits: PlanLimits;
    usage_percentage: {
        users: number;
        matters: number;
        storage: number;
        api_calls: number;
    };
    is_over_limit: boolean;
    overage_charges_cents: number;
}
export declare const PLAN_CONFIGS: Record<string, PlanLimits>;
export declare class BillingService {
    private supabase;
    private stripe;
    constructor(supabase: SupabaseClient, stripeSecretKey: string);
    /**
     * Create new Stripe subscription
     */
    createSubscription(input: CreateSubscriptionInput): Promise<{
        data: BillingSubscription | null;
        error: Error | null;
    }>;
    /**
     * Update existing subscription
     */
    updateSubscription(subscriptionId: string, input: UpdateSubscriptionInput): Promise<{
        data: BillingSubscription | null;
        error: Error | null;
    }>;
    /**
     * Cancel subscription
     */
    cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<{
        success: boolean;
        error: Error | null;
    }>;
    /**
     * Get subscription for organization
     */
    getSubscription(organizationId: string): Promise<{
        data: BillingSubscription | null;
        error: Error | null;
    }>;
    /**
     * Track usage metric
     */
    trackUsage(organizationId: string, metric: keyof Pick<BillingUsage, 'active_users' | 'matters_created' | 'documents_uploaded' | 'storage_used_gb' | 'api_calls'>, value: number, increment?: boolean): Promise<{
        success: boolean;
        error: Error | null;
    }>;
    /**
     * Get current usage metrics with limits
     */
    getUsageMetrics(organizationId: string): Promise<{
        data: UsageMetrics | null;
        error: Error | null;
    }>;
    /**
     * Handle Stripe webhook event
     */
    handleWebhook(event: Stripe.Event): Promise<{
        success: boolean;
        error: Error | null;
    }>;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handleInvoicePaymentSucceeded;
    private handleInvoicePaymentFailed;
}
/**
 * Create billing service instance
 */
export declare function createBillingService(supabase: SupabaseClient, stripeSecretKey: string): BillingService;
//# sourceMappingURL=billingService.d.ts.map