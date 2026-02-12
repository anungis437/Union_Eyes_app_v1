/**
 * Billing Management Hook
 *
 * React hook for managing billing, subscriptions, and usage tracking.
 * Provides subscription management, usage monitoring, and Stripe integration.
 *
 * @module useBilling
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBillingService, } from '../services/billingService';
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
export function useBilling(options) {
    const { supabase, organizationId, stripeSecretKey, enableRealtime = false, refreshInterval = 0, } = options;
    // Service instance (memoized)
    const service = useMemo(() => createBillingService(supabase, stripeSecretKey), [supabase, stripeSecretKey]);
    // State
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Derived state
    const isActive = subscription?.status === 'active';
    const isOnTrial = subscription?.status === 'trialing';
    const isWithinLimits = usage ? !usage.is_over_limit : true;
    // Calculate trial days remaining
    const trialDaysRemaining = useMemo(() => {
        if (!subscription?.trial_end)
            return null;
        const now = new Date();
        const trialEnd = new Date(subscription.trial_end);
        const diffMs = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [subscription?.trial_end]);
    // Load subscription
    const loadSubscription = useCallback(async () => {
        if (!organizationId)
            return;
        try {
            const { data, error: err } = await service.getSubscription(organizationId);
            if (err && err.message !== 'Subscription not found') {
                throw err;
            }
            setSubscription(data);
        }
        catch (err) {
            setError(err);
        }
    }, [service, organizationId]);
    // Load usage
    const loadUsage = useCallback(async () => {
        if (!organizationId)
            return;
        try {
            const { data, error: err } = await service.getUsageMetrics(organizationId);
            if (err) {
                throw err;
            }
            setUsage(data);
        }
        catch (err) {
            setError(err);
        }
    }, [service, organizationId]);
    // Load all billing data
    const loadBilling = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            await Promise.all([
                loadSubscription(),
                loadUsage(),
            ]);
        }
        finally {
            setIsLoading(false);
        }
    }, [loadSubscription, loadUsage]);
    // Create subscription
    const createSubscription = useCallback(async (input) => {
        try {
            setError(null);
            const { data, error: err } = await service.createSubscription(input);
            if (err) {
                throw err;
            }
            if (data) {
                setSubscription(data);
            }
            return data;
        }
        catch (err) {
            setError(err);
            return null;
        }
    }, [service]);
    // Update subscription
    const updateSubscription = useCallback(async (input) => {
        if (!subscription)
            return null;
        try {
            setError(null);
            const { data, error: err } = await service.updateSubscription(subscription.id, input);
            if (err) {
                throw err;
            }
            if (data) {
                setSubscription(data);
            }
            return data;
        }
        catch (err) {
            setError(err);
            return null;
        }
    }, [service, subscription]);
    // Cancel subscription
    const cancelSubscription = useCallback(async (immediately = false) => {
        if (!subscription)
            return false;
        try {
            setError(null);
            const { success, error: err } = await service.cancelSubscription(subscription.id, immediately);
            if (err) {
                throw err;
            }
            if (success) {
                await loadBilling();
            }
            return success;
        }
        catch (err) {
            setError(err);
            return false;
        }
    }, [service, subscription, loadBilling]);
    // Track usage
    const trackUsage = useCallback(async (metric, value, increment = true) => {
        try {
            setError(null);
            const { success, error: err } = await service.trackUsage(organizationId, metric, value, increment);
            if (err) {
                throw err;
            }
            if (success) {
                await loadUsage();
            }
            return success;
        }
        catch (err) {
            setError(err);
            return false;
        }
    }, [service, organizationId, loadUsage]);
    // Get usage percentage
    const getUsagePercentage = useCallback((metric) => {
        if (!usage)
            return 0;
        return Math.round(usage.usage_percentage[metric] || 0);
    }, [usage]);
    // Refresh
    const refresh = useCallback(async () => {
        await loadBilling();
    }, [loadBilling]);
    // Initial load
    useEffect(() => {
        loadBilling();
    }, [loadBilling]);
    // Auto-refresh
    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(refresh, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, refresh]);
    // Real-time subscription
    useEffect(() => {
        if (!enableRealtime || !organizationId)
            return;
        let channel = null;
        const setupRealtime = async () => {
            try {
                channel = supabase
                    .channel(`billing-${organizationId}`)
                    .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'billing_subscriptions',
                    filter: `organization_id=eq.${organizationId}`,
                }, async (payload) => {
                    await loadSubscription();
                })
                    .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'billing_usage',
                    filter: `organization_id=eq.${organizationId}`,
                }, async (payload) => {
                    await loadUsage();
                })
                    .subscribe();
            }
            catch (err) {
                setError(err);
            }
        };
        setupRealtime();
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [enableRealtime, organizationId, supabase, loadSubscription, loadUsage]);
    return {
        subscription,
        usage,
        isLoading,
        error,
        createSubscription,
        updateSubscription,
        cancelSubscription,
        trackUsage,
        isWithinLimits,
        getUsagePercentage,
        isActive,
        isOnTrial,
        trialDaysRemaining,
        refresh,
        service,
    };
}
//# sourceMappingURL=useBilling.js.map