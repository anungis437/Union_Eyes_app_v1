import React from 'react';
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
    clients: Array<{
        id: string;
        name: string;
        matters: Array<{
            code: string;
            description: string;
        }>;
    }>;
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
declare const InvoiceForm: React.FC<InvoiceFormProps>;
export default InvoiceForm;
//# sourceMappingURL=InvoiceForm.d.ts.map