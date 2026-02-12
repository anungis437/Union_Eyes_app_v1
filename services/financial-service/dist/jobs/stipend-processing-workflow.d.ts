/**
 * Stipend Processing Workflow
 *
 * Automated workflow for weekly strike stipend calculations and disbursements:
 * - Calculate stipends based on picket line attendance
 * - Apply eligibility rules and caps
 * - Route to trustee approval workflow
 * - Process approved disbursements via Stripe
 * - Track in stipend_disbursements table
 * - Handle failed payments and retries
 *
 * Schedule: Weekly on Fridays at 5:00 AM (before business hours)
 */
import cron from 'node-cron';
/**
 * Stipend calculation rules (configurable per tenant)
 */
interface StipendRules {
    dailyRate: number;
    weeklyMaxDays: number;
    weeklyMaxAmount: number;
    minimumHoursPerDay: number;
    requiresApproval: boolean;
    autoApproveUnder: number;
    fundId: string;
}
/**
 * Process weekly stipend calculations for a tenant
 */
export declare function processWeeklyStipends(params: {
    tenantId: string;
    weekStartDate?: Date;
    rules?: Partial<StipendRules>;
}): Promise<{
    success: boolean;
    stipendsCalculated: number;
    totalAmount: number;
    pendingApproval: number;
    autoApproved: number;
    membersProcessed: number;
    errors: Array<{
        memberId: string;
        error: string;
    }>;
}>;
/**
 * Process approved stipend disbursements via Stripe
 * This would be called by a separate payment processing job or API endpoint
 */
export declare function processDisbursements(params: {
    tenantId: string;
    stipendIds?: string[];
}): Promise<{
    success: boolean;
    disbursed: number;
    failed: number;
    totalAmount: number;
    errors: Array<{
        stipendId: string;
        error: string;
    }>;
}>;
/**
 * Scheduled job: Weekly stipend processing on Fridays at 5:00 AM
 */
export declare const weeklyStipendProcessingJob: cron.ScheduledTask;
/**
 * Start the stipend processing workflow
 */
export declare function startStipendProcessingWorkflow(): void;
/**
 * Stop the stipend processing workflow
 */
export declare function stopStipendProcessingWorkflow(): void;
/**
 * Get workflow status
 */
export declare function getStipendProcessingWorkflowStatus(): {
    running: boolean;
    nextExecution: string | null;
};
export {};
//# sourceMappingURL=stipend-processing-workflow.d.ts.map