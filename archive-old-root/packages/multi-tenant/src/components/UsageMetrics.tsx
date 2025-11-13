/**
 * UsageMetricsDisplay Component
 * 
 * Displays usage metrics with progress bars showing current usage
 * against plan limits. Color-coded to indicate usage levels.
 * 
 * @module UsageMetricsDisplay
 */

import React from 'react';
import { useBilling } from '../hooks/useBilling';

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

interface MetricConfig {
  key: 'users' | 'matters' | 'storage' | 'api_calls';
  label: string;
  unit: string;
  formatValue: (value: number) => string;
}

const metrics: MetricConfig[] = [
  {
    key: 'users',
    label: 'Active Users',
    unit: '',
    formatValue: (value) => value.toString(),
  },
  {
    key: 'matters',
    label: 'Matters Created',
    unit: '',
    formatValue: (value) => value.toString(),
  },
  {
    key: 'storage',
    label: 'Storage Used',
    unit: 'GB',
    formatValue: (value) => value.toFixed(2),
  },
  {
    key: 'api_calls',
    label: 'API Calls (Daily)',
    unit: '',
    formatValue: (value) => value.toLocaleString(),
  },
];

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
export const UsageMetricsDisplay: React.FC<UsageMetricsDisplayProps> = ({
  supabase,
  organizationId,
  stripeSecretKey,
  showDetails = false,
  enableRealtime = true,
  className = '',
}) => {
  const {
    usage,
    isLoading,
    error,
    getUsagePercentage,
    isWithinLimits,
  } = useBilling({
    supabase,
    organizationId,
    stripeSecretKey,
    enableRealtime,
  });

  // Get progress bar color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get text color for percentage
  const getTextColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Format limit display
  const formatLimit = (value: number, unit: string): string => {
    if (value === -1) return 'Unlimited';
    return `${value}${unit ? ' ' + unit : ''}`;
  };

  // Get current value for a metric
  const getCurrentValue = (metric: MetricConfig): number => {
    if (!usage) return 0;
    
    switch (metric.key) {
      case 'users':
        return usage.current.active_users;
      case 'matters':
        return usage.current.matters_created;
      case 'storage':
        return usage.current.storage_used_gb;
      case 'api_calls':
        return usage.current.api_calls;
      default:
        return 0;
    }
  };

  // Get limit value for a metric
  const getLimitValue = (metric: MetricConfig): number => {
    if (!usage) return 0;
    
    switch (metric.key) {
      case 'users':
        return usage.limits.max_users;
      case 'matters':
        return usage.limits.max_matters;
      case 'storage':
        return usage.limits.max_storage_gb;
      case 'api_calls':
        return usage.limits.max_api_calls_per_day;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <p className="text-sm text-red-800">Failed to load usage metrics: {error.message}</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-md p-4 ${className}`}>
        <p className="text-sm text-gray-600">No usage data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Overall Status */}
      {!isWithinLimits && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
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
                You've exceeded one or more plan limits. Consider upgrading to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="space-y-6">
        {metrics.map((metric) => {
          const currentValue = getCurrentValue(metric);
          const limitValue = getLimitValue(metric);
          const percentage = getUsagePercentage(metric.key);
          const isUnlimited = limitValue === -1;
          
          return (
            <div key={metric.key}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900 font-medium">
                    {metric.formatValue(currentValue)} {metric.unit}
                  </span>
                  <span className="text-sm text-gray-500">/</span>
                  <span className="text-sm text-gray-500">
                    {formatLimit(limitValue, metric.unit)}
                  </span>
                  {!isUnlimited && (
                    <span className={`text-sm font-medium ${getTextColor(percentage)}`}>
                      ({percentage.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {!isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                    aria-label={`${percentage.toFixed(1)}% of ${metric.label.toLowerCase()} used`}
                  ></div>
                </div>
              )}

              {/* Unlimited Indicator */}
              {isUnlimited && (
                <div className="flex items-center text-sm text-gray-500">
                  <svg
                    className="h-4 w-4 mr-1.5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  No limit on this plan
                </div>
              )}

              {/* Detailed Info */}
              {showDetails && !isUnlimited && percentage > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {percentage >= 100 && (
                    <p className="text-red-600">
                      ⚠️ You've exceeded your limit by {metric.formatValue(currentValue - limitValue)} {metric.unit}
                    </p>
                  )}
                  {percentage >= 80 && percentage < 100 && (
                    <p className="text-yellow-600">
                      ⚡ Approaching limit. {metric.formatValue(limitValue - currentValue)} {metric.unit} remaining
                    </p>
                  )}
                  {percentage < 80 && (
                    <p>
                      {metric.formatValue(limitValue - currentValue)} {metric.unit} remaining
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Usage Info */}
      {showDetails && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Usage</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Documents Uploaded</p>
              <p className="font-medium text-gray-900 mt-1">{usage.current.documents_uploaded.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">AI Queries</p>
              <p className="font-medium text-gray-900 mt-1">{usage.current.ai_queries.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Exports Generated</p>
              <p className="font-medium text-gray-900 mt-1">{usage.current.exports_generated.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Analytics Used</p>
              <p className="font-medium text-gray-900 mt-1">{usage.current.advanced_analytics_used.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
