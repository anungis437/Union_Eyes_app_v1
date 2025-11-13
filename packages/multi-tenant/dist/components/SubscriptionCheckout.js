import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * SubscriptionCheckout Component
 *
 * Handles subscription checkout flow using Stripe Checkout.
 * Supports plan selection, trial periods, and payment processing.
 *
 * @module SubscriptionCheckout
 */
import { useState } from 'react';
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
export const SubscriptionCheckout = ({ supabase, billingService, organizationId, priceId, planName, planPrice, planFeatures, trialPeriodDays = 0, onSuccess, onCancel, className = '', }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const handleCheckout = async () => {
        if (!agreedToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }
        try {
            setIsProcessing(true);
            setError('');
            // Create subscription
            const subscription = await billingService.createSubscription({
                organization_id: organizationId,
                price_id: priceId,
                trial_days: trialPeriodDays > 0 ? trialPeriodDays : undefined,
            });
            if (!subscription) {
                throw new Error('Failed to create subscription');
            }
            // Success
            onSuccess?.();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed');
        }
        finally {
            setIsProcessing(false);
        }
    };
    return (_jsxs("div", { className: `max-w-md mx-auto ${className}`, children: [_jsxs("div", { className: "bg-white rounded-lg shadow-lg overflow-hidden", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white", children: [_jsxs("h2", { className: "text-2xl font-bold", children: [planName, " Plan"] }), _jsx("p", { className: "text-3xl font-bold mt-2", children: planPrice }), trialPeriodDays > 0 && (_jsxs("p", { className: "text-sm mt-2 opacity-90", children: ["Includes ", trialPeriodDays, "-day free trial"] }))] }), _jsxs("div", { className: "px-6 py-6 border-b border-gray-200", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-900 mb-4", children: "What's included:" }), _jsx("ul", { className: "space-y-3", children: planFeatures.map((feature, index) => (_jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }), _jsx("span", { className: "text-sm text-gray-700", children: feature })] }, index))) })] }), _jsxs("div", { className: "px-6 py-6", children: [_jsxs("label", { className: "flex items-start cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: agreedToTerms, onChange: (e) => {
                                            setAgreedToTerms(e.target.checked);
                                            if (error && e.target.checked)
                                                setError('');
                                        }, className: "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1" }), _jsxs("span", { className: "ml-3 text-sm text-gray-600", children: ["I agree to the", ' ', _jsx("a", { href: "/terms", target: "_blank", className: "text-blue-600 hover:underline", children: "Terms of Service" }), ' ', "and", ' ', _jsx("a", { href: "/privacy", target: "_blank", className: "text-blue-600 hover:underline", children: "Privacy Policy" })] })] }), error && (_jsx("div", { className: "mt-4 bg-red-50 border border-red-200 rounded-md p-3", children: _jsx("p", { className: "text-sm text-red-800", children: error }) })), _jsxs("div", { className: "mt-6 space-y-3", children: [_jsx("button", { onClick: handleCheckout, disabled: isProcessing || !agreedToTerms, className: "w-full px-4 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150", children: isProcessing ? (_jsxs("span", { className: "flex items-center justify-center", children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Processing..."] })) : trialPeriodDays > 0 ? (`Start ${trialPeriodDays}-Day Free Trial`) : ('Subscribe Now') }), _jsx("button", { onClick: onCancel, disabled: isProcessing, className: "w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150", children: "Cancel" })] }), trialPeriodDays > 0 && (_jsx("div", { className: "mt-4 p-3 bg-blue-50 rounded-md", children: _jsxs("p", { className: "text-xs text-blue-800", children: [_jsx("strong", { children: "Trial Period:" }), " You won't be charged for ", trialPeriodDays, " days. Cancel anytime during the trial period to avoid charges."] }) }))] })] }), _jsxs("div", { className: "mt-4 flex items-center justify-center text-xs text-gray-500", children: [_jsx("svg", { className: "h-4 w-4 mr-1", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }) }), "Secure checkout powered by Stripe"] })] }));
};
//# sourceMappingURL=SubscriptionCheckout.js.map