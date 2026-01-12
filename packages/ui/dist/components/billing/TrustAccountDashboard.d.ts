import React from 'react';
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
declare const TrustAccountDashboard: React.FC<TrustAccountProps>;
export default TrustAccountDashboard;
//# sourceMappingURL=TrustAccountDashboard.d.ts.map