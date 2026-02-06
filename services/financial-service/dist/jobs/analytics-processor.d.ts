import cron from 'node-cron';
/**
 * Analytics Processor - Scheduled Jobs
 *
 * Handles automated analytics processing:
 * - Hourly: Check for low balance alerts and trigger notifications
 * - Weekly: Generate forecast reports for all strike funds
 */
export declare const hourlyAlertsJob: cron.ScheduledTask;
export declare const weeklyForecastJob: cron.ScheduledTask;
/**
 * Start all scheduled jobs
 */
export declare function startAnalyticsJobs(): {
    hourlyAlertsJob: cron.ScheduledTask;
    weeklyForecastJob: cron.ScheduledTask;
};
/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
export declare function stopAnalyticsJobs(): void;
/**
 * Get status of all scheduled jobs
 */
export declare function getJobsStatus(): {
    hourlyAlerts: {
        running: boolean;
        schedule: string;
    };
    weeklyForecast: {
        running: boolean;
        schedule: string;
    };
};
//# sourceMappingURL=analytics-processor.d.ts.map