/**
 * PaymentMethodManager Component
 * 
 * Manages payment methods using Stripe Elements.
 * Allows adding, viewing, and removing payment methods.
 * 
 * @module PaymentMethodManager
 */

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

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

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    name?: string;
    email?: string;
  };
  created: number;
  is_default?: boolean;
}

/**
 * Payment form component (uses Stripe Elements)
 */
const PaymentForm: React.FC<{
  customerId: string;
  apiEndpoint: string;
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
}> = ({ customerId, apiEndpoint, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
          payment_method_id: paymentMethod!.id,
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
      
      onSuccess(paymentMethod!.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-700 mb-2">
          Cardholder Name
        </label>
        <input
          id="cardholder-name"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          required
          disabled={isProcessing}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="p-3 border border-gray-300 rounded-md bg-white">
          <CardElement
            options={{
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
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </span>
        ) : (
          'Add Payment Method'
        )}
      </button>
    </form>
  );
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
 *   onPaymentMethodAdded={(id) => undefined}
 *   onPaymentMethodRemoved={(id) => undefined}
 * />
 * ```
 */
export const PaymentMethodManager: React.FC<PaymentMethodManagerProps> = ({
  stripePublishableKey,
  customerId,
  onPaymentMethodAdded,
  onPaymentMethodRemoved,
  apiEndpoint = '/api/billing/payment-methods',
  className = '',
}) => {
  const [stripePromise] = useState(() => loadStripe(stripePublishableKey));
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentMethodAdded = (paymentMethodId: string) => {
    setShowAddForm(false);
    loadPaymentMethods();
    onPaymentMethodAdded?.(paymentMethodId);
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
    }
  };

  const getCardBrandIcon = (brand: string): string => {
    const brandLower = brand.toLowerCase();
    // Return card brand emoji or icon class
    switch (brandLower) {
      case 'visa':
        return 'ðŸ’³';
      case 'mastercard':
        return 'ðŸ’³';
      case 'amex':
        return 'ðŸ’³';
      case 'discover':
        return 'ðŸ’³';
      default:
        return 'ðŸ’³';
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Existing Payment Methods */}
      {paymentMethods.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getCardBrandIcon(pm.card?.brand || 'card')}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {pm.card?.brand} â€¢â€¢â€¢â€¢ {pm.card?.last4}
                    </span>
                    {pm.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Expires {pm.card?.exp_month}/{pm.card?.exp_year}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!pm.is_default && (
                  <button
                    onClick={() => handleSetDefault(pm.id)}
                    className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  >
                    Set as default
                  </button>
                )}
                <button
                  onClick={() => handleRemovePaymentMethod(pm.id)}
                  className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  aria-label="Remove payment method"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Payment Method Form */}
      {showAddForm ? (
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setError('');
              }}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close form"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <Elements stripe={stripePromise}>
            <PaymentForm
              customerId={customerId}
              apiEndpoint={apiEndpoint}
              onSuccess={handlePaymentMethodAdded}
              onError={setError}
            />
          </Elements>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add Payment Method
        </button>
      )}

      {paymentMethods.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No payment methods added yet</p>
        </div>
      )}
    </div>
  );
};
