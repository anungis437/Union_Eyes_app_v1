import React from 'react';
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
    dateRange: {
        start: Date;
        end: Date;
    };
    clientId?: string;
    matterCode?: string;
    reportType: 'billing' | 'client' | 'matter' | 'time';
}
interface BillingReportsProps {
    billingData: BillingReportData[];
    clientData: ClientReportData[];
    matterData: MatterReportData[];
    clients: Array<{
        id: string;
        name: string;
    }>;
    matters: Array<{
        code: string;
        description: string;
        clientName: string;
    }>;
    onExportReport: (filters: ReportFilters, format: 'pdf' | 'excel' | 'csv') => Promise<void>;
    onGenerateInvoice: (clientId: string, matterCode?: string) => Promise<void>;
}
declare const BillingReports: React.FC<BillingReportsProps>;
export default BillingReports;
//# sourceMappingURL=BillingReports.d.ts.map