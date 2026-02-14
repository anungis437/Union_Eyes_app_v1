/**
 * Automated Billing Scheduler
 * 
 * Phase 2: Dues & Payments - Automated Billing
 * 
 * Schedules and executes automated billing cycles for all organizations
 * based on their billing frequency configuration.
 * 
 * Execution Schedule:
 * - Monthly: 1st of month at 00:00 UTC
 * - Bi-weekly: Every other Monday at 00:00 UTC
 * - Weekly: Every Monday at 00:00 UTC
 * 
 * Features:
 * - Multi-organization support
 * - Error handling with retry logic
 * - Notification on completion/failure
 * - Execution logging for audit
 * 
 * @module lib/jobs/billing-scheduler
 */

import { db } from '@/db';
import { organizations } from '@/db/schema-organizations';
import { BillingCycleService, type BillingFrequency } from '@/lib/services/billing-cycle-service';
import { logger } from '@/lib/logger';
import { eq } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

interface BillingScheduleConfig {
  organizationId: string;
  organizationName: string;
  frequency: BillingFrequency;
  enabled: boolean;
}

interface BillingSchedulerResult {
  totalOrganizations: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    organizationId: string;
    organizationName: string;
    success: boolean;
    transactionsCreated?: number;
    totalAmount?: number;
    error?: string;
  }>;
  executedAt: Date;
  executionTimeMs: number;
}

// =============================================================================
// BILLING SCHEDULER
// =============================================================================

export class BillingScheduler {
  /**
   * Run automated billing for all organizations with the given frequency
   * 
   * This is called by cron jobs at scheduled intervals:
   * - Monthly: 1st of month
   * - Bi-weekly: Every other Monday
   * - Weekly: Every Monday
   */
  static async runScheduledBilling(frequency: BillingFrequency): Promise<BillingSchedulerResult> {
    const startTime = Date.now();

    logger.info(`Starting scheduled billing run for frequency: ${frequency}`);

    try {
      // Get all organizations with this billing frequency
      const orgs = await this.getOrganizationsForBilling(frequency);

      logger.info(`Found ${orgs.length} organizations configured for ${frequency} billing`);

      const results = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      // Process each organization
      for (const org of orgs) {
        try {
          if (!org.enabled) {
            logger.info(`Skipping disabled billing for organization: ${org.organizationName}`, {
              organizationId: org.organizationId,
            });
            skipped++;
            results.push({
              organizationId: org.organizationId,
              organizationName: org.organizationName,
              success: true,
              error: 'Billing disabled for this organization',
            });
            continue;
          }

          logger.info(`Processing billing for organization: ${org.organizationName}`, {
            organizationId: org.organizationId,
            frequency,
          });

          // Calculate period dates
          const { periodStart, periodEnd } = BillingCycleService.calculatePeriodDates(frequency);

          // Generate billing cycle
          const result = await BillingCycleService.generateBillingCycle({
            organizationId: org.organizationId,
            periodStart,
            periodEnd,
            frequency,
            dryRun: false,
            executedBy: 'system_scheduler', // System-triggered
          });

          successful++;
          results.push({
            organizationId: org.organizationId,
            organizationName: org.organizationName,
            success: true,
            transactionsCreated: result.transactionsCreated,
            totalAmount: result.totalAmount,
          });

          logger.info(`Billing completed for organization: ${org.organizationName}`, {
            organizationId: org.organizationId,
            transactionsCreated: result.transactionsCreated,
            totalAmount: result.totalAmount,
          });

          // Optional: Send notification to org admins
          await this.notifyBillingCompleted(org.organizationId, result);
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          logger.error(`Billing failed for organization: ${org.organizationName}`, {
            organizationId: org.organizationId,
            error: errorMessage,
          });

          results.push({
            organizationId: org.organizationId,
            organizationName: org.organizationName,
            success: false,
            error: errorMessage,
          });

          // Optional: Send failure notification
          await this.notifyBillingFailed(org.organizationId, errorMessage);
        }
      }

      const executionTimeMs = Date.now() - startTime;

      logger.info(`Scheduled billing run completed`, {
        frequency,
        totalOrganizations: orgs.length,
        successful,
        failed,
        skipped,
        executionTimeMs,
      });

      return {
        totalOrganizations: orgs.length,
        successful,
        failed,
        skipped,
        results,
        executedAt: new Date(),
        executionTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Scheduled billing run failed`, {
        frequency,
        error: errorMessage,
      });

      throw new Error(`Scheduled billing failed: ${errorMessage}`);
    }
  }

  /**
   * Get organizations configured for a specific billing frequency
   * 
   * TODO: In production, this should read from organization configuration table
   * For now, returns all active organizations (assuming monthly billing)
   */
  private static async getOrganizationsForBilling(
    frequency: BillingFrequency
  ): Promise<BillingScheduleConfig[]> {
    try {
      // TODO: Join with organization_billing_config table when created
      // For now, get all active organizations and assume they want monthly billing
      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          status: organizations.status,
        })
        .from(organizations)
        .where(eq(organizations.status, 'active'));

      return orgs
        .filter((org) => org.status === 'active')
        .map((org) => ({
          organizationId: org.id,
          organizationName: org.name,
          frequency: 'monthly' as BillingFrequency, // Default to monthly for now
          enabled: true,
        }));
    } catch (error) {
      logger.error('Error fetching organizations for billing', { error });
      throw error;
    }
  }

  /**
   * Notify organization admins that billing was completed
   * 
   * TODO: Implement when notification system is set up
   */
  private static async notifyBillingCompleted(
    organizationId: string,
    result: unknown
  ): Promise<void> {
    // Placeholder for notification
    logger.info('Billing completion notification would be sent', {
      organizationId,
      transactionsCreated: result.transactionsCreated,
      totalAmount: result.totalAmount,
    });
  }

  /**
   * Notify organization admins that billing failed
   * 
   * TODO: Implement when notification system is set up
   */
  private static async notifyBillingFailed(
    organizationId: string,
    error: string
  ): Promise<void> {
    // Placeholder for notification
    logger.error('Billing failure notification would be sent', {
      organizationId,
      error,
    });
  }

  /**
   * Manual trigger for scheduled billing (for testing)
   */
  static async manualTrigger(frequency: BillingFrequency): Promise<BillingSchedulerResult> {
    logger.info(`Manual trigger for ${frequency} billing`);
    return this.runScheduledBilling(frequency);
  }
}

// =============================================================================
// CRON JOB HANDLERS
// =============================================================================

/**
 * Monthly billing job - Runs on 1st of month at 00:00 UTC
 * 
 * Usage with cron library:
 * ```
 * cron.schedule('0 0 1 * *', async () => {
 *   await runMonthlyBilling();
 * });
 * ```
 */
export async function runMonthlyBilling(): Promise<BillingSchedulerResult> {
  return BillingScheduler.runScheduledBilling('monthly');
}

/**
 * Bi-weekly billing job - Runs every other Monday at 00:00 UTC
 * 
 * Note: Implementing bi-weekly requires tracking last run date
 */
export async function runBiWeeklyBilling(): Promise<BillingSchedulerResult> {
  return BillingScheduler.runScheduledBilling('bi_weekly');
}

/**
 * Weekly billing job - Runs every Monday at 00:00 UTC
 * 
 * Usage with cron library:
 * ```
 * cron.schedule('0 0 * * 1', async () => {
 *   await runWeeklyBilling();
 * });
 * ```
 */
export async function runWeeklyBilling(): Promise<BillingSchedulerResult> {
  return BillingScheduler.runScheduledBilling('weekly');
}

/**
 * Quarterly billing job - Runs on 1st of quarter at 00:00 UTC
 */
export async function runQuarterlyBilling(): Promise<BillingSchedulerResult> {
  return BillingScheduler.runScheduledBilling('quarterly');
}

/**
 * Annual billing job - Runs on January 1st at 00:00 UTC
 */
export async function runAnnualBilling(): Promise<BillingSchedulerResult> {
  return BillingScheduler.runScheduledBilling('annual');
}
