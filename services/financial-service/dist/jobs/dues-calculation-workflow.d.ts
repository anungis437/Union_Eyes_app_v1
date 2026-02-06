/**
 * Monthly Dues Calculation Workflow
 * Week 11: Workflow Automation
 *
 * Runs on the 1st of every month at 2:00 AM
 * Automatically generates dues transactions for all active members
 */
import cron from 'node-cron';
/**
 * Calculate dues for all active members based on their assignments
 */
export declare function processMonthlyDuesCalculation(params: {
    tenantId: string;
    effectiveDate?: Date;
}): Promise<{
    success: boolean;
    membersProcessed: number;
    transactionsCreated: number;
    errors: Array<{
        memberId: string;
        error: string;
    }>;
}>;
/**
 * Cron job: Runs on 1st of every month at 2:00 AM
 */
export declare const monthlyDuesCalculationJob: cron.ScheduledTask;
/**
 * Start the dues calculation workflow
 */
export declare function startDuesCalculationWorkflow(): void;
/**
 * Stop the dues calculation workflow
 */
export declare function stopDuesCalculationWorkflow(): void;
/**
 * Get workflow status
 */
export declare function getDuesCalculationWorkflowStatus(): {
    name: string;
    schedule: string;
    running: boolean;
    nextRun: Date | null;
};
//# sourceMappingURL=dues-calculation-workflow.d.ts.map