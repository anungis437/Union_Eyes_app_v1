/**
 * Billing Service
 *
 * Handles Stripe integration, subscription management, usage tracking,
 * and billing operations for the multi-tenant architecture.
 *
 * @module billingService
 * @category Multi-Tenant
 */
import Stripe from 'stripe';
import { SimpleLogger } from '../utils/logger';
// =====================================================
// PLAN CONFIGURATION
// =====================================================
export const PLAN_CONFIGS = {
    free: {
        max_users: 1,
        max_matters: 10,
        max_storage_gb: 0.1, // 100MB
        max_api_calls_per_day: 1000,
        features: ['basic_matter_management', 'document_upload'],
    },
    starter: {
        max_users: 5,
        max_matters: 100,
        max_storage_gb: 10,
        max_api_calls_per_day: 10000,
        features: [
            'basic_matter_management',
            'document_upload',
            'advanced_search',
            'team_collaboration',
            'email_support',
        ],
    },
    professional: {
        max_users: 20,
        max_matters: 999999, // Unlimited
        max_storage_gb: 100,
        max_api_calls_per_day: 100000,
        features: [
            'basic_matter_management',
            'document_upload',
            'advanced_search',
            'team_collaboration',
            'advanced_analytics',
            'custom_workflows',
            'api_access',
            'priority_support',
        ],
    },
    enterprise: {
        max_users: 999999, // Unlimited
        max_matters: 999999, // Unlimited
        max_storage_gb: 999999, // Unlimited
        max_api_calls_per_day: 999999, // Unlimited
        features: [
            'basic_matter_management',
            'document_upload',
            'advanced_search',
            'team_collaboration',
            'advanced_analytics',
            'custom_workflows',
            'api_access',
            'custom_branding',
            'sso_integration',
            'dedicated_support',
            'sla_guarantee',
        ],
    },
};
// =====================================================
// SERVICE CLASS
// =====================================================
export class BillingService {
    constructor(supabase, stripeSecretKey) {
        this.supabase = supabase;
        this.logger = new SimpleLogger('BillingService');
        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2024-06-20',
        });
    }
    // =====================================================
    // SUBSCRIPTION MANAGEMENT
    // =====================================================
    /**
     * Create new Stripe subscription
     */
    async createSubscription(input) {
        try {
            // Get organization
            const { data: org } = await this.supabase
                .from('organizations')
                .select('*')
                .eq('id', input.organization_id)
                .single();
            if (!org) {
                return { data: null, error: new Error('Organization not found') };
            }
            let customerId = org.stripe_customer_id;
            // Create Stripe customer if doesn't exist
            if (!customerId) {
                const customer = await this.stripe.customers.create({
                    email: org.billing_email || org.email || undefined,
                    name: org.name,
                    metadata: {
                        organization_id: org.id,
                    },
                });
                customerId = customer.id;
                // Update organization with customer ID
                await this.supabase
                    .from('organizations')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', org.id);
            }
            // Create subscription
            const subscriptionParams = {
                customer: customerId,
                items: [{ price: input.price_id }],
                metadata: {
                    organization_id: org.id,
                },
            };
            if (input.payment_method_id) {
                subscriptionParams.default_payment_method = input.payment_method_id;
            }
            if (input.trial_days) {
                subscriptionParams.trial_period_days = input.trial_days;
            }
            const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);
            // Get price and product details
            const price = await this.stripe.prices.retrieve(input.price_id);
            const product = await this.stripe.products.retrieve(price.product);
            // Determine plan name from product metadata
            const planName = (product.metadata.plan_name || 'starter');
            // Store subscription in database
            const { data, error } = await this.supabase
                .from('billing_subscriptions')
                .insert({
                organization_id: org.id,
                stripe_subscription_id: stripeSubscription.id,
                stripe_customer_id: customerId,
                stripe_price_id: input.price_id,
                stripe_product_id: product.id,
                plan_name: planName,
                billing_interval: (price.recurring?.interval || 'monthly'),
                amount_cents: price.unit_amount || 0,
                currency: price.currency.toUpperCase(),
                status: stripeSubscription.status,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                trial_start: stripeSubscription.trial_start
                    ? new Date(stripeSubscription.trial_start * 1000).toISOString()
                    : undefined,
                trial_end: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000).toISOString()
                    : undefined,
                cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            })
                .select()
                .single();
            if (error) {
                return { data: null, error };
            }
            // Update organization with new plan and limits
            const limits = PLAN_CONFIGS[planName];
            await this.supabase
                .from('organizations')
                .update({
                current_plan: planName,
                stripe_subscription_id: stripeSubscription.id,
                max_users: limits.max_users,
                max_matters: limits.max_matters,
                max_storage_gb: limits.max_storage_gb,
                max_api_calls_per_day: limits.max_api_calls_per_day,
                features: limits.features.reduce((acc, feature) => ({ ...acc, [feature]: true }), {}),
            })
                .eq('id', org.id);
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Update existing subscription
     */
    async updateSubscription(subscriptionId, input) {
        try {
            // Get current subscription
            const { data: currentSub } = await this.supabase
                .from('billing_subscriptions')
                .select('*')
                .eq('id', subscriptionId)
                .single();
            if (!currentSub) {
                return { data: null, error: new Error('Subscription not found') };
            }
            const updateParams = {};
            if (input.price_id) {
                updateParams.items = [
                    {
                        id: (await this.stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)).items.data[0].id,
                        price: input.price_id,
                    },
                ];
            }
            if (input.cancel_at_period_end !== undefined) {
                updateParams.cancel_at_period_end = input.cancel_at_period_end;
            }
            // Update in Stripe
            const stripeSubscription = await this.stripe.subscriptions.update(currentSub.stripe_subscription_id, updateParams);
            // Update in database
            const { data, error } = await this.supabase
                .from('billing_subscriptions')
                .update({
                status: stripeSubscription.status,
                cancel_at_period_end: stripeSubscription.cancel_at_period_end,
                cancelled_at: stripeSubscription.canceled_at
                    ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
                    : undefined,
            })
                .eq('id', subscriptionId)
                .select()
                .single();
            if (error) {
                return { data: null, error };
            }
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId, immediately = false) {
        try {
            const { data: sub } = await this.supabase
                .from('billing_subscriptions')
                .select('*')
                .eq('id', subscriptionId)
                .single();
            if (!sub) {
                return { success: false, error: new Error('Subscription not found') };
            }
            if (immediately) {
                // Cancel immediately
                await this.stripe.subscriptions.cancel(sub.stripe_subscription_id);
                await this.supabase
                    .from('billing_subscriptions')
                    .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    ended_at: new Date().toISOString(),
                })
                    .eq('id', subscriptionId);
                // Downgrade to free plan
                await this.supabase
                    .from('organizations')
                    .update({
                    current_plan: 'free',
                    max_users: PLAN_CONFIGS.free.max_users,
                    max_matters: PLAN_CONFIGS.free.max_matters,
                    max_storage_gb: PLAN_CONFIGS.free.max_storage_gb,
                    max_api_calls_per_day: PLAN_CONFIGS.free.max_api_calls_per_day,
                })
                    .eq('id', sub.organization_id);
            }
            else {
                // Cancel at period end
                await this.stripe.subscriptions.update(sub.stripe_subscription_id, {
                    cancel_at_period_end: true,
                });
                await this.supabase
                    .from('billing_subscriptions')
                    .update({ cancel_at_period_end: true })
                    .eq('id', subscriptionId);
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    /**
     * Get subscription for organization
     */
    async getSubscription(organizationId) {
        try {
            const { data, error } = await this.supabase
                .from('billing_subscriptions')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (error) {
                return { data: null, error };
            }
            return { data: data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    // =====================================================
    // USAGE TRACKING
    // =====================================================
    /**
     * Track usage metric
     */
    async trackUsage(organizationId, metric, value, increment = true) {
        try {
            // Get or create current period usage
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const { data: existingUsage } = await this.supabase
                .from('billing_usage')
                .select('*')
                .eq('organization_id', organizationId)
                .gte('period_end', now.toISOString())
                .single();
            if (existingUsage) {
                // Update existing
                const newValue = increment ? existingUsage[metric] + value : value;
                await this.supabase
                    .from('billing_usage')
                    .update({ [metric]: newValue })
                    .eq('id', existingUsage.id);
            }
            else {
                // Create new
                await this.supabase.from('billing_usage').insert({
                    organization_id: organizationId,
                    period_start: periodStart.toISOString(),
                    period_end: periodEnd.toISOString(),
                    [metric]: value,
                });
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    /**
     * Get current usage metrics with limits
     */
    async getUsageMetrics(organizationId) {
        try {
            // Get organization limits
            const { data: org } = await this.supabase
                .from('organizations')
                .select('*')
                .eq('id', organizationId)
                .single();
            if (!org) {
                return { data: null, error: new Error('Organization not found') };
            }
            // Get current period usage
            const now = new Date();
            const { data: usage } = await this.supabase
                .from('billing_usage')
                .select('*')
                .eq('organization_id', organizationId)
                .gte('period_end', now.toISOString())
                .single();
            const currentUsage = usage || {
                active_users: 0,
                matters_created: 0,
                documents_uploaded: 0,
                storage_used_gb: 0,
                api_calls: 0,
            };
            const limits = {
                max_users: org.max_users,
                max_matters: org.max_matters,
                max_storage_gb: org.max_storage_gb,
                max_api_calls_per_day: org.max_api_calls_per_day,
                features: Object.keys(org.features || {}),
            };
            // Calculate usage percentages
            const usagePercentage = {
                users: (currentUsage.active_users / limits.max_users) * 100,
                matters: (currentUsage.matters_created / limits.max_matters) * 100,
                storage: (currentUsage.storage_used_gb / limits.max_storage_gb) * 100,
                api_calls: (currentUsage.api_calls / limits.max_api_calls_per_day) * 100,
            };
            const isOverLimit = currentUsage.active_users > limits.max_users ||
                currentUsage.matters_created > limits.max_matters ||
                currentUsage.storage_used_gb > limits.max_storage_gb ||
                currentUsage.api_calls > limits.max_api_calls_per_day;
            return {
                data: {
                    current: currentUsage,
                    limits,
                    usage_percentage: usagePercentage,
                    is_over_limit: isOverLimit,
                    overage_charges_cents: currentUsage.overage_charges_cents || 0,
                },
                error: null,
            };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    // =====================================================
    // STRIPE WEBHOOKS
    // =====================================================
    /**
     * Handle Stripe webhook event
     */
    async handleWebhook(event) {
        try {
            switch (event.type) {
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object);
                    break;
                default:
                    this.logger.info('Unhandled webhook event type', { eventType: event.type });
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    async handleSubscriptionUpdated(subscription) {
        await this.supabase
            .from('billing_subscriptions')
            .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
        })
            .eq('stripe_subscription_id', subscription.id);
    }
    async handleSubscriptionDeleted(subscription) {
        const { data: sub } = await this.supabase
            .from('billing_subscriptions')
            .select('*')
            .eq('stripe_subscription_id', subscription.id)
            .single();
        if (sub) {
            await this.supabase
                .from('billing_subscriptions')
                .update({
                status: 'cancelled',
                ended_at: new Date().toISOString(),
            })
                .eq('id', sub.id);
            // Downgrade to free plan
            await this.supabase
                .from('organizations')
                .update({
                current_plan: 'free',
                max_users: PLAN_CONFIGS.free.max_users,
                max_matters: PLAN_CONFIGS.free.max_matters,
                max_storage_gb: PLAN_CONFIGS.free.max_storage_gb,
                max_api_calls_per_day: PLAN_CONFIGS.free.max_api_calls_per_day,
            })
                .eq('id', sub.organization_id);
        }
    }
    async handleInvoicePaymentSucceeded(invoice) {
        if (invoice.subscription) {
            await this.supabase
                .from('billing_subscriptions')
                .update({
                last_invoice_date: new Date(invoice.created * 1000).toISOString(),
                last_invoice_amount_cents: invoice.amount_paid,
            })
                .eq('stripe_subscription_id', invoice.subscription);
        }
    }
    async handleInvoicePaymentFailed(invoice) {
        if (invoice.subscription) {
            await this.supabase
                .from('billing_subscriptions')
                .update({ status: 'past_due' })
                .eq('stripe_subscription_id', invoice.subscription);
        }
    }
}
/**
 * Create billing service instance
 */
export function createBillingService(supabase, stripeSecretKey) {
    return new BillingService(supabase, stripeSecretKey);
}
//# sourceMappingURL=billingService.js.map