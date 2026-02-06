/**
 * BillingDashboard Component
 * 
 * Comprehensive billing dashboard showing subscription details,
 * usage metrics, and quick actions for plan management.
 * 
 * @module BillingDashboard
 */

import React from 'react';
import { useBilling } from '../hooks/useBilling';

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
export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  supabase,
  organizationId,
  stripeSecretKey,
  enableRealtime = true,
  onUpgradeClick,
  onManageBillingClick,
  className = '',
}) => {
  const {
    subscription,
    usage,
    isLoading,
    error,
    isActive,
    isOnTrial,
    trialDaysRemaining,
    getUsagePercentage,
    isWithinLimits,
  } = useBilling({
    supabase,
    organizationId,
    stripeSecretKey,
    enableRealtime,
  });

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'past_due':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get usage color
  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Format currency
  const formatCurrency = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <p className="text-sm text-red-800">Failed to load billing information: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {subscription?.plan_name || 'Free'} Plan
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {subscription ? formatCurrency(subscription.amount_cents, subscription.currency) : '$0'} / {subscription?.billing_interval || 'month'}
            </p>
          </div>
          {subscription && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
                subscription.status
              )}`}
            >
              {subscription.status}
            </span>
          )}
        </div>

        {/* Trial Banner */}
        {isOnTrial && trialDaysRemaining !== null && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-600 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Trial Period Active</h3>
                <p className="mt-1 text-sm text-blue-700">
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining in your trial.
                  {subscription?.trial_end && ` Ends on ${formatDate(subscription.trial_end)}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Over Limit Warning */}
        {!isWithinLimits && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-600 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Usage Limit Exceeded</h3>
                <p className="mt-1 text-sm text-red-700">
                  You've exceeded your plan limits. Please upgrade to continue using all features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        {subscription && (
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-md">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Current Period</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </p>
            </div>
            {subscription.cancel_at_period_end && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Cancels On</p>
                <p className="mt-1 text-sm font-medium text-red-600">
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          {(!subscription || subscription.plan_name === 'free') && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Upgrade Plan
            </button>
          )}
          {subscription && subscription.plan_name !== 'free' && onManageBillingClick && (
            <button
              onClick={onManageBillingClick}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Usage Metrics */}
      {usage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>

          <div className="space-y-4">
            {/* Users */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Users</span>
                <span className="text-sm text-gray-500">
                  {usage.current.active_users} / {usage.limits.max_users}
                  {usage.limits.max_users === -1 && ' (Unlimited)'}
                </span>
              </div>
              {usage.limits.max_users !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                      getUsagePercentage('users')
                    )}`}
                    style={{ width: `${Math.min(getUsagePercentage('users'), 100)}%` }}
                    aria-label={`${getUsagePercentage('users')}% of users used`}
                  ></div>
                </div>
              )}
            </div>

            {/* Matters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Matters</span>
                <span className="text-sm text-gray-500">
                  {usage.current.matters_created} / {usage.limits.max_matters}
                  {usage.limits.max_matters === -1 && ' (Unlimited)'}
                </span>
              </div>
              {usage.limits.max_matters !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                      getUsagePercentage('matters')
                    )}`}
                    style={{ width: `${Math.min(getUsagePercentage('matters'), 100)}%` }}
                    aria-label={`${getUsagePercentage('matters')}% of matters used`}
                  ></div>
                </div>
              )}
            </div>

            {/* Storage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Storage</span>
                <span className="text-sm text-gray-500">
                  {usage.current.storage_used_gb.toFixed(2)} GB / {usage.limits.max_storage_gb} GB
                  {usage.limits.max_storage_gb === -1 && ' (Unlimited)'}
                </span>
              </div>
              {usage.limits.max_storage_gb !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                      getUsagePercentage('storage')
                    )}`}
                    style={{ width: `${Math.min(getUsagePercentage('storage'), 100)}%` }}
                    aria-label={`${getUsagePercentage('storage')}% of storage used`}
                  ></div>
                </div>
              )}
            </div>

            {/* API Calls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">API Calls (Daily)</span>
                <span className="text-sm text-gray-500">
                  {usage.current.api_calls} / {usage.limits.max_api_calls_per_day}
                  {usage.limits.max_api_calls_per_day === -1 && ' (Unlimited)'}
                </span>
              </div>
              {usage.limits.max_api_calls_per_day !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
                      getUsagePercentage('api_calls')
                    )}`}
                    style={{ width: `${Math.min(getUsagePercentage('api_calls'), 100)}%` }}
                    aria-label={`${getUsagePercentage('api_calls')}% of daily API calls used`}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
