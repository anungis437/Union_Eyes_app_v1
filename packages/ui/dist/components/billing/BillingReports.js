import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';
const BillingReports = ({ billingData, clientData, matterData, clients, matters, onExportReport, onGenerateInvoice, }) => {
    const [filters, setFilters] = useState({
        dateRange: {
            start: new Date(new Date().getFullYear(), 0, 1), // Start of current year
            end: new Date(),
        },
        reportType: 'billing',
    });
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');
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
    const totalOverdue = clientData.filter(c => c.daysSinceLastPayment && c.daysSinceLastPayment > 30).reduce((sum, client) => sum + client.outstanding, 0);
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };
    const formatPercent = (value) => {
        return `${(value * 100).toFixed(1)}%`;
    };
    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };
    const getOverdueStatus = (daysSinceLastPayment) => {
        if (!daysSinceLastPayment)
            return 'current';
        if (daysSinceLastPayment <= 30)
            return 'current';
        if (daysSinceLastPayment <= 60)
            return 'overdue-30';
        if (daysSinceLastPayment <= 90)
            return 'overdue-60';
        return 'overdue-90';
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'current': return 'text-green-600 bg-green-50';
            case 'overdue-30': return 'text-yellow-600 bg-yellow-50';
            case 'overdue-60': return 'text-orange-600 bg-orange-50';
            case 'overdue-90': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };
    const getMatterStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-600 bg-green-50';
            case 'closed': return 'text-gray-600 bg-gray-50';
            case 'on-hold': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Billing Reports & Analytics" }), _jsxs("div", { className: "space-x-3", children: [_jsx(Button, { variant: "secondary", onClick: () => onExportReport(filters, 'excel'), children: "Export Excel" }), _jsx(Button, { variant: "secondary", onClick: () => onExportReport(filters, 'pdf'), children: "Export PDF" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6", children: [_jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Total Billed (YTD)" }), _jsx("div", { className: "text-3xl font-bold text-blue-600", children: formatCurrency(currentPeriodData.totalBilled) }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: ["Realization: ", formatPercent(currentPeriodData.realization)] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Total Collected" }), _jsx("div", { className: "text-3xl font-bold text-green-600", children: formatCurrency(currentPeriodData.totalCollected) }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: ["Collection Rate: ", formatPercent(currentPeriodData.totalCollected / (currentPeriodData.totalBilled || 1))] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Outstanding A/R" }), _jsx("div", { className: "text-3xl font-bold text-orange-600", children: formatCurrency(totalOutstanding) }), _jsxs("div", { className: "text-sm text-red-600 mt-1", children: ["Overdue: ", formatCurrency(totalOverdue)] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Utilization Rate" }), _jsx("div", { className: "text-3xl font-bold text-purple-600", children: formatPercent(currentPeriodData.utilizationRate) }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: ["Avg Rate: ", formatCurrency(currentPeriodData.averageRate), "/hr"] })] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Report Filters" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Report Type" }), _jsxs("select", { value: filters.reportType, onChange: (e) => setFilters(prev => ({
                                            ...prev,
                                            reportType: e.target.value
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select report type", children: [_jsx("option", { value: "billing", children: "Billing Summary" }), _jsx("option", { value: "client", children: "Client Analysis" }), _jsx("option", { value: "matter", children: "Matter Analysis" }), _jsx("option", { value: "time", children: "Time Analysis" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Client Filter" }), _jsxs("select", { value: filters.clientId || '', onChange: (e) => setFilters(prev => ({
                                            ...prev,
                                            clientId: e.target.value || undefined
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Filter by specific client", children: [_jsx("option", { value: "", children: "All Clients" }), clients.map(client => (_jsx("option", { value: client.id, children: client.name }, client.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Matter Filter" }), _jsxs("select", { value: filters.matterCode || '', onChange: (e) => setFilters(prev => ({
                                            ...prev,
                                            matterCode: e.target.value || undefined
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Filter by specific matter", children: [_jsx("option", { value: "", children: "All Matters" }), matters.map(matter => (_jsxs("option", { value: matter.code, children: [matter.code, " - ", matter.description] }, matter.code)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Start Date" }), _jsx("input", { type: "date", value: filters.dateRange.start.toISOString().split('T')[0], onChange: (e) => setFilters(prev => ({
                                            ...prev,
                                            dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select report start date" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "End Date" }), _jsx("input", { type: "date", value: filters.dateRange.end.toISOString().split('T')[0], onChange: (e) => setFilters(prev => ({
                                            ...prev,
                                            dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select report end date" })] })] })] }), filters.reportType === 'billing' && (_jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Billing Summary" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left py-2", children: "Period" }), _jsx("th", { className: "text-right py-2", children: "Billed" }), _jsx("th", { className: "text-right py-2", children: "Collected" }), _jsx("th", { className: "text-right py-2", children: "Outstanding" }), _jsx("th", { className: "text-right py-2", children: "Time Entries" }), _jsx("th", { className: "text-right py-2", children: "Avg Rate" }), _jsx("th", { className: "text-right py-2", children: "Utilization" }), _jsx("th", { className: "text-right py-2", children: "Realization" })] }) }), _jsx("tbody", { children: billingData.map((period) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "py-3 font-medium", children: period.period }), _jsx("td", { className: "py-3 text-right", children: formatCurrency(period.totalBilled) }), _jsx("td", { className: "py-3 text-right text-green-600", children: formatCurrency(period.totalCollected) }), _jsx("td", { className: "py-3 text-right text-orange-600", children: formatCurrency(period.outstandingAmount) }), _jsx("td", { className: "py-3 text-right", children: period.timeEntries }), _jsx("td", { className: "py-3 text-right", children: formatCurrency(period.averageRate) }), _jsx("td", { className: "py-3 text-right", children: formatPercent(period.utilizationRate) }), _jsx("td", { className: "py-3 text-right", children: formatPercent(period.realization) })] }, period.period))) })] }) })] })), filters.reportType === 'client' && (_jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Client Analysis" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left py-2", children: "Client" }), _jsx("th", { className: "text-right py-2", children: "Total Billed" }), _jsx("th", { className: "text-right py-2", children: "Total Paid" }), _jsx("th", { className: "text-right py-2", children: "Outstanding" }), _jsx("th", { className: "text-left py-2", children: "Last Payment" }), _jsx("th", { className: "text-left py-2", children: "Status" }), _jsx("th", { className: "text-left py-2", children: "Actions" })] }) }), _jsx("tbody", { children: clientData
                                        .sort((a, b) => b.outstanding - a.outstanding)
                                        .map((client) => {
                                        const status = getOverdueStatus(client.daysSinceLastPayment);
                                        return (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "py-3 font-medium", children: client.clientName }), _jsx("td", { className: "py-3 text-right", children: formatCurrency(client.totalBilled) }), _jsx("td", { className: "py-3 text-right text-green-600", children: formatCurrency(client.totalPaid) }), _jsx("td", { className: "py-3 text-right font-semibold", children: _jsx("span", { className: client.outstanding > 0 ? 'text-orange-600' : 'text-green-600', children: formatCurrency(client.outstanding) }) }), _jsx("td", { className: "py-3 text-sm", children: client.lastPayment ? formatDate(client.lastPayment) : 'No payments' }), _jsx("td", { className: "py-3", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`, children: status === 'current' ? 'Current' :
                                                            status === 'overdue-30' ? '30+ Days' :
                                                                status === 'overdue-60' ? '60+ Days' :
                                                                    '90+ Days' }) }), _jsx("td", { className: "py-3", children: _jsx(Button, { variant: "secondary", size: "sm", onClick: () => onGenerateInvoice(client.clientId), children: "Generate Invoice" }) })] }, client.clientId));
                                    }) })] }) })] })), filters.reportType === 'matter' && (_jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Matter Analysis" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left py-2", children: "Matter Code" }), _jsx("th", { className: "text-left py-2", children: "Client" }), _jsx("th", { className: "text-left py-2", children: "Description" }), _jsx("th", { className: "text-right py-2", children: "Budget" }), _jsx("th", { className: "text-right py-2", children: "Billed" }), _jsx("th", { className: "text-right py-2", children: "Variance" }), _jsx("th", { className: "text-right py-2", children: "Time Spent" }), _jsx("th", { className: "text-left py-2", children: "Status" })] }) }), _jsx("tbody", { children: matterData
                                        .sort((a, b) => b.billedAmount - a.billedAmount)
                                        .map((matter) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "py-3 font-mono text-sm", children: matter.matterCode }), _jsx("td", { className: "py-3", children: matter.clientName }), _jsx("td", { className: "py-3", children: matter.description }), _jsx("td", { className: "py-3 text-right", children: matter.budgetAmount ? formatCurrency(matter.budgetAmount) : '-' }), _jsx("td", { className: "py-3 text-right font-semibold", children: formatCurrency(matter.billedAmount) }), _jsx("td", { className: "py-3 text-right", children: matter.budgetVariance !== undefined ? (_jsx("span", { className: matter.budgetVariance < 0 ? 'text-red-600' : 'text-green-600', children: formatCurrency(matter.budgetVariance) })) : '-' }), _jsxs("td", { className: "py-3 text-right", children: [matter.timeSpent.toFixed(1), "h"] }), _jsx("td", { className: "py-3", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getMatterStatusColor(matter.status)}`, children: matter.status.replace('-', ' ').toUpperCase() }) })] }, matter.matterCode))) })] }) })] })), filters.reportType === 'time' && (_jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Time Analysis" }), _jsxs("div", { className: "text-center py-12 text-gray-500", children: [_jsx("div", { className: "text-lg mb-2", children: "Time Analysis Charts" }), _jsx("div", { className: "text-sm", children: "Visual charts showing time utilization, billing efficiency, and productivity metrics would be displayed here. Integration with charting libraries like Chart.js or D3.js would provide detailed visualizations." }), _jsxs("div", { className: "mt-6 space-x-3", children: [_jsx(Button, { variant: "secondary", onClick: () => onExportReport(filters, 'excel'), children: "Export Time Data" }), _jsx(Button, { variant: "primary", onClick: () => alert('Chart functionality would be implemented here'), children: "View Interactive Charts" })] })] })] }))] }));
};
export default BillingReports;
//# sourceMappingURL=BillingReports.js.map