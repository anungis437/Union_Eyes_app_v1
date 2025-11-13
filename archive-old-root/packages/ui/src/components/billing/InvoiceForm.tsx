import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientId: string;
  matterCode: string;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  retainerAmount?: number;
  trustTransferAmount?: number;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  clients: Array<{ id: string; name: string; matters: Array<{ code: string; description: string }> }>;
  timeEntries: Array<{
    id: string;
    description: string;
    duration: number;
    date: Date;
    billableRate: number;
    billableAmount: number;
    matterCode: string;
  }>;
  onSave: (invoice: Partial<Invoice>) => Promise<void>;
  onCancel: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  clients,
  timeEntries,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<Invoice>>({
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

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedMatter, setSelectedMatter] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(13); // Default HST for Ontario
  const [retainerApplied, setRetainerApplied] = useState<boolean>(false);

  // Available matters for selected client
  const availableMatters = selectedClient 
    ? clients.find(c => c.id === selectedClient)?.matters || []
    : [];

  // Time entries for selected matter
  const unbilledTimeEntries = timeEntries.filter(
    entry => entry.matterCode === selectedMatter
  );

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
    const newItems: InvoiceItem[] = unbilledTimeEntries.map(entry => ({
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
    const newItem: InvoiceItem = {
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

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
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

  const removeItem = (index: number) => {
    const updatedItems = formData.items?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!selectedClient || !selectedMatter || !formData.items?.length) {
      alert('Please fill in all required fields and add at least one item.');
      return;
    }

    const invoiceData: Partial<Invoice> = {
      ...formData,
      clientId: selectedClient,
      matterCode: selectedMatter,
      clientName: clients.find(c => c.id === selectedClient)?.name || '',
    };

    onSave(invoiceData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {invoice ? 'Edit Invoice' : 'Create New Invoice'}
        </h2>
        <div className="space-x-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {invoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client and Matter Selection */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Client & Matter</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client *</label>
              <select
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  setSelectedMatter(''); // Reset matter when client changes
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                title="Select a client for this invoice"
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Matter *</label>
              <select
                value={selectedMatter}
                onChange={(e) => setSelectedMatter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!selectedClient}
                title="Select a matter for this invoice"
              >
                <option value="">Select a matter...</option>
                {availableMatters.map(matter => (
                  <option key={matter.code} value={matter.code}>
                    {matter.code} - {matter.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Invoice Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Issue Date</label>
              <input
                type="date"
                value={formData.issueDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  issueDate: new Date(e.target.value) 
                }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Select the invoice issue date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  dueDate: new Date(e.target.value) 
                }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Select the invoice due date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Enter the tax rate percentage"
              />
            </div>
          </div>
        </Card>

        {/* Time Entries */}
        {selectedMatter && unbilledTimeEntries.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Available Time Entries</h3>
              <Button onClick={addTimeEntries} variant="secondary">
                Add All Time Entries ({unbilledTimeEntries.length})
              </Button>
            </div>
            <div className="space-y-2">
              {unbilledTimeEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium">{entry.description}</div>
                    <div className="text-sm text-gray-600">
                      {formatDuration(entry.duration)} @ {formatCurrency(entry.billableRate)}/hour
                    </div>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(entry.billableAmount)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Invoice Items */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Invoice Items</h3>
            <Button onClick={addCustomItem} variant="secondary">
              Add Custom Item
            </Button>
          </div>

          <div className="space-y-3">
            {formData.items?.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 border border-gray-200 rounded-md">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <div className="p-2 bg-gray-50 rounded-md text-right font-semibold">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
                <div className="col-span-1">
                  <Button 
                    onClick={() => removeItem(index)} 
                    variant="danger" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Trust Account & Retainer */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Trust Account & Retainer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Retainer Applied</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.retainerAmount || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  retainerAmount: parseFloat(e.target.value) || 0 
                }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Trust Transfer Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.trustTransferAmount || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  trustTransferAmount: parseFloat(e.target.value) || 0 
                }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Invoice Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span>{formatCurrency(formData.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Tax ({taxRate}%):</span>
              <span>{formatCurrency(formData.taxAmount || 0)}</span>
            </div>
            {formData.retainerAmount && formData.retainerAmount > 0 && (
              <div className="flex justify-between text-lg text-red-600">
                <span>Retainer Applied:</span>
                <span>-{formatCurrency(formData.retainerAmount)}</span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span>{formatCurrency(formData.total || 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notes</h3>
          <textarea
            placeholder="Additional notes or terms..."
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </Card>
      </form>
    </div>
  );
};

export default InvoiceForm;
