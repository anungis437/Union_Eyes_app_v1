import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';
const InvoiceForm = ({ invoice, clients, timeEntries, onSave, onCancel, }) => {
    const [formData, setFormData] = useState({
        clientId: '',
        matterCode: '',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        items: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        status: 'draft',
        notes: '',
        ...invoice,
    });
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedMatter, setSelectedMatter] = useState('');
    const [taxRate, setTaxRate] = useState(13); // Default HST for Ontario
    const [retainerApplied, setRetainerApplied] = useState(false);
    // Available matters for selected client
    const availableMatters = selectedClient
        ? clients.find(c => c.id === selectedClient)?.matters || []
        : [];
    // Time entries for selected matter
    const unbilledTimeEntries = timeEntries.filter(entry => entry.matterCode === selectedMatter);
    // Calculate totals
    useEffect(() => {
        const subtotal = formData.items?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount - (formData.retainerAmount || 0);
        setFormData(prev => ({
            ...prev,
            subtotal,
            taxAmount,
            total,
        }));
    }, [formData.items, taxRate, formData.retainerAmount]);
    const addTimeEntries = () => {
        const newItems = unbilledTimeEntries.map(entry => ({
            id: entry.id,
            description: `${entry.description} (${formatDuration(entry.duration)})`,
            quantity: entry.duration / 60, // Convert minutes to hours
            rate: entry.billableRate,
            amount: entry.billableAmount,
        }));
        setFormData(prev => ({
            ...prev,
            items: [...(prev.items || []), ...newItems],
        }));
    };
    const addCustomItem = () => {
        const newItem = {
            id: `custom-${Date.now()}`,
            description: '',
            quantity: 1,
            rate: 0,
            amount: 0,
        };
        setFormData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem],
        }));
    };
    const updateItem = (index, field, value) => {
        const updatedItems = [...(formData.items || [])];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value,
        };
        // Recalculate amount for quantity/rate changes
        if (field === 'quantity' || field === 'rate') {
            updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
        }
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };
    const removeItem = (index) => {
        const updatedItems = formData.items?.filter((_, i) => i !== index) || [];
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };
    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0)
            return `${mins}m`;
        if (mins === 0)
            return `${hours}h`;
        return `${hours}h ${mins}m`;
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        // Validate required fields
        if (!selectedClient || !selectedMatter || !formData.items?.length) {
            alert('Please fill in all required fields and add at least one item.');
            return;
        }
        const invoiceData = {
            ...formData,
            clientId: selectedClient,
            matterCode: selectedMatter,
            clientName: clients.find(c => c.id === selectedClient)?.name || '',
        };
        onSave(invoiceData);
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-2xl font-bold", children: invoice ? 'Edit Invoice' : 'Create New Invoice' }), _jsxs("div", { className: "space-x-2", children: [_jsx(Button, { variant: "secondary", onClick: onCancel, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSubmit, children: invoice ? 'Update Invoice' : 'Create Invoice' })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs(Card, { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Client & Matter" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Client *" }), _jsxs("select", { value: selectedClient, onChange: (e) => {
                                                    setSelectedClient(e.target.value);
                                                    setSelectedMatter(''); // Reset matter when client changes
                                                }, className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true, title: "Select a client for this invoice", children: [_jsx("option", { value: "", children: "Select a client..." }), clients.map(client => (_jsx("option", { value: client.id, children: client.name }, client.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Matter *" }), _jsxs("select", { value: selectedMatter, onChange: (e) => setSelectedMatter(e.target.value), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true, disabled: !selectedClient, title: "Select a matter for this invoice", children: [_jsx("option", { value: "", children: "Select a matter..." }), availableMatters.map(matter => (_jsxs("option", { value: matter.code, children: [matter.code, " - ", matter.description] }, matter.code)))] })] })] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Invoice Details" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Issue Date" }), _jsx("input", { type: "date", value: formData.issueDate?.toISOString().split('T')[0] || '', onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    issueDate: new Date(e.target.value)
                                                })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select the invoice issue date" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Due Date" }), _jsx("input", { type: "date", value: formData.dueDate?.toISOString().split('T')[0] || '', onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    dueDate: new Date(e.target.value)
                                                })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Select the invoice due date" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Tax Rate (%)" }), _jsx("input", { type: "number", step: "0.01", min: "0", max: "100", value: taxRate, onChange: (e) => setTaxRate(parseFloat(e.target.value) || 0), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", title: "Enter the tax rate percentage" })] })] })] }), selectedMatter && unbilledTimeEntries.length > 0 && (_jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Available Time Entries" }), _jsxs(Button, { onClick: addTimeEntries, variant: "secondary", children: ["Add All Time Entries (", unbilledTimeEntries.length, ")"] })] }), _jsx("div", { className: "space-y-2", children: unbilledTimeEntries.map(entry => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-md", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: entry.description }), _jsxs("div", { className: "text-sm text-gray-600", children: [formatDuration(entry.duration), " @ ", formatCurrency(entry.billableRate), "/hour"] })] }), _jsx("div", { className: "text-lg font-semibold", children: formatCurrency(entry.billableAmount) })] }, entry.id))) })] })), _jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Invoice Items" }), _jsx(Button, { onClick: addCustomItem, variant: "secondary", children: "Add Custom Item" })] }), _jsx("div", { className: "space-y-3", children: formData.items?.map((item, index) => (_jsxs("div", { className: "grid grid-cols-12 gap-3 items-center p-3 border border-gray-200 rounded-md", children: [_jsx("div", { className: "col-span-5", children: _jsx("input", { type: "text", placeholder: "Description", value: item.description, onChange: (e) => updateItem(index, 'description', e.target.value), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" }) }), _jsx("div", { className: "col-span-2", children: _jsx("input", { type: "number", step: "0.01", min: "0", placeholder: "Qty", value: item.quantity, onChange: (e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" }) }), _jsx("div", { className: "col-span-2", children: _jsx("input", { type: "number", step: "0.01", min: "0", placeholder: "Rate", value: item.rate, onChange: (e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" }) }), _jsx("div", { className: "col-span-2", children: _jsx("div", { className: "p-2 bg-gray-50 rounded-md text-right font-semibold", children: formatCurrency(item.amount) }) }), _jsx("div", { className: "col-span-1", children: _jsx(Button, { onClick: () => removeItem(index), variant: "danger", size: "sm", className: "text-red-600 hover:text-red-700", children: "\u00D7" }) })] }, item.id))) })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Trust Account & Retainer" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Retainer Applied" }), _jsx("input", { type: "number", step: "0.01", min: "0", placeholder: "0.00", value: formData.retainerAmount || '', onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    retainerAmount: parseFloat(e.target.value) || 0
                                                })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Trust Transfer Amount" }), _jsx("input", { type: "number", step: "0.01", min: "0", placeholder: "0.00", value: formData.trustTransferAmount || '', onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    trustTransferAmount: parseFloat(e.target.value) || 0
                                                })), className: "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Invoice Summary" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-lg", children: [_jsx("span", { children: "Subtotal:" }), _jsx("span", { children: formatCurrency(formData.subtotal || 0) })] }), _jsxs("div", { className: "flex justify-between text-lg", children: [_jsxs("span", { children: ["Tax (", taxRate, "%):"] }), _jsx("span", { children: formatCurrency(formData.taxAmount || 0) })] }), formData.retainerAmount && formData.retainerAmount > 0 && (_jsxs("div", { className: "flex justify-between text-lg text-red-600", children: [_jsx("span", { children: "Retainer Applied:" }), _jsxs("span", { children: ["-", formatCurrency(formData.retainerAmount)] })] })), _jsx("div", { className: "border-t pt-2", children: _jsxs("div", { className: "flex justify-between text-xl font-bold", children: [_jsx("span", { children: "Total:" }), _jsx("span", { children: formatCurrency(formData.total || 0) })] }) })] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Notes" }), _jsx("textarea", { placeholder: "Additional notes or terms...", value: formData.notes || '', onChange: (e) => setFormData(prev => ({ ...prev, notes: e.target.value })), rows: 4, className: "w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] })] }));
};
export default InvoiceForm;
//# sourceMappingURL=InvoiceForm.js.map