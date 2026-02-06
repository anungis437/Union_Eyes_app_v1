"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyForecastJob = exports.hourlyAlertsJob = void 0;
exports.startAnalyticsJobs = startAnalyticsJobs;
exports.stopAnalyticsJobs = stopAnalyticsJobs;
exports.getJobsStatus = getJobsStatus;
const node_cron_1 = __importDefault(require("node-cron"));
const winston_1 = __importDefault(require("winston"));
const burn_rate_predictor_1 = require("../services/burn-rate-predictor");
const burn_rate_predictor_2 = require("../services/burn-rate-predictor");
// Logger setup
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
/**
 * Analytics Processor - Scheduled Jobs
 *
 * Handles automated analytics processing:
 * - Hourly: Check for low balance alerts and trigger notifications
 * - Weekly: Generate forecast reports for all strike funds
 */
// Hourly alert processing (every hour at minute 0)
// Checks all strike funds for low balance conditions and sends alerts
exports.hourlyAlertsJob = node_cron_1.default.schedule('0 * * * *', async () => {
    try {
        logger.info('Starting hourly automated alerts check...');
        // Process alerts for all tenants
        // In production, this should iterate through active tenants
        const tenantId = '11111111-1111-1111-1111-111111111111'; // Test tenant
        const result = await (0, burn_rate_predictor_1.processAutomatedAlerts)({ tenantId });
        logger.info(`Hourly alerts processed: ${result.alertsSent} alerts sent`, {
            criticalAlerts: result.alerts?.filter(a => a.severity === 'critical').length || 0,
            warningAlerts: result.alerts?.filter(a => a.severity === 'warning').length || 0,
        });
    }
    catch (error) {
        logger.error('Error in hourly alerts job', { error });
    }
}, {
    scheduled: false, // Don't start immediately, will be started manually
    timezone: 'America/Toronto', // Adjust to your timezone
});
// Weekly forecast report generation (Mondays at 9:00 AM)
// Generates comprehensive forecast reports for all strike funds
exports.weeklyForecastJob = node_cron_1.default.schedule('0 9 * * 1', async () => {
    try {
        logger.info('Starting weekly forecast report generation...');
        // Generate reports for all tenants
        // In production, this should iterate through active tenants
        const tenantId = '11111111-1111-1111-1111-111111111111'; // Test tenant
        const result = await (0, burn_rate_predictor_2.generateWeeklyForecastReport)({ tenantId });
        logger.info('Weekly forecast report generated and sent', {
            totalFunds: result.totalFunds,
            criticalFunds: result.criticalFunds,
            warningFunds: result.warningFunds,
            reportGenerated: result.reportGenerated,
        });
    }
    catch (error) {
        logger.error('Error in weekly forecast job', { error });
    }
}, {
    scheduled: false, // Don't start immediately, will be started manually
    timezone: 'America/Toronto', // Adjust to your timezone
});
/**
 * Start all scheduled jobs
 */
function startAnalyticsJobs() {
    logger.info('Starting analytics scheduled jobs...');
    exports.hourlyAlertsJob.start();
    logger.info('✓ Hourly alerts job started (runs every hour at :00)');
    exports.weeklyForecastJob.start();
    logger.info('✓ Weekly forecast job started (runs Mondays at 9:00 AM)');
    return {
        hourlyAlertsJob: exports.hourlyAlertsJob,
        weeklyForecastJob: exports.weeklyForecastJob,
    };
}
/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
function stopAnalyticsJobs() {
    logger.info('Stopping analytics scheduled jobs...');
    exports.hourlyAlertsJob.stop();
    exports.weeklyForecastJob.stop();
    logger.info('✓ All analytics jobs stopped');
}
/**
 * Get status of all scheduled jobs
 */
function getJobsStatus() {
    return {
        hourlyAlerts: {
            running: true,
            schedule: '0 * * * * (every hour)',
        },
        weeklyForecast: {
            running: true,
            schedule: '0 9 * * 1 (Mondays at 9:00 AM)',
        },
    };
}
//# sourceMappingURL=analytics-processor.js.map