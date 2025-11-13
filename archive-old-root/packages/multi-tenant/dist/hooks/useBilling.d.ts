/**
 * Billing Management Hook
 *
 * React hook for managing billing, subscriptions, and usage tracking.
 * Provides subscription management, usage monitoring, and Stripe integration.
 *
 * @module useBilling
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { BillingService, type BillingSubscription, type UsageMetrics, type CreateSubscriptionInput, type UpdateSubscriptionInput } from '../services/billingService';
export interface UseBillingOptions {
    /** Supabase client instance */
    supabase: SupabaseClient;
    /** Organization ID to manage billing for */
    organizationId: string;
    /** Stripe secret key */
    stripeSecretKey: string;
    /** Enable real-time updates via Supabase subscriptions */
    enableRealtime?: boolean;
    /** Auto-refresh interval in milliseconds (0 to disable) */
    refreshInterval?: number;
}
export interface UseBillingReturn {
    /** Current subscription */
    subscription: BillingSubscription | null;
    /** Usage metrics with limits */
    usage: UsageMetrics | null;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Create new subscription */
    createSubscription: (input: CreateSubscriptionInput) => Promise<BillingSubscription | null>;
    /** Update subscription */
    updateSubscription: (input: UpdateSubscriptionInput) => Promise<BillingSubscription | null>;
    /** Cancel subscription */
    cancelSubscription: (immediately?: boolean) => Promise<boolean>;
    /** Track usage metric */
    trackUsage: (metric: string, value: number, increment?: boolean) => Promise<boolean>;
    /** Check if within usage limits */
    isWithinLimits: boolean;
    /** Get usage percentage for metric */
    getUsagePercentage: (metric: 'users' | 'matters' | 'storage' | 'api_calls') => number;
    /** Check if subscription is active */
    isActive: boolean;
    /** Check if subscription is on trial */
    isOnTrial: boolean;
    /** Days until trial ends */
    trialDaysRemaining: number | null;
    /** Refresh billing data */
    refresh: () => Promise<void>;
    /** Billing service instance */
    service: BillingService;
}
/**
 * Hook for managing billing and subscriptions
 *
 * @example
 * ```tsx
 * function BillingDashboard({ organizationId }: { organizationId: string }) {
 *   const {
 *     subscription,
 *     usage,
 *     isLoading,
 *     cancelSubscription,
 *     isWithinLimits,
 *     getUsagePercentage,
 *   } = useBilling({
 *     supabase,
 *     organizationId,
 *     stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
 *     enableRealtime: true,
 *   });
 *
 *   if (isLoading) return <div>Loading billing...</div>;
 *
 *   return (
 *     <div>
 *       <h2>Current Plan: {subscription?.plan_name}</h2>
 *       <p>Status: {subscription?.status}</p>
 *
 *       <h3>Usage</h3>
 *       <div>Users: {getUsagePercentage('users')}%</div>
 *       <div>Storage: {getUsagePercentage('storage')}%</div>
 *
 *       {!isWithinLimits && (
 *         <div className="alert">You've exceeded your plan limits</div>
 *       )}
 *
 *       <button onClick={() => cancelSubscription(false)}>
 *         Cancel at Period End
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export declare function useBilling(options: UseBillingOptions): UseBillingReturn;
//# sourceMappingURL=useBilling.d.ts.map