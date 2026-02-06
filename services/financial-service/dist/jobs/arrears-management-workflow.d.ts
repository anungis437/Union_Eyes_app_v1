/**
 * Arrears Management Workflow
 * Week 11: Workflow Automation
 *
 * Runs weekly on Sundays at 3:00 AM
 * Scans for overdue payments and sends stage-based notifications
 */
import cron from 'node-cron';
/**
 * Scan for overdue dues and create/update arrears records
 */
export declare function processArrearsManagement(params: {
    tenantId: string;
    scanDate?: Date;
}): Promise<{
    success: boolean;
    overdueTransactions: number;
    arrearsCreated: number;
    notificationsSent: number;
    errors: Array<{
        transactionId: string;
        error: string;
    }>;
}>;
/**
 * Cron job: Runs weekly on Sundays at 3:00 AM
 */
export declare const weeklyArrearsManagementJob: cron.ScheduledTask;
/**
 * Start the arrears management workflow
 */
export declare function startArrearsManagementWorkflow(): void;
/**
 * Stop the arrears management workflow
 */
export declare function stopArrearsManagementWorkflow(): void;
/**
 * Get workflow status
 */
export declare function getArrearsManagementWorkflowStatus(): {
    name: string;
    schedule: string;
    running: boolean;
};
//# sourceMappingURL=arrears-management-workflow.d.ts.map