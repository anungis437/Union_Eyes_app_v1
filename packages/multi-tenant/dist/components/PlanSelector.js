import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PlanSelector Component
 *
 * Plan comparison and selection interface with upgrade/downgrade flows.
 * Displays all available billing plans with features and pricing.
 *
 * @module PlanSelector
 */
import { useState } from 'react';
import { useBilling } from '../hooks/useBilling';
const plans = [
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
export const PlanSelector = ({ supabase, organizationId, stripeSecretKey, currentPlan = 'free', onSelect, className = '', }) => {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const { usage } = useBilling({
        supabase,
        organizationId,
        stripeSecretKey,
        enableRealtime: false,
    });
    // Format currency
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(price);
    };
    // Format limit value
    const formatLimit = (value, unit) => {
        if (value === -1)
            return 'Unlimited';
        return `${value}${unit}`;
    };
    // Check if downgrade is blocked due to usage
    const isDowngradeBlocked = (plan) => {
        if (!usage)
            return false;
        const exceedsUsers = plan.limits.users !== -1 && usage.current.active_users > plan.limits.users;
        const exceedsMatters = plan.limits.matters !== -1 && usage.current.matters_created > plan.limits.matters;
        const exceedsStorage = plan.limits.storage !== -1 && usage.current.storage_used_gb > plan.limits.storage;
        return exceedsUsers || exceedsMatters || exceedsStorage;
    };
    // Get button text and state
    const getButtonState = (plan) => {
        const isCurrent = plan.name.toLowerCase() === currentPlan.toLowerCase();
        const isBlocked = isDowngradeBlocked(plan);
        if (isCurrent) {
            return {
                text: 'Current Plan',
                disabled: true,
                variant: 'secondary',
            };
        }
        if (plan.name === 'enterprise') {
            return {
                text: 'Contact Sales',
                disabled: false,
                variant: 'primary',
            };
        }
        if (isBlocked) {
            return {
                text: 'Usage Too High',
                disabled: true,
                variant: 'danger',
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
                variant: 'primary',
            };
        }
        else {
            return {
                text: 'Downgrade',
                disabled: false,
                variant: 'secondary',
            };
        }
    };
    const handleSelectPlan = (plan) => {
        if (plan.name === 'enterprise') {
            // Open contact form or sales page
            window.open('mailto:sales@courtlens.com', '_blank');
            return;
        }
        setSelectedPlan(plan.name);
        onSelect(plan.name, plan.priceId);
    };
    return (_jsxs("div", { className: className, children: [_jsxs("div", { className: "text-center mb-12", children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900 mb-4", children: "Choose Your Plan" }), _jsx("p", { className: "text-lg text-gray-600", children: "Select the plan that best fits your firm's needs" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: plans.map((plan) => {
                    const buttonState = getButtonState(plan);
                    const isBlocked = isDowngradeBlocked(plan);
                    return (_jsxs("div", { className: `relative bg-white rounded-lg shadow-md overflow-hidden ${plan.recommended ? 'ring-2 ring-blue-500' : ''} ${isBlocked ? 'opacity-75' : ''}`, children: [plan.recommended && (_jsx("div", { className: "absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg", children: "RECOMMENDED" })), _jsxs("div", { className: "p-6", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 mb-2", children: plan.displayName }), _jsx("div", { className: "mb-6", children: plan.price === 0 && plan.name !== 'free' ? (_jsx("div", { className: "text-2xl font-bold text-gray-900", children: "Custom" })) : (_jsxs("div", { children: [_jsx("span", { className: "text-4xl font-bold text-gray-900", children: formatPrice(plan.price) }), _jsxs("span", { className: "text-gray-500 ml-2", children: ["/ ", plan.interval] })] })) }), _jsx("div", { className: "mb-6 p-4 bg-gray-50 rounded-md", children: _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Users:" }), _jsx("span", { className: "font-medium text-gray-900", children: formatLimit(plan.limits.users, '') })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Matters:" }), _jsx("span", { className: "font-medium text-gray-900", children: formatLimit(plan.limits.matters, '') })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Storage:" }), _jsx("span", { className: "font-medium text-gray-900", children: formatLimit(plan.limits.storage, ' GB') })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "API Calls/day:" }), _jsx("span", { className: "font-medium text-gray-900", children: formatLimit(plan.limits.apiCalls, '') })] })] }) }), _jsx("ul", { className: "space-y-3 mb-6", children: plan.features.map((feature, index) => (_jsxs("li", { className: "flex items-start", children: [_jsx("svg", { className: "h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }), _jsx("span", { className: "text-sm text-gray-700", children: feature })] }, index))) }), isBlocked && (_jsx("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-md", children: _jsx("p", { className: "text-xs text-red-800", children: "Your current usage exceeds this plan's limits. Reduce usage to downgrade." }) })), _jsx("button", { onClick: () => handleSelectPlan(plan), disabled: buttonState.disabled || selectedPlan === plan.name, className: `w-full px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonState.variant === 'primary'
                                            ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400'
                                            : buttonState.variant === 'secondary'
                                                ? 'text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-200 disabled:text-gray-500'
                                                : 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400'} disabled:cursor-not-allowed disabled:opacity-50`, children: selectedPlan === plan.name ? (_jsxs("span", { className: "flex items-center justify-center", children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-current", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Processing..."] })) : (buttonState.text) })] })] }, plan.name));
                }) }), _jsxs("div", { className: "mt-12 text-center text-sm text-gray-500", children: [_jsx("p", { children: "All plans include a 14-day free trial. No credit card required." }), _jsxs("p", { className: "mt-2", children: ["Questions? ", _jsx("a", { href: "mailto:support@courtlens.com", className: "text-blue-600 hover:text-blue-700", children: "Contact our support team" })] })] })] }));
};
//# sourceMappingURL=PlanSelector.js.map