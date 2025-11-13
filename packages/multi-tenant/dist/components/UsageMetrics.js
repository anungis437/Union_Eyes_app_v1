import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useBilling } from '../hooks/useBilling';
const metrics = [
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
export const UsageMetricsDisplay = ({ supabase, organizationId, stripeSecretKey, showDetails = false, enableRealtime = true, className = '', }) => {
    const { usage, isLoading, error, getUsagePercentage, isWithinLimits, } = useBilling({
        supabase,
        organizationId,
        stripeSecretKey,
        enableRealtime,
    });
    // Get progress bar color based on percentage
    const getProgressColor = (percentage) => {
        if (percentage >= 100)
            return 'bg-red-500';
        if (percentage >= 80)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    // Get text color for percentage
    const getTextColor = (percentage) => {
        if (percentage >= 100)
            return 'text-red-600';
        if (percentage >= 80)
            return 'text-yellow-600';
        return 'text-green-600';
    };
    // Format limit display
    const formatLimit = (value, unit) => {
        if (value === -1)
            return 'Unlimited';
        return `${value}${unit ? ' ' + unit : ''}`;
    };
    // Get current value for a metric
    const getCurrentValue = (metric) => {
        if (!usage)
            return 0;
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
    const getLimitValue = (metric) => {
        if (!usage)
            return 0;
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
        return (_jsx("div", { className: `animate-pulse space-y-4 ${className}`, children: [1, 2, 3, 4].map((i) => (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-1/3" }), _jsx("div", { className: "h-2 bg-gray-200 rounded" })] }, i))) }));
    }
    if (error) {
        return (_jsx("div", { className: `bg-red-50 border border-red-200 rounded-md p-4 ${className}`, children: _jsxs("p", { className: "text-sm text-red-800", children: ["Failed to load usage metrics: ", error.message] }) }));
    }
    if (!usage) {
        return (_jsx("div", { className: `bg-gray-50 border border-gray-200 rounded-md p-4 ${className}`, children: _jsx("p", { className: "text-sm text-gray-600", children: "No usage data available" }) }));
    }
    return (_jsxs("div", { className: className, children: [!isWithinLimits && (_jsx("div", { className: "mb-6 bg-red-50 border border-red-200 rounded-md p-4", children: _jsxs("div", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-red-600 mt-0.5 flex-shrink-0", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }), _jsxs("div", { className: "ml-3", children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Usage Limit Exceeded" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: "You've exceeded one or more plan limits. Consider upgrading to avoid service interruption." })] })] }) })), _jsx("div", { className: "space-y-6", children: metrics.map((metric) => {
                    const currentValue = getCurrentValue(metric);
                    const limitValue = getLimitValue(metric);
                    const percentage = getUsagePercentage(metric.key);
                    const isUnlimited = limitValue === -1;
                    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: metric.label }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("span", { className: "text-sm text-gray-900 font-medium", children: [metric.formatValue(currentValue), " ", metric.unit] }), _jsx("span", { className: "text-sm text-gray-500", children: "/" }), _jsx("span", { className: "text-sm text-gray-500", children: formatLimit(limitValue, metric.unit) }), !isUnlimited && (_jsxs("span", { className: `text-sm font-medium ${getTextColor(percentage)}`, children: ["(", percentage.toFixed(0), "%)"] }))] })] }), !isUnlimited && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: `h-2.5 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`, style: { width: `${Math.min(percentage, 100)}%` }, "aria-label": `${percentage.toFixed(1)}% of ${metric.label.toLowerCase()} used` }) })), isUnlimited && (_jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [_jsx("svg", { className: "h-4 w-4 mr-1.5", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z", clipRule: "evenodd" }) }), "No limit on this plan"] })), showDetails && !isUnlimited && percentage > 0 && (_jsxs("div", { className: "mt-2 text-xs text-gray-500", children: [percentage >= 100 && (_jsxs("p", { className: "text-red-600", children: ["\u26A0\uFE0F You've exceeded your limit by ", metric.formatValue(currentValue - limitValue), " ", metric.unit] })), percentage >= 80 && percentage < 100 && (_jsxs("p", { className: "text-yellow-600", children: ["\u26A1 Approaching limit. ", metric.formatValue(limitValue - currentValue), " ", metric.unit, " remaining"] })), percentage < 80 && (_jsxs("p", { children: [metric.formatValue(limitValue - currentValue), " ", metric.unit, " remaining"] }))] }))] }, metric.key));
                }) }), showDetails && (_jsxs("div", { className: "mt-6 p-4 bg-gray-50 rounded-md", children: [_jsx("h4", { className: "text-sm font-medium text-gray-900 mb-3", children: "Additional Usage" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "Documents Uploaded" }), _jsx("p", { className: "font-medium text-gray-900 mt-1", children: usage.current.documents_uploaded.toLocaleString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "AI Queries" }), _jsx("p", { className: "font-medium text-gray-900 mt-1", children: usage.current.ai_queries.toLocaleString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "Exports Generated" }), _jsx("p", { className: "font-medium text-gray-900 mt-1", children: usage.current.exports_generated.toLocaleString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-500", children: "Analytics Used" }), _jsx("p", { className: "font-medium text-gray-900 mt-1", children: usage.current.advanced_analytics_used.toLocaleString() })] })] })] }))] }));
};
//# sourceMappingURL=UsageMetrics.js.map