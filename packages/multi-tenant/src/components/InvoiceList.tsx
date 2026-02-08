/**
 * InvoiceList Component
 * 
 * Displays a list of past invoices with download and view actions.
 * Integrates with Stripe to retrieve invoice history.
 * 
 * @module InvoiceList
 */

import React, { useState, useEffect } from 'react';

export interface InvoiceListProps {
  /** Supabase client instance */
  supabase: any;
  
  /** Organization ID */
  organizationId: string;
  
  /** Stripe secret key */
  stripeSecretKey: string;
  
  /** Maximum number of invoices to display */
  limit?: number;
  
  /** Additional CSS classes */
  className?: string;
}

interface Invoice {
  id: string;
  number: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  due_date: number | null;
  hosted_invoice_url: string;
  invoice_pdf: string;
  period_start: number;
  period_end: number;
}

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
export const InvoiceList: React.FC<InvoiceListProps> = ({
  supabase,
  organizationId,
  stripeSecretKey,
  limit = 10,
  className = '',
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

      // Fetch invoices from backend API
      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: subscription.stripe_customer_id,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load invoices'));
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (cents: number, currency: string = 'usd'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
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
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <p className="text-sm text-red-800">Failed to load invoices: {error.message}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-md p-8 text-center ${className}`}>
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any invoices yet. They will appear here once you start a paid subscription.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Invoice
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.number || `INV-${invoice.id.slice(-8)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(invoice.created)}</div>
                    {invoice.due_date && (
                      <div className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {invoice.invoice_pdf && (
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                          title="Download PDF"
                        >
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </a>
                      )}
                      {invoice.hosted_invoice_url && (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900"
                          title="View in Stripe"
                        >
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">
                  {invoice.number || `INV-${invoice.id.slice(-8)}`}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                    invoice.status
                  )}`}
                >
                  {invoice.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-2">
                {formatDate(invoice.created)}
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-3">
                {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
              </div>
              <div className="flex space-x-2">
                {invoice.invoice_pdf && (
                  <a
                    href={invoice.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Download PDF
                  </a>
                )}
                {invoice.hosted_invoice_url && (
                  <a
                    href={invoice.hosted_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View Details
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
