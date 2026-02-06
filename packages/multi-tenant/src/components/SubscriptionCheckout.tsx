/**
 * SubscriptionCheckout Component
 * 
 * Handles subscription checkout flow using Stripe Checkout.
 * Supports plan selection, trial periods, and payment processing.
 * 
 * @module SubscriptionCheckout
 */

import React, { useState } from 'react';
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
export const SubscriptionCheckout: React.FC<SubscriptionCheckoutProps> = ({
  supabase,
  billingService,
  organizationId,
  priceId,
  planName,
  planPrice,
  planFeatures,
  trialPeriodDays = 0,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <h2 className="text-2xl font-bold">{planName} Plan</h2>
          <p className="text-3xl font-bold mt-2">{planPrice}</p>
          {trialPeriodDays > 0 && (
            <p className="text-sm mt-2 opacity-90">
              Includes {trialPeriodDays}-day free trial
            </p>
          )}
        </div>

        {/* Features */}
        <div className="px-6 py-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">What's included:</h3>
          <ul className="space-y-3">
            {planFeatures.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Terms */}
        <div className="px-6 py-6">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (error && e.target.checked) setError('');
              }}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
            <span className="ml-3 text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleCheckout}
              disabled={isProcessing || !agreedToTerms}
              className="w-full px-4 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
              ) : trialPeriodDays > 0 ? (
                `Start ${trialPeriodDays}-Day Free Trial`
              ) : (
                'Subscribe Now'
              )}
            </button>

            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Cancel
            </button>
          </div>

          {/* Trial Info */}
          {trialPeriodDays > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Trial Period:</strong> You won't be charged for {trialPeriodDays} days.
                Cancel anytime during the trial period to avoid charges.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
        <svg
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Secure checkout powered by Stripe
      </div>
    </div>
  );
};
