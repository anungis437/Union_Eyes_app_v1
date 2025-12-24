"use strict";
/**
 * Arrears Management Workflow
 * Week 11: Workflow Automation
 *
 * Runs weekly on Sundays at 3:00 AM
 * Scans for overdue payments and sends stage-based notifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyArrearsManagementJob = void 0;
exports.processArrearsManagement = processArrearsManagement;
exports.startArrearsManagementWorkflow = startArrearsManagementWorkflow;
exports.stopArrearsManagementWorkflow = stopArrearsManagementWorkflow;
exports.getArrearsManagementWorkflowStatus = getArrearsManagementWorkflowStatus;
const node_cron_1 = __importDefault(require("node-cron"));
const winston_1 = __importDefault(require("winston"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const notification_service_1 = require("../services/notification-service");
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
 * Scan for overdue dues and create/update arrears records
 */
async function processArrearsManagement(params) {
    const { tenantId, scanDate = new Date() } = params;
    logger.info('Starting arrears management scan', {
        tenantId,
        scanDate: scanDate.toISOString()
    });
    let overdueTransactions = 0;
    let arrearsCreated = 0;
    let notificationsSent = 0;
    const errors = [];
    try {
        // Find all overdue transactions (due date passed, status not 'paid')
        const overdueRecords = await db_1.db
            .select({
            transactionId: schema_1.duesTransactions.id,
            memberId: schema_1.duesTransactions.memberId,
            amount: schema_1.duesTransactions.amount,
            dueDate: schema_1.duesTransactions.dueDate,
            periodStart: schema_1.duesTransactions.periodStart,
            periodEnd: schema_1.duesTransactions.periodEnd,
            memberName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.members.firstName}, ' ', ${schema_1.members.lastName})`,
            memberEmail: schema_1.members.email,
        })
            .from(schema_1.duesTransactions)
            .innerJoin(schema_1.members, (0, drizzle_orm_1.eq)(schema_1.duesTransactions.memberId, schema_1.members.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, tenantId), (0, drizzle_orm_1.lt)(schema_1.duesTransactions.dueDate, scanDate.toISOString().split('T')[0]), (0, drizzle_orm_1.eq)(schema_1.duesTransactions.status, 'pending')));
        logger.info(`Found ${overdueRecords.length} overdue transactions`);
        overdueTransactions = overdueRecords.length;
        for (const record of overdueRecords) {
            try {
                // Check if arrears record already exists
                const existingArrears = await db_1.db
                    .select()
                    .from(schema_1.arrears)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.arrears.memberId, record.memberId), (0, drizzle_orm_1.eq)(schema_1.arrears.arrearsStatus, 'active')))
                    .limit(1);
                const daysOverdue = Math.floor((scanDate.getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                // Determine notification stage based on days overdue
                let notificationStage = 'reminder';
                if (daysOverdue > 60) {
                    notificationStage = 'suspension';
                }
                else if (daysOverdue > 45) {
                    notificationStage = 'final_notice';
                }
                else if (daysOverdue > 30) {
                    notificationStage = 'warning';
                }
                if (existingArrears.length === 0) {
                    // Create new arrears record
                    await db_1.db.insert(schema_1.arrears).values({
                        tenantId,
                        memberId: record.memberId,
                        totalOwed: record.amount,
                        oldestDebtDate: record.dueDate,
                        arrearsStatus: 'active',
                        notes: `1 overdue transaction(s), ${daysOverdue} days overdue. Last notification: ${scanDate.toISOString()}`,
                    });
                    arrearsCreated++;
                    logger.info(`Created arrears record for member ${record.memberId}`);
                }
                else {
                    // Update existing arrears record
                    const currentTotal = Number(existingArrears[0].totalOwed) + Number(record.amount);
                    await db_1.db
                        .update(schema_1.arrears)
                        .set({
                        totalOwed: currentTotal.toString(),
                        notes: `Multiple overdue transactions, ${daysOverdue} days overdue. Last notification: ${scanDate.toISOString()}`,
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.arrears.id, existingArrears[0].id));
                    logger.info(`Updated arrears record for member ${record.memberId}`);
                }
                // Send notification based on stage
                await (0, notification_service_1.queueNotification)({
                    tenantId,
                    userId: record.memberId,
                    type: 'payment_reminder',
                    channels: notificationStage === 'suspension' ? ['email', 'sms'] : ['email'],
                    priority: notificationStage === 'suspension' ? 'urgent' : 'normal',
                    data: {
                        memberName: record.memberName,
                        amountOwed: record.amount,
                        dueDate: record.dueDate,
                        daysOverdue: daysOverdue.toString(),
                        notificationStage,
                        message: getNotificationMessage(notificationStage, daysOverdue, Number(record.amount)),
                        paymentUrl: `${process.env.APP_URL}/payments/dues`,
                    },
                });
                notificationsSent++;
                // Update transaction status
                await db_1.db
                    .update(schema_1.duesTransactions)
                    .set({ status: 'overdue', updatedAt: scanDate })
                    .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.id, record.transactionId));
            }
            catch (recordError) {
                logger.error(`Error processing overdue transaction ${record.transactionId}`, { error: recordError });
                errors.push({
                    transactionId: record.transactionId,
                    error: String(recordError),
                });
            }
        }
        logger.info('Arrears management scan completed', {
            overdueTransactions,
            arrearsCreated,
            notificationsSent,
            errorsCount: errors.length,
        });
        return {
            success: true,
            overdueTransactions,
            arrearsCreated,
            notificationsSent,
            errors,
        };
    }
    catch (error) {
        logger.error('Error in arrears management', { error });
        return {
            success: false,
            overdueTransactions,
            arrearsCreated,
            notificationsSent,
            errors: [{ transactionId: 'system', error: String(error) }],
        };
    }
}
/**
 * Generate stage-appropriate notification message
 */
function getNotificationMessage(stage, daysOverdue, amount) {
    switch (stage) {
        case 'reminder':
            return `Friendly reminder: Your union dues payment of $${amount.toFixed(2)} is ${daysOverdue} days overdue. Please submit payment at your earliest convenience.`;
        case 'warning':
            return `IMPORTANT: Your union dues payment of $${amount.toFixed(2)} is now ${daysOverdue} days overdue. Immediate payment is required to avoid further action.`;
        case 'final_notice':
            return `FINAL NOTICE: Your union dues payment of $${amount.toFixed(2)} is ${daysOverdue} days overdue. Payment must be received within 15 days to avoid suspension of union benefits.`;
        case 'suspension':
            return `SUSPENSION NOTICE: Due to non-payment of $${amount.toFixed(2)} (${daysOverdue} days overdue), your union benefits have been suspended. Contact the union office immediately to arrange payment and reinstatement.`;
        default:
            return `Your union dues payment of $${amount.toFixed(2)} is overdue. Please submit payment as soon as possible.`;
    }
}
/**
 * Cron job: Runs weekly on Sundays at 3:00 AM
 */
exports.weeklyArrearsManagementJob = node_cron_1.default.schedule('0 3 * * 0', async () => {
    try {
        logger.info('Starting scheduled arrears management scan...');
        // In production, iterate through all tenants
        const tenantId = '11111111-1111-1111-1111-111111111111'; // Test tenant
        const result = await processArrearsManagement({ tenantId });
        logger.info('Scheduled arrears management completed', {
            overdueTransactions: result.overdueTransactions,
            arrearsCreated: result.arrearsCreated,
            notificationsSent: result.notificationsSent,
            errors: result.errors.length,
        });
    }
    catch (error) {
        logger.error('Error in arrears management job', { error });
    }
}, {
    scheduled: false,
    timezone: 'America/Toronto',
});
/**
 * Start the arrears management workflow
 */
function startArrearsManagementWorkflow() {
    exports.weeklyArrearsManagementJob.start();
    logger.info('✓ Arrears management workflow started (Sundays, 3:00 AM)');
}
/**
 * Stop the arrears management workflow
 */
function stopArrearsManagementWorkflow() {
    exports.weeklyArrearsManagementJob.stop();
    logger.info('Arrears management workflow stopped');
}
/**
 * Get workflow status
 */
function getArrearsManagementWorkflowStatus() {
    return {
        name: 'Arrears Management',
        schedule: 'Sundays, 3:00 AM',
        running: true, // node-cron doesn't expose status - assume scheduled
    };
}
//# sourceMappingURL=arrears-management-workflow.js.map