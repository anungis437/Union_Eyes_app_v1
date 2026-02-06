import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * InvoiceList Component
 *
 * Displays a list of past invoices with download and view actions.
 * Integrates with Stripe to retrieve invoice history.
 *
 * @module InvoiceList
 */
import { useState, useEffect } from 'react';
/**
 * Invoice list component
 *
 * @example
 * ```tsx
 * <InvoiceList
 *   supabase={supabase}
 *   organizationId={orgId}
 *   stripeSecretKey={process.env.STRIPE_SECRET_KEY!}
 *   limit={10}
 * />
 * ```
 */
export const InvoiceList = ({ supabase, organizationId, stripeSecretKey, limit = 10, className = '', }) => {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadInvoices();
    }, [organizationId, limit]);
    const loadInvoices = async () => {
        try {
            setIsLoading(true);
            setError(null);
            // Get subscription for this organization
            const { data: subscription, error: subError } = await supabase
                .from('billing_subscriptions')
                .select('stripe_subscription_id, stripe_customer_id')
                .eq('organization_id', organizationId)
                .single();
            if (subError || !subscription?.stripe_customer_id) {
                setInvoices([]);
                setIsLoading(false);
                return;
            }
            // In a real implementation, this would call a backend API endpoint
            // that uses the Stripe SDK to list invoices
            // For now, we'll set empty array as placeholder
            // TODO: Implement backend API endpoint for listing Stripe invoices
            // Example of what the backend call would look like:
            // const response = await fetch('/api/billing/invoices', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({
            //     customer_id: subscription.stripe_customer_id,
            //     limit,
            //   }),
            // });
            // const data = await response.json();
            // setInvoices(data.invoices);
            setInvoices([]);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load invoices'));
        }
        finally {
            setIsLoading(false);
        }
    };
    // Format currency
    const formatCurrency = (cents, currency = 'usd') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(cents / 100);
    };
    // Format date
    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'open':
                return 'bg-blue-100 text-blue-800';
            case 'void':
                return 'bg-gray-100 text-gray-800';
            case 'uncollectible':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: `animate-pulse ${className}`, children: _jsx("div", { className: "space-y-4", children: [1, 2, 3].map((i) => (_jsx("div", { className: "h-16 bg-gray-200 rounded" }, i))) }) }));
    }
    if (error) {
        return (_jsx("div", { className: `bg-red-50 border border-red-200 rounded-md p-4 ${className}`, children: _jsxs("p", { className: "text-sm text-red-800", children: ["Failed to load invoices: ", error.message] }) }));
    }
    if (invoices.length === 0) {
        return (_jsxs("div", { className: `bg-gray-50 border border-gray-200 rounded-md p-8 text-center ${className}`, children: [_jsx("svg", { className: "mx-auto h-12 w-12 text-gray-400", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "No invoices" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "You don't have any invoices yet. They will appear here once you start a paid subscription." })] }));
    }
    return (_jsx("div", { className: className, children: _jsxs("div", { className: "bg-white shadow-md rounded-lg overflow-hidden", children: [_jsx("div", { className: "hidden sm:block", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Invoice" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Date" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Amount" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { scope: "col", className: "relative px-6 py-3", children: _jsx("span", { className: "sr-only", children: "Actions" }) })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: invoices.map((invoice) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: invoice.number || `INV-${invoice.id.slice(-8)}` }), _jsxs("div", { className: "text-sm text-gray-500", children: [formatDate(invoice.period_start), " - ", formatDate(invoice.period_end)] })] }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("div", { className: "text-sm text-gray-900", children: formatDate(invoice.created) }), invoice.due_date && (_jsxs("div", { className: "text-sm text-gray-500", children: ["Due: ", formatDate(invoice.due_date)] }))] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm font-medium text-gray-900", children: formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`, children: invoice.status }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsxs("div", { className: "flex items-center justify-end space-x-2", children: [invoice.invoice_pdf && (_jsx("a", { href: invoice.invoice_pdf, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-900", title: "Download PDF", children: _jsx("svg", { className: "h-5 w-5", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }) })), invoice.hosted_invoice_url && (_jsx("a", { href: invoice.hosted_invoice_url, target: "_blank", rel: "noopener noreferrer", className: "text-gray-600 hover:text-gray-900", title: "View in Stripe", children: _jsx("svg", { className: "h-5 w-5", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" }) }) }))] }) })] }, invoice.id))) })] }) }), _jsx("div", { className: "sm:hidden divide-y divide-gray-200", children: invoices.map((invoice) => (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: invoice.number || `INV-${invoice.id.slice(-8)}` }), _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`, children: invoice.status })] }), _jsx("div", { className: "text-sm text-gray-500 mb-2", children: formatDate(invoice.created) }), _jsx("div", { className: "text-lg font-semibold text-gray-900 mb-3", children: formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency) }), _jsxs("div", { className: "flex space-x-2", children: [invoice.invoice_pdf && (_jsx("a", { href: invoice.invoice_pdf, target: "_blank", rel: "noopener noreferrer", className: "flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50", children: "Download PDF" })), invoice.hosted_invoice_url && (_jsx("a", { href: invoice.hosted_invoice_url, target: "_blank", rel: "noopener noreferrer", className: "flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50", children: "View Details" }))] })] }, invoice.id))) })] }) }));
};
//# sourceMappingURL=InvoiceList.js.map