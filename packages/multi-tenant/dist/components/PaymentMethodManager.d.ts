/**
 * PaymentMethodManager Component
 *
 * Manages payment methods using Stripe Elements.
 * Allows adding, viewing, and removing payment methods.
 *
 * @module PaymentMethodManager
 */
import React from 'react';
export interface PaymentMethodManagerProps {
    /** Stripe publishable key */
    stripePublishableKey: string;
    /** Stripe customer ID */
    customerId: string;
    /** Callback when payment method is added */
    onPaymentMethodAdded?: (paymentMethodId: string) => void;
    /** Callback when payment method is removed */
    onPaymentMethodRemoved?: (paymentMethodId: string) => void;
    /** API endpoint for server-side operations */
    apiEndpoint?: string;
    /** Additional CSS classes */
    className?: string;
}
/**
 * Payment method manager component
 *
 * @example
 * ```tsx
 * <PaymentMethodManager
 *   stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
 *   customerId={organization.stripe_customer_id}
 *   apiEndpoint="/api/billing/payment-methods"
 *   onPaymentMethodAdded={(id) => undefined}
 *   onPaymentMethodRemoved={(id) => undefined}
 * />
 * ```
 */
export declare const PaymentMethodManager: React.FC<PaymentMethodManagerProps>;
//# sourceMappingURL=PaymentMethodManager.d.ts.map