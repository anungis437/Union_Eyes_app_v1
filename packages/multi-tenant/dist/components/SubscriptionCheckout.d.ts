/**
 * SubscriptionCheckout Component
 *
 * Handles subscription checkout flow using Stripe Checkout.
 * Supports plan selection, trial periods, and payment processing.
 *
 * @module SubscriptionCheckout
 */
import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingService } from '../services/billingService';
export interface SubscriptionCheckoutProps {
    /** Supabase client */
    supabase: SupabaseClient;
    /** Billing service instance */
    billingService: BillingService;
    /** Organization ID */
    organizationId: string;
    /** Stripe price ID */
    priceId: string;
    /** Plan name (for display) */
    planName: string;
    /** Plan price (for display) */
    planPrice: string;
    /** Plan features (for display) */
    planFeatures: string[];
    /** Trial period days (optional) */
    trialPeriodDays?: number;
    /** Success callback */
    onSuccess?: () => void;
    /** Cancel callback */
    onCancel?: () => void;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Subscription checkout component
 *
 * @example
 * ```tsx
 * <SubscriptionCheckout
 *   supabase={supabase}
 *   billingService={billingService}
 *   organizationId={currentOrg.id}
 *   priceId="price_1234567890"
 *   planName="Professional"
 *   planPrice="$99/month"
 *   planFeatures={['Unlimited users', '100 GB storage', 'Priority support']}
 *   trialPeriodDays={14}
 *   onSuccess={() => router.push('/dashboard')}
 *   onCancel={() => router.push('/billing')}
 * />
 * ```
 */
export declare const SubscriptionCheckout: React.FC<SubscriptionCheckoutProps>;
//# sourceMappingURL=SubscriptionCheckout.d.ts.map