/**
 * InvoiceList Component
 *
 * Displays a list of past invoices with download and view actions.
 * Integrates with Stripe to retrieve invoice history.
 *
 * @module InvoiceList
 */
import React from 'react';
export interface InvoiceListProps {
    /** Supabase client instance */
    supabase: any;
    /** Organization ID */
    organizationId: string;
    /** Stripe secret key */
    stripeSecretKey: string;
    /** Maximum number of invoices to display */
    limit?: number;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Invoice list component
 *
 * @example
 * ```tsx
 * <InvoiceList
 *   supabase={supabase}
 *   organizationId={orgId}
 *   stripeSecretKey={process.env.STRIPE_SECRET_KEY!}
 *   limit={10}
 * />
 * ```
 */
export declare const InvoiceList: React.FC<InvoiceListProps>;
//# sourceMappingURL=InvoiceList.d.ts.map