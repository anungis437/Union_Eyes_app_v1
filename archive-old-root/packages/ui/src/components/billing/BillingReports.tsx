import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';

interface BillingReportData {
  period: string;
  totalBilled: number;
  totalCollected: number;
  outstandingAmount: number;
  timeEntries: number;
  averageRate: number;
  utilizationRate: number;
  realization: number;
}

interface ClientReportData {
  clientId: string;
  clientName: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  lastPayment?: Date;
  daysSinceLastPayment?: number;
}

interface MatterReportData {
  matterCode: string;
  clientName: string;
  description: string;
  budgetAmount?: number;
  billedAmount: number;
  budgetVariance?: number;
  timeSpent: number;
  status: 'active' | 'closed' | 'on-hold';
}

interface ReportFilters {
  dateRange: { start: Date; end: Date };
  clientId?: string;
  matterCode?: string;
  reportType: 'billing' | 'client' | 'matter' | 'time';
}

interface BillingReportsProps {
  billingData: BillingReportData[];
  clientData: ClientReportData[];
  matterData: MatterReportData[];
  clients: Array<{ id: string; name: string }>;
  matters: Array<{ code: string; description: string; clientName: string }>;
  onExportReport: (filters: ReportFilters, format: 'pdf' | 'excel' | 'csv') => Promise<void>;
  onGenerateInvoice: (clientId: string, matterCode?: string) => Promise<void>;
}

const BillingReports: React.FC<BillingReportsProps> = ({
  billingData,
  clientData,
  matterData,
  clients,
  matters,
  onExportReport,
  onGenerateInvoice,
}) => {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), 0, 1), // Start of current year
      end: new Date(),
    },
    reportType: 'billing',
  });

  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  // Calculate summary metrics
  const currentPeriodData = billingData[billingData.length - 1] || {
    totalBilled: 0,
    totalCollected: 0,
    outstandingAmount: 0,
    timeEntries: 0,
    averageRate: 0,
    utilizationRate: 0,
    realization: 0,
  };

  const totalOutstanding = clientData.reduce((sum, client) => sum + client.outstanding, 0);
  const totalOverdue = clientData.filter(c => 
    c.daysSinceLastPayment && c.daysSinceLastPayment > 30
  ).reduce((sum, client) => sum + client.outstanding, 0);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getOverdueStatus = (daysSinceLastPayment?: number): string => {
    if (!daysSinceLastPayment) return 'current';
    if (daysSinceLastPayment <= 30) return 'current';
    if (daysSinceLastPayment <= 60) return 'overdue-30';
    if (daysSinceLastPayment <= 90) return 'overdue-60';
    return 'overdue-90';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'current': return 'text-green-600 bg-green-50';
      case 'overdue-30': return 'text-yellow-600 bg-yellow-50';
      case 'overdue-60': return 'text-orange-600 bg-orange-50';
      case 'overdue-90': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMatterStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      case 'on-hold': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing Reports & Analytics</h1>
        <div className="space-x-3">
          <Button 
            variant="secondary" 
            onClick={() => onExportReport(filters, 'excel')}
          >
            Export Excel
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onExportReport(filters, 'pdf')}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Billed (YTD)</div>
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(currentPeriodData.totalBilled)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Realization: {formatPercent(currentPeriodData.realization)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Collected</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(currentPeriodData.totalCollected)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Collection Rate: {formatPercent(currentPeriodData.totalCollected / (currentPeriodData.totalBilled || 1))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Outstanding A/R</div>
          <div className="text-3xl font-bold text-orange-600">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-sm text-red-600 mt-1">
            Overdue: {formatCurrency(totalOverdue)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Utilization Rate</div>
          <div className="text-3xl font-bold text-purple-600">
            {formatPercent(currentPeriodData.utilizationRate)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Avg Rate: {formatCurrency(currentPeriodData.averageRate)}/hr
          </div>
        </Card>
      </div>

      {/* Report Filters */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                reportType: e.target.value as ReportFilters['reportType']
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Select report type"
            >
              <option value="billing">Billing Summary</option>
              <option value="client">Client Analysis</option>
              <option value="matter">Matter Analysis</option>
              <option value="time">Time Analysis</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Client Filter</label>
            <select
              value={filters.clientId || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                clientId: e.target.value || undefined 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Filter by specific client"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Matter Filter</label>
            <select
              value={filters.matterCode || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                matterCode: e.target.value || undefined 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Filter by specific matter"
            >
              <option value="">All Matters</option>
              {matters.map(matter => (
                <option key={matter.code} value={matter.code}>
                  {matter.code} - {matter.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Select report start date"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={filters.dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Select report end date"
            />
          </div>
        </div>
      </Card>

      {/* Billing Summary Report */}
      {filters.reportType === 'billing' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Billing Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Period</th>
                  <th className="text-right py-2">Billed</th>
                  <th className="text-right py-2">Collected</th>
                  <th className="text-right py-2">Outstanding</th>
                  <th className="text-right py-2">Time Entries</th>
                  <th className="text-right py-2">Avg Rate</th>
                  <th className="text-right py-2">Utilization</th>
                  <th className="text-right py-2">Realization</th>
                </tr>
              </thead>
              <tbody>
                {billingData.map((period) => (
                  <tr key={period.period} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{period.period}</td>
                    <td className="py-3 text-right">{formatCurrency(period.totalBilled)}</td>
                    <td className="py-3 text-right text-green-600">{formatCurrency(period.totalCollected)}</td>
                    <td className="py-3 text-right text-orange-600">{formatCurrency(period.outstandingAmount)}</td>
                    <td className="py-3 text-right">{period.timeEntries}</td>
                    <td className="py-3 text-right">{formatCurrency(period.averageRate)}</td>
                    <td className="py-3 text-right">{formatPercent(period.utilizationRate)}</td>
                    <td className="py-3 text-right">{formatPercent(period.realization)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Client Analysis Report */}
      {filters.reportType === 'client' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Client Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Client</th>
                  <th className="text-right py-2">Total Billed</th>
                  <th className="text-right py-2">Total Paid</th>
                  <th className="text-right py-2">Outstanding</th>
                  <th className="text-left py-2">Last Payment</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientData
                  .sort((a, b) => b.outstanding - a.outstanding)
                  .map((client) => {
                    const status = getOverdueStatus(client.daysSinceLastPayment);
                    return (
                      <tr key={client.clientId} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{client.clientName}</td>
                        <td className="py-3 text-right">{formatCurrency(client.totalBilled)}</td>
                        <td className="py-3 text-right text-green-600">{formatCurrency(client.totalPaid)}</td>
                        <td className="py-3 text-right font-semibold">
                          <span className={client.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {formatCurrency(client.outstanding)}
                          </span>
                        </td>
                        <td className="py-3 text-sm">
                          {client.lastPayment ? formatDate(client.lastPayment) : 'No payments'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {status === 'current' ? 'Current' : 
                             status === 'overdue-30' ? '30+ Days' :
                             status === 'overdue-60' ? '60+ Days' :
                             '90+ Days'}
                          </span>
                        </td>
                        <td className="py-3">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => onGenerateInvoice(client.clientId)}
                          >
                            Generate Invoice
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Matter Analysis Report */}
      {filters.reportType === 'matter' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Matter Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Matter Code</th>
                  <th className="text-left py-2">Client</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Budget</th>
                  <th className="text-right py-2">Billed</th>
                  <th className="text-right py-2">Variance</th>
                  <th className="text-right py-2">Time Spent</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {matterData
                  .sort((a, b) => b.billedAmount - a.billedAmount)
                  .map((matter) => (
                    <tr key={matter.matterCode} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-mono text-sm">{matter.matterCode}</td>
                      <td className="py-3">{matter.clientName}</td>
                      <td className="py-3">{matter.description}</td>
                      <td className="py-3 text-right">
                        {matter.budgetAmount ? formatCurrency(matter.budgetAmount) : '-'}
                      </td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(matter.billedAmount)}</td>
                      <td className="py-3 text-right">
                        {matter.budgetVariance !== undefined ? (
                          <span className={matter.budgetVariance < 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(matter.budgetVariance)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 text-right">{matter.timeSpent.toFixed(1)}h</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMatterStatusColor(matter.status)}`}>
                          {matter.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Time Analysis Chart Placeholder */}
      {filters.reportType === 'time' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Time Analysis</h2>
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg mb-2">Time Analysis Charts</div>
            <div className="text-sm">
              Visual charts showing time utilization, billing efficiency, and productivity metrics would be displayed here.
              Integration with charting libraries like Chart.js or D3.js would provide detailed visualizations.
            </div>
            <div className="mt-6 space-x-3">
              <Button variant="secondary" onClick={() => onExportReport(filters, 'excel')}>
                Export Time Data
              </Button>
              <Button variant="primary" onClick={() => alert('Chart functionality would be implemented here')}>
                View Interactive Charts
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BillingReports;
