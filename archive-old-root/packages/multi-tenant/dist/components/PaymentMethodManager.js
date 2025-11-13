import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PaymentMethodManager Component
 *
 * Manages payment methods using Stripe Elements.
 * Allows adding, viewing, and removing payment methods.
 *
 * @module PaymentMethodManager
 */
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
/**
 * Payment form component (uses Stripe Elements)
 */
const PaymentForm = ({ customerId, apiEndpoint, onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardholderName, setCardholderName] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) {
            return;
        }
        setIsProcessing(true);
        onError('');
        try {
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) {
                throw new Error('Card element not found');
            }
            // Create payment method
            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: {
                    name: cardholderName,
                },
            });
            if (pmError) {
                throw new Error(pmError.message);
            }
            // Attach payment method to customer (via API)
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'attach',
                    payment_method_id: paymentMethod.id,
                    customer_id: customerId,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to attach payment method');
            }
            // Clear form
            cardElement.clear();
            setCardholderName('');
            onSuccess(paymentMethod.id);
        }
        catch (err) {
            onError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setIsProcessing(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "cardholder-name", className: "block text-sm font-medium text-gray-700 mb-2", children: "Cardholder Name" }), _jsx("input", { id: "cardholder-name", type: "text", value: cardholderName, onChange: (e) => setCardholderName(e.target.value), placeholder: "John Doe", required: true, disabled: isProcessing, className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Card Details" }), _jsx("div", { className: "p-3 border border-gray-300 rounded-md bg-white", children: _jsx(CardElement, { options: {
                                style: {
                                    base: {
                                        fontSize: '16px',
                                        color: '#424770',
                                        '::placeholder': {
                                            color: '#aab7c4',
                                        },
                                    },
                                    invalid: {
                                        color: '#9e2146',
                                    },
                                },
                            } }) })] }), _jsx("button", { type: "submit", disabled: !stripe || isProcessing, className: "w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150", children: isProcessing ? (_jsxs("span", { className: "flex items-center justify-center", children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Processing..."] })) : ('Add Payment Method') })] }));
};
/**
 * Payment method manager component
 *
 * @example
 * ```tsx
 * <PaymentMethodManager
 *   stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
 *   customerId={organization.stripe_customer_id}
 *   apiEndpoint="/api/billing/payment-methods"
 *   onPaymentMethodAdded={(id) => console.log('Added:', id)}
 *   onPaymentMethodRemoved={(id) => console.log('Removed:', id)}
 * />
 * ```
 */
export const PaymentMethodManager = ({ stripePublishableKey, customerId, onPaymentMethodAdded, onPaymentMethodRemoved, apiEndpoint = '/api/billing/payment-methods', className = '', }) => {
    const [stripePromise] = useState(() => loadStripe(stripePublishableKey));
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    useEffect(() => {
        loadPaymentMethods();
    }, [customerId]);
    const loadPaymentMethods = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await fetch(`${apiEndpoint}?customer_id=${customerId}`);
            if (!response.ok) {
                throw new Error('Failed to load payment methods');
            }
            const data = await response.json();
            setPaymentMethods(data.payment_methods || []);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load payment methods');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handlePaymentMethodAdded = (paymentMethodId) => {
        setShowAddForm(false);
        loadPaymentMethods();
        onPaymentMethodAdded?.(paymentMethodId);
    };
    const handleRemovePaymentMethod = async (paymentMethodId) => {
        if (!confirm('Are you sure you want to remove this payment method?')) {
            return;
        }
        try {
            const response = await fetch(apiEndpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_method_id: paymentMethodId,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove payment method');
            }
            loadPaymentMethods();
            onPaymentMethodRemoved?.(paymentMethodId);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove payment method');
        }
    };
    const handleSetDefault = async (paymentMethodId) => {
        try {
            const response = await fetch(apiEndpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_default',
                    payment_method_id: paymentMethodId,
                    customer_id: customerId,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to set default payment method');
            }
            loadPaymentMethods();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set default payment method');
        }
    };
    const getCardBrandIcon = (brand) => {
        const brandLower = brand.toLowerCase();
        // Return card brand emoji or icon class
        switch (brandLower) {
            case 'visa':
                return '💳';
            case 'mastercard':
                return '💳';
            case 'amex':
                return '💳';
            case 'discover':
                return '💳';
            default:
                return '💳';
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: `animate-pulse ${className}`, children: _jsx("div", { className: "space-y-4", children: [1, 2].map((i) => (_jsx("div", { className: "h-24 bg-gray-200 rounded-lg" }, i))) }) }));
    }
    return (_jsxs("div", { className: className, children: [error && (_jsx("div", { className: "mb-4 bg-red-50 border border-red-200 rounded-md p-4", children: _jsx("p", { className: "text-sm text-red-800", children: error }) })), paymentMethods.length > 0 && (_jsxs("div", { className: "mb-6 space-y-3", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Payment Methods" }), paymentMethods.map((pm) => (_jsxs("div", { className: "flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("span", { className: "text-2xl", children: getCardBrandIcon(pm.card?.brand || 'card') }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-900 capitalize", children: [pm.card?.brand, " \u2022\u2022\u2022\u2022 ", pm.card?.last4] }), pm.is_default && (_jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800", children: "Default" }))] }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Expires ", pm.card?.exp_month, "/", pm.card?.exp_year] })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [!pm.is_default && (_jsx("button", { onClick: () => handleSetDefault(pm.id), className: "px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors", children: "Set as default" })), _jsx("button", { onClick: () => handleRemovePaymentMethod(pm.id), className: "px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors", "aria-label": "Remove payment method", children: "Remove" })] })] }, pm.id)))] })), showAddForm ? (_jsxs("div", { className: "border border-gray-200 rounded-lg p-6 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Add Payment Method" }), _jsx("button", { onClick: () => {
                                    setShowAddForm(false);
                                    setError('');
                                }, className: "text-gray-400 hover:text-gray-600", "aria-label": "Close form", children: _jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx(Elements, { stripe: stripePromise, children: _jsx(PaymentForm, { customerId: customerId, apiEndpoint: apiEndpoint, onSuccess: handlePaymentMethodAdded, onError: setError }) })] })) : (_jsx("button", { onClick: () => setShowAddForm(true), className: "w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors", children: "+ Add Payment Method" })), paymentMethods.length === 0 && !showAddForm && (_jsxs("div", { className: "text-center py-8", children: [_jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" }) }), _jsx("p", { className: "mt-2 text-sm text-gray-500", children: "No payment methods added yet" })] }))] }));
};
//# sourceMappingURL=PaymentMethodManager.js.map