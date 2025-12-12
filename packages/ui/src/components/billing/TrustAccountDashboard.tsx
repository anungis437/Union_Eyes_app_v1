import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';

interface TrustAccountTransaction {
  id: string;
  clientId: string;
  clientName: string;
  matterCode: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'adjustment';
  amount: number;
  balance: number;
  description: string;
  date: Date;
  reference?: string;
  createdBy: string;
  isReconciled: boolean;
}

interface TrustAccountBalance {
  clientId: string;
  clientName: string;
  matterCode: string;
  balance: number;
  lastActivity: Date;
}

interface TrustAccountProps {
  transactions: TrustAccountTransaction[];
  balances: TrustAccountBalance[];
  onAddTransaction: (transaction: Partial<TrustAccountTransaction>) => Promise<void>;
  onReconcileTransaction: (transactionId: string) => Promise<void>;
  onGenerateReport: (type: 'monthly' | 'quarterly' | 'annual') => Promise<void>;
}

const TrustAccountDashboard: React.FC<TrustAccountProps> = ({
  transactions,
  balances,
  onAddTransaction,
  onReconcileTransaction,
  onGenerateReport,
}) => {
  const [showTransactionForm, setShowTransactionForm] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
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
  const clients = Array.from(
    new Map(
      transactions.map(t => [t.clientId, { id: t.clientId, name: t.clientName }])
    ).values()
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getTransactionTypeColor = (type: string): string => {
    switch (type) {
      case 'deposit': return 'text-green-600 bg-green-50';
      case 'withdrawal': return 'text-red-600 bg-red-50';
      case 'transfer': return 'text-blue-600 bg-blue-50';
      case 'adjustment': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trust Account Management</h1>
        <div className="space-x-3">
          <Button 
            variant="secondary" 
            onClick={() => onGenerateReport('monthly')}
          >
            Monthly Report
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onGenerateReport('quarterly')}
          >
            Quarterly Report
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowTransactionForm(true)}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Trust Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Total Trust Balance</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalTrustBalance)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Active Clients</div>
          <div className="text-3xl font-bold">
            {balances.filter(b => b.balance > 0).length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">Unreconciled Transactions</div>
          <div className="text-3xl font-bold text-orange-600">
            {unreconciledTransactions.length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-gray-600">This Month's Activity</div>
          <div className="text-3xl font-bold">
            {transactions.filter(t => 
              t.date.getMonth() === new Date().getMonth() && 
              t.date.getFullYear() === new Date().getFullYear()
            ).length}
          </div>
        </Card>
      </div>

      {/* Client Balances */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Client Trust Balances</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Client</th>
                <th className="text-left py-2">Matter</th>
                <th className="text-right py-2">Balance</th>
                <th className="text-left py-2">Last Activity</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {balances
                .filter(balance => balance.balance !== 0)
                .sort((a, b) => b.balance - a.balance)
                .map((balance) => (
                <tr key={`${balance.clientId}-${balance.matterCode}`} className="border-b hover:bg-gray-50">
                  <td className="py-3">{balance.clientName}</td>
                  <td className="py-3 font-mono text-sm">{balance.matterCode}</td>
                  <td className="py-3 text-right font-semibold">
                    <span className={balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(balance.balance)}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {formatDate(balance.lastActivity)}
                  </td>
                  <td className="py-3">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setSelectedClient(balance.clientId);
                        setShowTransactionForm(true);
                      }}
                    >
                      Add Transaction
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Filters */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Client Filter</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Filter transactions by client"
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
            <label className="block text-sm font-medium mb-2">Transaction Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Filter by transaction type"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ 
                ...prev, 
                start: new Date(e.target.value) 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Select start date for transaction filter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ 
                ...prev, 
                end: new Date(e.target.value) 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Select end date for transaction filter"
            />
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((transaction) => (
            <div 
              key={transaction.id} 
              className={`p-4 border rounded-lg ${
                transaction.isReconciled ? 'bg-white' : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    getTransactionTypeColor(transaction.type)
                  }`}>
                    {transaction.type.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{transaction.clientName}</div>
                    <div className="text-sm text-gray-600">
                      {transaction.matterCode} • {formatDate(transaction.date)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Balance: {formatCurrency(transaction.balance)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!transaction.isReconciled && (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => onReconcileTransaction(transaction.id)}
                    >
                      Reconcile
                    </Button>
                  )}
                  {transaction.isReconciled && (
                    <div className="text-green-600 text-sm font-medium">
                      ✓ Reconciled
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <div className="text-sm">{transaction.description}</div>
                {transaction.reference && (
                  <div className="text-xs text-gray-500 mt-1">
                    Reference: {transaction.reference}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found matching the current filters.
            </div>
          )}
        </div>
      </Card>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TrustTransactionForm
          selectedClientId={selectedClient}
          clients={clients}
          onSubmit={async (transaction) => {
            await onAddTransaction(transaction);
            setShowTransactionForm(false);
            setSelectedClient('');
          }}
          onCancel={() => {
            setShowTransactionForm(false);
            setSelectedClient('');
          }}
        />
      )}
    </div>
  );
};

// Transaction Form Component
interface TrustTransactionFormProps {
  selectedClientId?: string;
  clients: Array<{ id: string; name: string }>;
  onSubmit: (transaction: Partial<TrustAccountTransaction>) => Promise<void>;
  onCancel: () => void;
}

const TrustTransactionForm: React.FC<TrustTransactionFormProps> = ({
  selectedClientId,
  clients,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<TrustAccountTransaction>>({
    clientId: selectedClientId || '',
    type: 'deposit',
    amount: 0,
    description: '',
    date: new Date(),
    reference: '',
    matterCode: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.type || !formData.amount || !formData.description) {
      alert('Please fill in all required fields.');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Trust Transaction</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Client *</label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              title="Select the client for this transaction"
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
            <label className="block text-sm font-medium mb-2">Matter Code *</label>
            <input
              type="text"
              placeholder="e.g., 2024-001"
              value={formData.matterCode}
              onChange={(e) => setFormData(prev => ({ ...prev, matterCode: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transaction Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value as TrustAccountTransaction['type'] 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              title="Select the type of transaction"
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount *</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              placeholder="Describe the transaction..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reference</label>
            <input
              type="text"
              placeholder="Check number, wire reference, etc."
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              value={formData.date?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                date: new Date(e.target.value) 
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              title="Select the transaction date"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Transaction
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TrustAccountDashboard;
