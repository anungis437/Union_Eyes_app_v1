/**
 * UsageMetricsDisplay Component
 *
 * Displays usage metrics with progress bars showing current usage
 * against plan limits. Color-coded to indicate usage levels.
 *
 * @module UsageMetricsDisplay
 */
import React from 'react';
export interface UsageMetricsDisplayProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Stripe secret key */
    stripeSecretKey: string;
    /** Show detailed metrics */
    showDetails?: boolean;
    /** Enable real-time updates */
    enableRealtime?: boolean;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Usage metrics component with progress bars
 *
 * @example
 * ```tsx
 * <UsageMetricsDisplay
 *   supabase={supabase}
 *   organizationId={orgId}
 *   stripeSecretKey={process.env.STRIPE_SECRET_KEY!}
 *   showDetails={true}
 *   enableRealtime={true}
 * />
 * ```
 */
export declare const UsageMetricsDisplay: React.FC<UsageMetricsDisplayProps>;
//# sourceMappingURL=UsageMetrics.d.ts.map