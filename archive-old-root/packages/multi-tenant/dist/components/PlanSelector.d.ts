/**
 * PlanSelector Component
 *
 * Plan comparison and selection interface with upgrade/downgrade flows.
 * Displays all available billing plans with features and pricing.
 *
 * @module PlanSelector
 */
import React from 'react';
export interface PlanSelectorProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Stripe secret key */
    stripeSecretKey: string;
    /** Current plan name */
    currentPlan?: string;
    /** Callback when plan is selected */
    onSelect: (planName: string, priceId: string) => void;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Plan selector component
 *
 * @example
 * ```tsx
 * <PlanSelector
 *   supabase={supabase}
 *   organizationId={orgId}
 *   stripeSecretKey={process.env.STRIPE_SECRET_KEY!}
 *   currentPlan="starter"
 *   onSelect={(planName, priceId) => handleUpgrade(priceId)}
 * />
 * ```
 */
export declare const PlanSelector: React.FC<PlanSelectorProps>;
//# sourceMappingURL=PlanSelector.d.ts.map