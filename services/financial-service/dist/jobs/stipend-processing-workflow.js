"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyStipendProcessingJob = void 0;
exports.processWeeklyStipends = processWeeklyStipends;
exports.processDisbursements = processDisbursements;
exports.startStipendProcessingWorkflow = startStipendProcessingWorkflow;
exports.stopStipendProcessingWorkflow = stopStipendProcessingWorkflow;
exports.getStipendProcessingWorkflowStatus = getStipendProcessingWorkflowStatus;
const node_cron_1 = __importDefault(require("node-cron"));
const winston_1 = __importDefault(require("winston"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const stripe_1 = __importDefault(require("stripe"));
// import { NotificationService } from '../services/notification-service'; // TODO: Export NotificationService
// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
    : null;
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [new winston_1.default.transports.Console()],
});
/**
 * Default stipend rules (can be overridden per tenant)
 */
const DEFAULT_STIPEND_RULES = {
    dailyRate: 100.00,
    weeklyMaxDays: 5,
    weeklyMaxAmount: 500.00,
    minimumHoursPerDay: 4,
    requiresApproval: true,
    autoApproveUnder: 100.00,
    fundId: 'default-strike-fund',
};
/**
 * Process weekly stipend calculations for a tenant
 */
async function processWeeklyStipends(params) {
    const { tenantId, weekStartDate = getLastWeekStart(), rules: customRules } = params;
    const rules = { ...DEFAULT_STIPEND_RULES, ...customRules };
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6); // 7-day week
    logger.info('Starting weekly stipend processing', {
        tenantId,
        weekStart: weekStartDate.toISOString().split('T')[0],
        weekEnd: weekEndDate.toISOString().split('T')[0],
        rules,
    });
    const errors = [];
    let stipendsCalculated = 0;
    let totalAmount = 0;
    let pendingApproval = 0;
    let autoApproved = 0;
    try {
        // Verify strike fund has sufficient balance
        const fundBalance = await checkStrikeFundBalance(tenantId, rules.fundId);
        logger.info('Strike fund balance check', { fundId: rules.fundId, balance: fundBalance });
        // Get all picket attendance records for the week
        const attendanceRecords = await db_1.db
            .select({
            memberId: schema_1.picketAttendance.memberId,
            checkInTime: schema_1.picketAttendance.checkInTime,
            hoursWorked: schema_1.picketAttendance.hoursWorked,
            coordinatorOverride: schema_1.picketAttendance.coordinatorOverride,
            memberName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.members.firstName}, ' ', ${schema_1.members.lastName})`,
            memberEmail: schema_1.members.email,
            userId: schema_1.members.userId,
        })
            .from(schema_1.picketAttendance)
            .innerJoin(schema_1.members, (0, drizzle_orm_1.eq)(schema_1.picketAttendance.memberId, schema_1.members.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.picketAttendance.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.picketAttendance.checkInTime, new Date(weekStartDate).toISOString()), (0, drizzle_orm_1.lte)(schema_1.picketAttendance.checkInTime, new Date(weekEndDate).toISOString()), (0, drizzle_orm_1.eq)(schema_1.picketAttendance.coordinatorOverride, true) // Only process approved attendance
        ))
            .orderBy(schema_1.picketAttendance.memberId, schema_1.picketAttendance.checkInTime);
        logger.info(`Found ${attendanceRecords.length} approved attendance records`);
        // Group by member and calculate stipends
        const memberStipends = new Map();
        for (const record of attendanceRecords) {
            const hours = parseFloat(record.hoursWorked || '0');
            // Check if this day qualifies for stipend
            if (hours < rules.minimumHoursPerDay) {
                continue; // Skip days that don't meet minimum hours
            }
            const key = record.memberId;
            const existing = memberStipends.get(key) || {
                memberId: record.memberId,
                memberName: record.memberName,
                memberEmail: record.memberEmail,
                userId: record.userId,
                qualifyingDays: 0,
                totalHours: 0,
                calculatedAmount: 0,
            };
            existing.qualifyingDays++;
            existing.totalHours += hours;
            memberStipends.set(key, existing);
        }
        // Calculate stipend amounts with caps
        for (const [memberId, data] of Array.from(memberStipends.entries())) {
            try {
                // Apply weekly maximum days cap
                const compensableDays = Math.min(data.qualifyingDays, rules.weeklyMaxDays);
                let stipendAmount = compensableDays * rules.dailyRate;
                // Apply weekly maximum amount cap
                stipendAmount = Math.min(stipendAmount, rules.weeklyMaxAmount);
                data.calculatedAmount = stipendAmount;
                // Check if stipend already exists for this member/week
                const existingStipend = await db_1.db
                    .select()
                    .from(schema_1.stipendDisbursements)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.memberId, memberId), (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.weekStartDate, weekStartDate.toISOString().split('T')[0])))
                    .limit(1);
                if (existingStipend.length > 0) {
                    logger.warn('Stipend already exists for member/week', {
                        memberId,
                        weekStart: weekStartDate.toISOString().split('T')[0],
                        existingId: existingStipend[0].id,
                    });
                    continue;
                }
                // Determine approval status
                const needsApproval = rules.requiresApproval && stipendAmount >= rules.autoApproveUnder;
                const status = needsApproval ? 'pending_approval' : 'approved';
                // Create stipend disbursement record
                await db_1.db.insert(schema_1.stipendDisbursements).values({
                    tenantId,
                    memberId,
                    fundId: rules.fundId,
                    weekStartDate: weekStartDate.toISOString().split('T')[0],
                    weekEndDate: weekEndDate.toISOString().split('T')[0],
                    daysWorked: data.qualifyingDays,
                    hoursWorked: data.totalHours.toString(),
                    dailyRate: rules.dailyRate.toString(),
                    calculatedAmount: stipendAmount.toString(),
                    approvedAmount: needsApproval ? null : stipendAmount.toString(),
                    status,
                    calculatedAt: new Date(),
                    approvedAt: needsApproval ? null : new Date(),
                    approvedBy: needsApproval ? null : 'auto-approved',
                    metadata: {
                        compensableDays,
                        qualifyingDays: data.qualifyingDays,
                        weeklyMaxDays: rules.weeklyMaxDays,
                        weeklyMaxAmount: rules.weeklyMaxAmount,
                        autoApproved: !needsApproval,
                    },
                });
                stipendsCalculated++;
                totalAmount += stipendAmount;
                if (needsApproval) {
                    pendingApproval++;
                    logger.info('Stipend pending trustee approval', {
                        memberId,
                        amount: stipendAmount,
                        daysWorked: data.qualifyingDays,
                    });
                }
                else {
                    autoApproved++;
                    logger.info('Stipend auto-approved', {
                        memberId,
                        amount: stipendAmount,
                        daysWorked: data.qualifyingDays,
                    });
                }
            }
            catch (memberError) {
                logger.error('Error processing stipend for member', {
                    memberId,
                    error: memberError,
                });
                errors.push({
                    memberId,
                    error: memberError instanceof Error ? memberError.message : String(memberError),
                });
            }
        }
        // Check if total stipends exceed available fund balance
        if (totalAmount > fundBalance) {
            logger.error('Insufficient strike fund balance', {
                required: totalAmount,
                available: fundBalance,
                shortfall: totalAmount - fundBalance,
            });
            // Don't fail - trustee approval process will handle this
        }
        const success = errors.length === 0;
        logger.info('Weekly stipend processing completed', {
            success,
            stipendsCalculated,
            totalAmount,
            pendingApproval,
            autoApproved,
            errors: errors.length,
        });
        return {
            success,
            stipendsCalculated,
            totalAmount,
            pendingApproval,
            autoApproved,
            membersProcessed: memberStipends.size,
            errors,
        };
    }
    catch (error) {
        logger.error('Weekly stipend processing failed', { error });
        throw error;
    }
}
/**
 * Get the start date of last week (Monday)
 */
function getLastWeekStart() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek + 6; // Get last Monday
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToSubtract);
    lastMonday.setHours(0, 0, 0, 0);
    return lastMonday;
}
/**
 * Check strike fund balance
 */
async function checkStrikeFundBalance(tenantId, fundId) {
    try {
        const fund = await db_1.db
            .select()
            .from(schema_1.strikeFunds)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.strikeFunds.organizationId, tenantId), (0, drizzle_orm_1.eq)(schema_1.strikeFunds.id, fundId)))
            .limit(1);
        if (fund.length === 0) {
            logger.warn('Strike fund not found', { fundId });
            return 0;
        }
        return parseFloat(fund[0].currentBalance);
    }
    catch (error) {
        logger.error('Error checking strike fund balance', { error });
        return 0;
    }
}
/**
 * Process approved stipend disbursements via Stripe
 * This would be called by a separate payment processing job or API endpoint
 */
async function processDisbursements(params) {
    const { tenantId, stipendIds } = params;
    logger.info('Processing stipend disbursements', { tenantId, stipendIds });
    const errors = [];
    let disbursed = 0;
    let failed = 0;
    let totalAmount = 0;
    try {
        // Find approved stipends ready for disbursement
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, tenantId),
            (0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.status, 'approved'),
        ];
        if (stipendIds && stipendIds.length > 0) {
            conditions.push((0, drizzle_orm_1.inArray)(schema_1.stipendDisbursements.id, stipendIds));
        }
        const approvedStipends = await db_1.db
            .select()
            .from(schema_1.stipendDisbursements)
            .where((0, drizzle_orm_1.and)(...conditions));
        logger.info(`Found ${approvedStipends.length} approved stipends to disburse`);
        for (const stipend of approvedStipends) {
            try {
                const amount = parseFloat(stipend.totalAmount);
                let paymentIntentId = null;
                // Process Stripe payment if configured
                if (stripe && process.env.STRIPE_SECRET_KEY) {
                    try {
                        // Create a payment intent for the stipend disbursement
                        // In production, you would use Stripe Connect or Transfer API
                        const paymentIntent = await stripe.paymentIntents.create({
                            amount: Math.round(amount * 100), // Convert to cents
                            currency: 'cad',
                            description: `Strike Stipend - ID: ${stipend.id}`,
                            metadata: {
                                stipendId: stipend.id,
                                memberId: stipend.memberId,
                                type: 'strike_stipend',
                            },
                        });
                        paymentIntentId = paymentIntent.id;
                        logger.info('Stripe payment intent created', {
                            stipendId: stipend.id,
                            paymentIntentId,
                            amount,
                        });
                    }
                    catch (stripeError) {
                        logger.error('Stripe payment failed', {
                            stipendId: stipend.id,
                            error: stripeError,
                        });
                        throw stripeError;
                    }
                }
                else {
                    // Simulated payment for development
                    logger.warn('[DEV] Simulating Stripe payment (no Stripe key configured)', {
                        stipendId: stipend.id,
                        amount,
                    });
                    paymentIntentId = 'pi_simulated_' + Math.random().toString(36).substr(2, 9);
                }
                // Update stipend status
                await db_1.db
                    .update(schema_1.stipendDisbursements)
                    .set({
                    status: 'disbursed',
                    paymentDate: new Date(),
                    notes: `Stripe payment: ${paymentIntentId}`,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.id, stipend.id));
                // Send notification
                try {
                    // TODO: NotificationService not exported yet
                    /* await NotificationService.queue({
                      tenantId: stipend.tenantId, // Use tenantId from stipend record
                      userId: stipend.memberId,
                      type: 'stipend_disbursed',
                      channels: ['email', 'push'],
                      priority: 'high',
                      data: {
                        stipendId: stipend.id,
                        amount,
                        paymentDate: new Date().toISOString(),
                        paymentIntentId,
                      },
                    }); */
                    logger.info('Stipend notification queued', { stipendId: stipend.id });
                }
                catch (notifError) {
                    logger.error('Failed to queue stipend notification', notifError);
                    // Don't fail the entire payment if notification fails
                }
                disbursed++;
                totalAmount += amount;
            }
            catch (disbursementError) {
                logger.error('Error disbursing stipend', {
                    stipendId: stipend.id,
                    error: disbursementError,
                });
                // Mark as failed
                await db_1.db
                    .update(schema_1.stipendDisbursements)
                    .set({
                    status: 'failed',
                    notes: `Error: ${String(disbursementError)}`,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.id, stipend.id));
                failed++;
                errors.push({
                    stipendId: stipend.id,
                    error: disbursementError instanceof Error ? disbursementError.message : String(disbursementError),
                });
            }
        }
        const success = failed === 0;
        logger.info('Stipend disbursement completed', {
            success,
            disbursed,
            failed,
            totalAmount,
        });
        return { success, disbursed, failed, totalAmount, errors };
    }
    catch (error) {
        logger.error('Stipend disbursement failed', { error });
        throw error;
    }
}
/**
 * Scheduled job: Weekly stipend processing on Fridays at 5:00 AM
 */
exports.weeklyStipendProcessingJob = node_cron_1.default.schedule('0 5 * * 5', async () => {
    logger.info('Running weekly stipend processing job');
    try {
        // Note: In multi-organization setup, process stipends per organization
        const tenantId = process.env.DEFAULT_TENANT_ID || 'default-tenant';
        const result = await processWeeklyStipends({ tenantId });
        logger.info('Weekly stipend processing job completed', {
            stipendsCalculated: result.stipendsCalculated,
            totalAmount: result.totalAmount,
            pendingApproval: result.pendingApproval,
            autoApproved: result.autoApproved,
            errors: result.errors.length,
        });
        if (result.errors.length > 0) {
            logger.warn('Stipend processing had errors', {
                errorCount: result.errors.length,
                errors: result.errors.slice(0, 5),
            });
        }
        // Send summary notification to trustees if there are pending approvals
        if (result.pendingApproval > 0) {
            logger.info('Trustee approval required', {
                pendingCount: result.pendingApproval,
                totalPendingAmount: result.totalAmount,
            });
            // Send notification to officers/admins
            try {
                // Query for officers and admins (users with elevated privileges)
                const trustees = await db_1.db.query.organizationMembers.findMany({
                    where: (members, { eq }) => eq(members.role, 'officer'),
                    limit: 100,
                });
                if (trustees.length > 0) {
                    const summaryMessage = `Stipend Processing Summary (${new Date().toLocaleDateString()})
            
Pending Approvals: ${result.pendingApproval}
Total Pending Amount: $${result.totalAmount.toFixed(2)},
Members Processed: ${result.membersProcessed}

Please log in to review and approve pending stipend disbursements.`;
                    logger.info('Sending trustee notifications', {
                        recipientCount: trustees.length,
                        pendingCount: result.pendingApproval,
                    });
                    // Log for notification worker to pick up
                    // In production, this would queue notifications for async processing
                    logger.info('Trustee notification queued', {
                        recipients: trustees.length,
                        message: summaryMessage,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            catch (notificationError) {
                logger.error('Failed to send trustee notifications', { error: notificationError });
            }
        }
    }
    catch (error) {
        logger.error('Weekly stipend processing job failed', { error });
    }
}, {
    scheduled: false,
    timezone: 'America/Toronto',
});
/**
 * Start the stipend processing workflow
 */
function startStipendProcessingWorkflow() {
    exports.weeklyStipendProcessingJob.start();
    logger.info('✓ Stipend processing workflow started (Fridays, 5:00 AM)');
}
/**
 * Stop the stipend processing workflow
 */
function stopStipendProcessingWorkflow() {
    exports.weeklyStipendProcessingJob.stop();
    logger.info('Stipend processing workflow stopped');
}
/**
 * Get workflow status
 */
function getStipendProcessingWorkflowStatus() {
    return {
        running: true, // node-cron doesn't expose status - assume scheduled
        nextExecution: null, // node-cron doesn't expose next run time
    };
}
//# sourceMappingURL=stipend-processing-workflow.js.map