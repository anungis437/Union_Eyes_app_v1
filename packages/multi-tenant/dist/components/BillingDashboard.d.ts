/**
 * BillingDashboard Component
 *
 * Comprehensive billing dashboard showing subscription details,
 * usage metrics, and quick actions for plan management.
 *
 * @module BillingDashboard
 */
import React from 'react';
export interface BillingDashboardProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Stripe secret key */
    stripeSecretKey: string;
    /** Enable real-time updates */
    enableRealtime?: boolean;
    /** Callback when upgrade is clicked */
    onUpgradeClick?: () => void;
    /** Callback when manage billing is clicked */
    onManageBillingClick?: () => void;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Billing dashboard component
 *
 * @example
 * ```tsx
 * <BillingDashboard
 *   supabase={supabase}
 *   organizationId={orgId}
 *   stripeSecretKey={process.env.STRIPE_SECRET_KEY!}
 *   enableRealtime={true}
 *   onUpgradeClick={() => setShowPlanSelector(true)}
 *   onManageBillingClick={() => window.open(billingPortalUrl)}
 * />
 * ```
 */
export declare const BillingDashboard: React.FC<BillingDashboardProps>;
//# sourceMappingURL=BillingDashboard.d.ts.map