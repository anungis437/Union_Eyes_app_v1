/**
 * PlanSelector Component
 * 
 * Plan comparison and selection interface with upgrade/downgrade flows.
 * Displays all available billing plans with features and pricing.
 * 
 * @module PlanSelector
 */

import React, { useState } from 'react';
import { useBilling } from '../hooks/useBilling';

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

interface PlanDetails {
  name: string;
  displayName: string;
  price: number;
  interval: string;
  priceId: string;
  features: string[];
  limits: {
    users: number;
    matters: number;
    storage: number;
    apiCalls: number;
  };
  recommended?: boolean;
}

const plans: PlanDetails[] = [
  {
    name: 'free',
    displayName: 'Free',
    price: 0,
    interval: 'month',
    priceId: 'price_free',
    features: [
      'Basic case management',
      'Document storage',
      'Email support',
      'Basic reporting',
    ],
    limits: {
      users: 1,
      matters: 10,
      storage: 0.1, // GB
      apiCalls: 1000,
    },
  },
  {
    name: 'starter',
    displayName: 'Starter',
    price: 49,
    interval: 'month',
    priceId: 'price_starter',
    features: [
      'Everything in Free',
      'Team collaboration',
      'Advanced search',
      'Priority email support',
      'Custom fields',
      'Export to PDF',
    ],
    limits: {
      users: 5,
      matters: 100,
      storage: 10,
      apiCalls: 10000,
    },
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 149,
    interval: 'month',
    priceId: 'price_professional',
    features: [
      'Everything in Starter',
      'Advanced analytics',
      'AI-powered insights',
      'Workflow automation',
      'Phone & chat support',
      'API access',
      'Custom integrations',
      'SSO (SAML)',
    ],
    limits: {
      users: 20,
      matters: -1, // Unlimited
      storage: 100,
      apiCalls: 100000,
    },
    recommended: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 0, // Custom pricing
    interval: 'month',
    priceId: 'price_enterprise',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom onboarding',
      '24/7 phone support',
      'SLA guarantee',
      'Advanced security',
      'Custom contract',
      'Dedicated infrastructure',
    ],
    limits: {
      users: -1,
      matters: -1,
      storage: -1,
      apiCalls: -1,
    },
  },
];

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
export const PlanSelector: React.FC<PlanSelectorProps> = ({
  supabase,
  organizationId,
  stripeSecretKey,
  currentPlan = 'free',
  onSelect,
  className = '',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { usage } = useBilling({
    supabase,
    organizationId,
    stripeSecretKey,
    enableRealtime: false,
  });

  // Format currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format limit value
  const formatLimit = (value: number, unit: string): string => {
    if (value === -1) return 'Unlimited';
    return `${value}${unit}`;
  };

  // Check if downgrade is blocked due to usage
  const isDowngradeBlocked = (plan: PlanDetails): boolean => {
    if (!usage) return false;
    
    const exceedsUsers = plan.limits.users !== -1 && usage.current.active_users > plan.limits.users;
    const exceedsMatters = plan.limits.matters !== -1 && usage.current.matters_created > plan.limits.matters;
    const exceedsStorage = plan.limits.storage !== -1 && usage.current.storage_used_gb > plan.limits.storage;
    
    return exceedsUsers || exceedsMatters || exceedsStorage;
  };

  // Get button text and state
  const getButtonState = (plan: PlanDetails) => {
    const isCurrent = plan.name.toLowerCase() === currentPlan.toLowerCase();
    const isBlocked = isDowngradeBlocked(plan);
    
    if (isCurrent) {
      return {
        text: 'Current Plan',
        disabled: true,
        variant: 'secondary' as const,
      };
    }
    
    if (plan.name === 'enterprise') {
      return {
        text: 'Contact Sales',
        disabled: false,
        variant: 'primary' as const,
      };
    }
    
    if (isBlocked) {
      return {
        text: 'Usage Too High',
        disabled: true,
        variant: 'danger' as const,
      };
    }
    
    // Determine if upgrade or downgrade
    const planOrder = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan.toLowerCase());
    const planIndex = planOrder.indexOf(plan.name);
    
    if (planIndex > currentIndex) {
      return {
        text: 'Upgrade',
        disabled: false,
        variant: 'primary' as const,
      };
    } else {
      return {
        text: 'Downgrade',
        disabled: false,
        variant: 'secondary' as const,
      };
    }
  };

  const handleSelectPlan = (plan: PlanDetails) => {
    if (plan.name === 'enterprise') {
      // Open contact form or sales page
      window.open('mailto:sales@courtlens.com', '_blank');
      return;
    }
    
    setSelectedPlan(plan.name);
    onSelect(plan.name, plan.priceId);
  };

  return (
    <div className={className}>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-lg text-gray-600">
          Select the plan that best fits your firm's needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const buttonState = getButtonState(plan);
          const isBlocked = isDowngradeBlocked(plan);
          
          return (
            <div
              key={plan.name}
              className={`relative bg-white rounded-lg shadow-md overflow-hidden ${
                plan.recommended ? 'ring-2 ring-blue-500' : ''
              } ${isBlocked ? 'opacity-75' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  RECOMMENDED
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.displayName}
                </h3>
                
                <div className="mb-6">
                  {plan.price === 0 && plan.name !== 'free' ? (
                    <div className="text-2xl font-bold text-gray-900">Custom</div>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-500 ml-2">/ {plan.interval}</span>
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Users:</span>
                      <span className="font-medium text-gray-900">
                        {formatLimit(plan.limits.users, '')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matters:</span>
                      <span className="font-medium text-gray-900">
                        {formatLimit(plan.limits.matters, '')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage:</span>
                      <span className="font-medium text-gray-900">
                        {formatLimit(plan.limits.storage, ' GB')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">API Calls/day:</span>
                      <span className="font-medium text-gray-900">
                        {formatLimit(plan.limits.apiCalls, '')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isBlocked && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-800">
                      Your current usage exceeds this plan's limits. Reduce usage to downgrade.
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={buttonState.disabled || selectedPlan === plan.name}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    buttonState.variant === 'primary'
                      ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400'
                      : buttonState.variant === 'secondary'
                      ? 'text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-200 disabled:text-gray-500'
                      : 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {selectedPlan === plan.name ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
                    buttonState.text
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>All plans include a 14-day free trial. No credit card required.</p>
        <p className="mt-2">Questions? <a href="mailto:support@courtlens.com" className="text-blue-600 hover:text-blue-700">Contact our support team</a></p>
      </div>
    </div>
  );
};
