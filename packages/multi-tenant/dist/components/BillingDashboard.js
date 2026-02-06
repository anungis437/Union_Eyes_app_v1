import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useBilling } from '../hooks/useBilling';
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
export const BillingDashboard = ({ supabase, organizationId, stripeSecretKey, enableRealtime = true, onUpgradeClick, onManageBillingClick, className = '', }) => {
    const { subscription, usage, isLoading, error, isActive, isOnTrial, trialDaysRemaining, getUsagePercentage, isWithinLimits, } = useBilling({
        supabase,
        organizationId,
        stripeSecretKey,
        enableRealtime,
    });
    // Get status badge color
    const getStatusColor = (status) => {
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
    const getUsageColor = (percentage) => {
        if (percentage >= 90)
            return 'bg-red-500';
        if (percentage >= 75)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    // Format currency
    const formatCurrency = (cents, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(cents / 100);
    };
    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };
    if (isLoading) {
        return (_jsx("div", { className: `animate-pulse ${className}`, children: _jsx("div", { className: "h-96 bg-gray-200 rounded-lg" }) }));
    }
    if (error) {
        return (_jsx("div", { className: `bg-red-50 border border-red-200 rounded-lg p-6 ${className}`, children: _jsxs("p", { className: "text-sm text-red-800", children: ["Failed to load billing information: ", error.message] }) }));
    }
    return (_jsxs("div", { className: `space-y-6 ${className}`, children: [_jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-bold text-gray-900 capitalize", children: [subscription?.plan_name || 'Free', " Plan"] }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: [subscription ? formatCurrency(subscription.amount_cents, subscription.currency) : '$0', " / ", subscription?.billing_interval || 'month'] })] }), subscription && (_jsx("span", { className: `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(subscription.status)}`, children: subscription.status }))] }), isOnTrial && trialDaysRemaining !== null && (_jsx("div", { className: "mb-6 bg-blue-50 border border-blue-200 rounded-md p-4", children: _jsxs("div", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-blue-600 mt-0.5", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-blue-800", children: "Trial Period Active" }), _jsxs("p", { className: "mt-1 text-sm text-blue-700", children: [trialDaysRemaining, " day", trialDaysRemaining !== 1 ? 's' : '', " remaining in your trial.", subscription?.trial_end && ` Ends on ${formatDate(subscription.trial_end)}.`] })] })] }) })), !isWithinLimits && (_jsx("div", { className: "mb-6 bg-red-50 border border-red-200 rounded-md p-4", children: _jsxs("div", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-red-600 mt-0.5", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Usage Limit Exceeded" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: "You've exceeded your plan limits. Please upgrade to continue using all features." })] })] }) })), subscription && (_jsxs("div", { className: "grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-md", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 uppercase tracking-wider", children: "Current Period" }), _jsxs("p", { className: "mt-1 text-sm font-medium text-gray-900", children: [formatDate(subscription.current_period_start), " - ", formatDate(subscription.current_period_end)] })] }), subscription.cancel_at_period_end && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 uppercase tracking-wider", children: "Cancels On" }), _jsx("p", { className: "mt-1 text-sm font-medium text-red-600", children: formatDate(subscription.current_period_end) })] }))] })), _jsxs("div", { className: "flex space-x-3", children: [(!subscription || subscription.plan_name === 'free') && onUpgradeClick && (_jsx("button", { onClick: onUpgradeClick, className: "flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150", children: "Upgrade Plan" })), subscription && subscription.plan_name !== 'free' && onManageBillingClick && (_jsx("button", { onClick: onManageBillingClick, className: "flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150", children: "Manage Billing" }))] })] }), usage && (_jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Usage This Month" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Users" }), _jsxs("span", { className: "text-sm text-gray-500", children: [usage.current.active_users, " / ", usage.limits.max_users, usage.limits.max_users === -1 && ' (Unlimited)'] })] }), usage.limits.max_users !== -1 && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getUsageColor(getUsagePercentage('users'))}`, style: { width: `${Math.min(getUsagePercentage('users'), 100)}%` }, "aria-label": `${getUsagePercentage('users')}% of users used` }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Matters" }), _jsxs("span", { className: "text-sm text-gray-500", children: [usage.current.matters_created, " / ", usage.limits.max_matters, usage.limits.max_matters === -1 && ' (Unlimited)'] })] }), usage.limits.max_matters !== -1 && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getUsageColor(getUsagePercentage('matters'))}`, style: { width: `${Math.min(getUsagePercentage('matters'), 100)}%` }, "aria-label": `${getUsagePercentage('matters')}% of matters used` }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Storage" }), _jsxs("span", { className: "text-sm text-gray-500", children: [usage.current.storage_used_gb.toFixed(2), " GB / ", usage.limits.max_storage_gb, " GB", usage.limits.max_storage_gb === -1 && ' (Unlimited)'] })] }), usage.limits.max_storage_gb !== -1 && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getUsageColor(getUsagePercentage('storage'))}`, style: { width: `${Math.min(getUsagePercentage('storage'), 100)}%` }, "aria-label": `${getUsagePercentage('storage')}% of storage used` }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "API Calls (Daily)" }), _jsxs("span", { className: "text-sm text-gray-500", children: [usage.current.api_calls, " / ", usage.limits.max_api_calls_per_day, usage.limits.max_api_calls_per_day === -1 && ' (Unlimited)'] })] }), usage.limits.max_api_calls_per_day !== -1 && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${getUsageColor(getUsagePercentage('api_calls'))}`, style: { width: `${Math.min(getUsagePercentage('api_calls'), 100)}%` }, "aria-label": `${getUsagePercentage('api_calls')}% of daily API calls used` }) }))] })] })] }))] }));
};
//# sourceMappingURL=BillingDashboard.js.map