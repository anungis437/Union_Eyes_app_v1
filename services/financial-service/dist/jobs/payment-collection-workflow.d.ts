/**
 * Payment Collection Workflow
 *
 * Automated workflow for processing incoming payments:
 * - Match payments to outstanding dues transactions
 * - Update transaction status to 'paid'
 * - Send payment receipts to members
 * - Update arrears records when overdue payments are settled
 * - Escalate failed payments to arrears management
 *
 * Schedule: Daily at 4:00 AM (after arrears management completes)
 */
import cron from 'node-cron';
/**
 * Process payment collection for a tenant
 * Matches incoming payments to dues transactions and updates statuses
 */
export declare function processPaymentCollection(params: {
    tenantId: string;
    processingDate?: Date;
}): Promise<{
    success: boolean;
    paymentsProcessed: number;
    transactionsUpdated: number;
    receiptsIssued: number;
    arrearsUpdated: number;
    errors: Array<{
        paymentId: string;
        error: string;
    }>;
}>;
/**
 * Scheduled job: Daily payment collection at 4:00 AM
 */
export declare const dailyPaymentCollectionJob: cron.ScheduledTask;
/**
 * Start the payment collection workflow
 */
export declare function startPaymentCollectionWorkflow(): void;
/**
 * Stop the payment collection workflow
 */
export declare function stopPaymentCollectionWorkflow(): void;
/**
 * Get workflow status
 */
export declare function getPaymentCollectionWorkflowStatus(): {
    running: boolean;
    nextExecution: string | null;
};
//# sourceMappingURL=payment-collection-workflow.d.ts.map