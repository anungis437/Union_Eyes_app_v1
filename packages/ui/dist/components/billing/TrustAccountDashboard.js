import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';
const TrustAccountDashboard = ({ transactions, balances, onAddTransaction, onReconcileTransaction, onGenerateReport, }) => {
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [selectedClient, setSelectedClient] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
    });
    // Calculate total trust balance
    const totalTrustBalance = balances.reduce((sum, balance) => sum + balance.balance, 0);
    // Filter transactions based on selected filters
    const filteredTransactions = transactions.filter(transaction => {
        const matchesClient = !selectedClient || transaction.clientId === selectedClient;
        const matchesType = filterType === 'all' || transaction.type === filterType;
        const matchesDate = transaction.date >= dateRange.start && transaction.date <= dateRange.end;
        return matchesClient && matchesType && matchesDate;
    });
    // Get unreconciled transactions
    const unreconciledTransactions = transactions.filter(t => !t.isReconciled);
    // Get unique clients for filter dropdown
    const clients = Array.from(new Map(transactions.map(t => [t.clientId, { id: t.clientId, name: t.clientName }])).values());
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };
    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };
    const getTransactionTypeColor = (type) => {
        switch (type) {
            case 'deposit': return 'text-green-600 bg-green-50';
            case 'withdrawal': return 'text-red-600 bg-red-50';
            case 'transfer': return 'text-blue-600 bg-blue-50';
            case 'adjustment': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Trust Account Management" }), _jsxs("div", { className: "space-x-3", children: [_jsx(Button, { variant: "secondary", onClick: () => onGenerateReport('monthly'), children: "Monthly Report" }), _jsx(Button, { variant: "secondary", onClick: () => onGenerateReport('quarterly'), children: "Quarterly Report" }), _jsx(Button, { variant: "primary", onClick: () => setShowTransactionForm(true), children: "Add Transaction" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6", children: [_jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Total Trust Balance" }), _jsx("div", { className: "text-3xl font-bold text-green-600", children: formatCurrency(totalTrustBalance) })] }), _jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Active Clients" }), _jsx("div", { className: "text-3xl font-bold", children: balances.filter(b => b.balance > 0).length })] }), _jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "Unreconciled Transactions" }), _jsx("div", { className: "text-3xl font-bold text-orange-600", children: unreconciledTransactions.length })] }), _jsxs(Card, { className: "p-6", children: [_jsx("div", { className: "text-sm font-medium text-gray-600", children: "This Month's Activity" }), _jsx("div", { className: "text-3xl font-bold", children: transactions.filter(t => t.date.getMonth() === new Date().getMonth() &&
                                    t.date.getFullYear() === new Date().getFullYear()).length })] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Client Trust Balances" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left py-2", children: "Client" }), _jsx("th", { className: "text-left py-2", children: "Matter" }), _jsx("th", { className: "text-right py-2", children: "Balance" }), _jsx("th", { className: "text-left py-2", children: "Last Activity" }), _jsx("th", { className: "text-left py-2", children: "Actions" })] }) }), _jsx("tbody", { children: balances
                                        .filter(balance => balance.balance !== 0)
                                        .sort((a, b) => b.balance - a.balance)
                                        .map((balance) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "py-3", children: balance.clientName }), _jsx("td", { className: "py-3 font-mono text-sm", children: balance.matterCode }), _jsx("td", { className: "py-3 text-right font-semibold", children: _jsx("span", { className: balance.balance >= 0 ? 'text-green-600' : 'text-red-600', children: formatCurrency(balance.balance) }) }), _jsx("td", { className: "py-3 text-sm text-gray-600", children: formatDate(balance.lastActivity) }), _jsx("td", { className: "py-3", children: _jsx(Button, { variant: "secondary", size: "sm", onClick: () => {
                                                        setSelectedClient(balance.clientId);
                                                        setShowTransactionForm(true);
                                                    }, children: "Add Transaction" }) })] }, `${balance.clientId}-${balance.matterCode}`))) })] }) })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Transaction History" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Client Filter" }), _jsxs("select", { value: selectedClient, onChange: (e) => setSelectedClient(e.target.value), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Filter transactions by client", children: [_jsx("option", { value: "", children: "All Clients" }), clients.map(client => (_jsx("option", { value: client.id, children: client.name }, client.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Transaction Type" }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Filter by transaction type", children: [_jsx("option", { value: "all", children: "All Types" }), _jsx("option", { value: "deposit", children: "Deposits" }), _jsx("option", { value: "withdrawal", children: "Withdrawals" }), _jsx("option", { value: "transfer", children: "Transfers" }), _jsx("option", { value: "adjustment", children: "Adjustments" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Start Date" }), _jsx("input", { type: "date", value: dateRange.start.toISOString().split('T')[0], onChange: (e) => setDateRange(prev => ({
                                            ...prev,
                                            start: new Date(e.target.value)
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select start date for transaction filter" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "End Date" }), _jsx("input", { type: "date", value: dateRange.end.toISOString().split('T')[0], onChange: (e) => setDateRange(prev => ({
                                            ...prev,
                                            end: new Date(e.target.value)
                                        })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select end date for transaction filter" })] })] }), _jsxs("div", { className: "space-y-3", children: [filteredTransactions
                                .sort((a, b) => b.date.getTime() - a.date.getTime())
                                .map((transaction) => (_jsxs("div", { className: `p-4 border rounded-lg ${transaction.isReconciled ? 'bg-white' : 'bg-yellow-50 border-yellow-200'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: `px-3 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`, children: transaction.type.toUpperCase() }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: transaction.clientName }), _jsxs("div", { className: "text-sm text-gray-600", children: [transaction.matterCode, " \u2022 ", formatDate(transaction.date)] })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: `text-lg font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`, children: [transaction.amount >= 0 ? '+' : '', formatCurrency(transaction.amount)] }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Balance: ", formatCurrency(transaction.balance)] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [!transaction.isReconciled && (_jsx(Button, { variant: "success", size: "sm", className: "bg-green-600 hover:bg-green-700 text-white", onClick: () => onReconcileTransaction(transaction.id), children: "Reconcile" })), transaction.isReconciled && (_jsx("div", { className: "text-green-600 text-sm font-medium", children: "\u2713 Reconciled" }))] })] }), _jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "text-sm", children: transaction.description }), transaction.reference && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["Reference: ", transaction.reference] }))] })] }, transaction.id))), filteredTransactions.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No transactions found matching the current filters." }))] })] }), showTransactionForm && (_jsx(TrustTransactionForm, { selectedClientId: selectedClient, clients: clients, onSubmit: async (transaction) => {
                    await onAddTransaction(transaction);
                    setShowTransactionForm(false);
                    setSelectedClient('');
                }, onCancel: () => {
                    setShowTransactionForm(false);
                    setSelectedClient('');
                } }))] }));
};
const TrustTransactionForm = ({ selectedClientId, clients, onSubmit, onCancel, }) => {
    const [formData, setFormData] = useState({
        clientId: selectedClientId || '',
        type: 'deposit',
        amount: 0,
        description: '',
        date: new Date(),
        reference: '',
        matterCode: '',
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.clientId || !formData.type || !formData.amount || !formData.description) {
            alert('Please fill in all required fields.');
            return;
        }
        onSubmit(formData);
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs(Card, { className: "p-6 max-w-md w-full mx-4", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Add Trust Transaction" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Client *" }), _jsxs("select", { value: formData.clientId, onChange: (e) => setFormData(prev => ({ ...prev, clientId: e.target.value })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true, title: "Select the client for this transaction", children: [_jsx("option", { value: "", children: "Select a client..." }), clients.map(client => (_jsx("option", { value: client.id, children: client.name }, client.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Matter Code *" }), _jsx("input", { type: "text", placeholder: "e.g., 2024-001", value: formData.matterCode, onChange: (e) => setFormData(prev => ({ ...prev, matterCode: e.target.value })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Transaction Type *" }), _jsxs("select", { value: formData.type, onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        type: e.target.value
                                    })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true, title: "Select the type of transaction", children: [_jsx("option", { value: "deposit", children: "Deposit" }), _jsx("option", { value: "withdrawal", children: "Withdrawal" }), _jsx("option", { value: "transfer", children: "Transfer" }), _jsx("option", { value: "adjustment", children: "Adjustment" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Amount *" }), _jsx("input", { type: "number", step: "0.01", placeholder: "0.00", value: formData.amount || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        amount: parseFloat(e.target.value) || 0
                                    })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Description *" }), _jsx("textarea", { placeholder: "Describe the transaction...", value: formData.description, onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })), rows: 3, className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Reference" }), _jsx("input", { type: "text", placeholder: "Check number, wire reference, etc.", value: formData.reference, onChange: (e) => setFormData(prev => ({ ...prev, reference: e.target.value })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Date *" }), _jsx("input", { type: "date", value: formData.date?.toISOString().split('T')[0] || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        date: new Date(e.target.value)
                                    })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true, title: "Select the transaction date" })] }), _jsxs("div", { className: "flex space-x-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: onCancel, children: "Cancel" }), _jsx(Button, { variant: "primary", type: "submit", children: "Add Transaction" })] })] })] }) }));
};
export default TrustAccountDashboard;
//# sourceMappingURL=TrustAccountDashboard.js.map