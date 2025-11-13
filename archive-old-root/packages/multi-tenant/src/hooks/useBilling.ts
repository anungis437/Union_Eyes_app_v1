/**
 * Billing Management Hook
 * 
 * React hook for managing billing, subscriptions, and usage tracking.
 * Provides subscription management, usage monitoring, and Stripe integration.
 * 
 * @module useBilling
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  BillingService,
  createBillingService,
  type BillingSubscription,
  type UsageMetrics,
  type CreateSubscriptionInput,
  type UpdateSubscriptionInput,
  PLAN_CONFIGS,
} from '../services/billingService';

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
export function useBilling(options: UseBillingOptions): UseBillingReturn {
  const {
    supabase,
    organizationId,
    stripeSecretKey,
    enableRealtime = false,
    refreshInterval = 0,
  } = options;

  // Service instance (memoized)
  const service = useMemo(
    () => createBillingService(supabase, stripeSecretKey),
    [supabase, stripeSecretKey]
  );

  // State
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Derived state
  const isActive = subscription?.status === 'active';
  const isOnTrial = subscription?.status === 'trialing';
  const isWithinLimits = usage ? !usage.is_over_limit : true;

  // Calculate trial days remaining
  const trialDaysRemaining = useMemo(() => {
    if (!subscription?.trial_end) return null;
    
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }, [subscription?.trial_end]);

  // Load subscription
  const loadSubscription = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error: err } = await service.getSubscription(organizationId);

      if (err && err.message !== 'Subscription not found') {
        throw err;
      }

      setSubscription(data);
    } catch (err) {
      setError(err as Error);
    }
  }, [service, organizationId]);

  // Load usage
  const loadUsage = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error: err } = await service.getUsageMetrics(organizationId);

      if (err) {
        throw err;
      }

      setUsage(data);
    } catch (err) {
      setError(err as Error);
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
    } finally {
      setIsLoading(false);
    }
  }, [loadSubscription, loadUsage]);

  // Create subscription
  const createSubscription = useCallback(async (
    input: CreateSubscriptionInput
  ): Promise<BillingSubscription | null> => {
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
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [service]);

  // Update subscription
  const updateSubscription = useCallback(async (
    input: UpdateSubscriptionInput
  ): Promise<BillingSubscription | null> => {
    if (!subscription) return null;

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
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [service, subscription]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (immediately: boolean = false): Promise<boolean> => {
    if (!subscription) return false;

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
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [service, subscription, loadBilling]);

  // Track usage
  const trackUsage = useCallback(async (
    metric: string,
    value: number,
    increment: boolean = true
  ): Promise<boolean> => {
    try {
      setError(null);

      const { success, error: err } = await service.trackUsage(
        organizationId,
        metric as any,
        value,
        increment
      );

      if (err) {
        throw err;
      }

      if (success) {
        await loadUsage();
      }

      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [service, organizationId, loadUsage]);

  // Get usage percentage
  const getUsagePercentage = useCallback((
    metric: 'users' | 'matters' | 'storage' | 'api_calls'
  ): number => {
    if (!usage) return 0;
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
    if (!enableRealtime || !organizationId) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        channel = supabase
          .channel(`billing-${organizationId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'billing_subscriptions',
              filter: `organization_id=eq.${organizationId}`,
            },
            async (payload) => {
              console.log('Subscription change:', payload);
              await loadSubscription();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'billing_usage',
              filter: `organization_id=eq.${organizationId}`,
            },
            async (payload) => {
              console.log('Usage change:', payload);
              await loadUsage();
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Failed to setup realtime:', err);
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
