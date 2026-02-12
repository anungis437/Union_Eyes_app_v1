"use strict";
/**
 * Monthly Dues Calculation Workflow
 * Week 11: Workflow Automation
 *
 * Runs on the 1st of every month at 2:00 AM
 * Automatically generates dues transactions for all active members
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlyDuesCalculationJob = void 0;
exports.processMonthlyDuesCalculation = processMonthlyDuesCalculation;
exports.startDuesCalculationWorkflow = startDuesCalculationWorkflow;
exports.stopDuesCalculationWorkflow = stopDuesCalculationWorkflow;
exports.getDuesCalculationWorkflowStatus = getDuesCalculationWorkflowStatus;
const node_cron_1 = __importDefault(require("node-cron"));
const winston_1 = __importDefault(require("winston"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
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
 * Calculate dues for all active members based on their assignments
 */
async function processMonthlyDuesCalculation(params) {
    const { tenantId, effectiveDate = new Date() } = params;
    logger.info('Starting monthly dues calculation', {
        tenantId,
        effectiveDate: effectiveDate.toISOString()
    });
    let membersProcessed = 0;
    let transactionsCreated = 0;
    const errors = [];
    try {
        // Get all active members with dues assignments
        const activeMembers = await db_1.db
            .select({
            memberId: schema_1.members.id,
            memberName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.members.firstName}, ' ', ${schema_1.members.lastName})`,
            memberEmail: schema_1.members.email,
            assignmentId: schema_1.duesAssignments.id,
            ruleId: schema_1.duesAssignments.ruleId,
            effectiveDate: schema_1.duesAssignments.effectiveDate,
            endDate: schema_1.duesAssignments.endDate,
        })
            .from(schema_1.members)
            .innerJoin(schema_1.duesAssignments, (0, drizzle_orm_1.eq)(schema_1.members.id, schema_1.duesAssignments.memberId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.members.organizationId, tenantId), (0, drizzle_orm_1.eq)(schema_1.members.status, 'active'), (0, drizzle_orm_1.lte)(schema_1.duesAssignments.effectiveDate, effectiveDate.toISOString().split('T')[0]), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.duesAssignments.endDate), (0, drizzle_orm_1.gte)(schema_1.duesAssignments.endDate, effectiveDate.toISOString().split('T')[0]))));
        logger.info(`Found ${activeMembers.length} active members with dues assignments`);
        // Process each member
        for (const member of activeMembers) {
            try {
                // Get the dues rule details
                const [rule] = await db_1.db
                    .select()
                    .from(schema_1.duesRules)
                    .where((0, drizzle_orm_1.eq)(schema_1.duesRules.id, member.ruleId))
                    .limit(1);
                if (!rule) {
                    errors.push({
                        memberId: member.memberId,
                        error: `Dues rule ${member.ruleId} not found`,
                    });
                    continue;
                }
                // Calculate due date (end of current month)
                const dueDate = new Date(effectiveDate);
                dueDate.setMonth(dueDate.getMonth() + 1, 0); // Last day of month
                // Calculate total amount based on rule
                const baseDues = Number(rule.flatAmount) || 0;
                const totalAmount = baseDues; // Simplified - in production would include COPE, PAC, etc.
                // Check if transaction already exists for this period
                const existingTransaction = await db_1.db
                    .select()
                    .from(schema_1.duesTransactions)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesTransactions.organizationId, tenantId), (0, drizzle_orm_1.eq)(schema_1.duesTransactions.memberId, member.memberId), (0, drizzle_orm_1.eq)(schema_1.duesTransactions.periodStart, effectiveDate.toISOString().split('T')[0])))
                    .limit(1);
                if (existingTransaction.length > 0) {
                    logger.info(`Transaction already exists for member ${member.memberId} for period ${effectiveDate.toISOString()}`);
                    membersProcessed++;
                    continue;
                }
                // Create dues transaction
                const periodEnd = new Date(effectiveDate);
                periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
                await db_1.db.insert(schema_1.duesTransactions).values({
                    tenantId,
                    memberId: member.memberId,
                    assignmentId: member.assignmentId || null,
                    periodStart: effectiveDate.toISOString().split('T')[0],
                    periodEnd: periodEnd.toISOString().split('T')[0],
                    amount: totalAmount.toString(),
                    duesAmount: totalAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    status: 'pending',
                    dueDate: dueDate.toISOString().split('T')[0],
                    transactionType: 'dues',
                });
                membersProcessed++;
                transactionsCreated++;
                logger.info(`Created dues transaction for member ${member.memberId}`, {
                    amount: totalAmount,
                    dueDate: dueDate.toISOString(),
                });
            }
            catch (memberError) {
                logger.error(`Error processing member ${member.memberId}`, { error: memberError });
                errors.push({
                    memberId: member.memberId,
                    error: String(memberError),
                });
            }
        }
        logger.info('Monthly dues calculation completed', {
            membersProcessed,
            transactionsCreated,
            errorsCount: errors.length,
        });
        return {
            success: true,
            membersProcessed,
            transactionsCreated,
            errors,
        };
    }
    catch (error) {
        logger.error('Error in monthly dues calculation', { error });
        return {
            success: false,
            membersProcessed,
            transactionsCreated,
            errors: [{ memberId: 'system', error: String(error) }],
        };
    }
}
/**
 * Cron job: Runs on 1st of every month at 2:00 AM
 */
exports.monthlyDuesCalculationJob = node_cron_1.default.schedule('0 2 1 * *', async () => {
    try {
        logger.info('Starting scheduled monthly dues calculation...');
        // In production, iterate through all tenants
        const tenantId = '11111111-1111-1111-1111-111111111111'; // Test tenant
        const result = await processMonthlyDuesCalculation({ tenantId });
        logger.info('Scheduled monthly dues calculation completed', {
            membersProcessed: result.membersProcessed,
            transactionsCreated: result.transactionsCreated,
            errors: result.errors.length,
        });
    }
    catch (error) {
        logger.error('Error in monthly dues calculation job', { error });
    }
}, {
    scheduled: false,
    timezone: 'America/Toronto',
});
/**
 * Start the dues calculation workflow
 */
function startDuesCalculationWorkflow() {
    exports.monthlyDuesCalculationJob.start();
    logger.info('✓ Monthly dues calculation workflow started (1st of month, 2:00 AM)');
}
/**
 * Stop the dues calculation workflow
 */
function stopDuesCalculationWorkflow() {
    exports.monthlyDuesCalculationJob.stop();
    logger.info('Monthly dues calculation workflow stopped');
}
/**
 * Get workflow status
 */
function getDuesCalculationWorkflowStatus() {
    return {
        name: 'Monthly Dues Calculation',
        schedule: '1st of month, 2:00 AM',
        running: true, // node-cron doesn't expose status - assume scheduled
        nextRun: null, // node-cron doesn't expose next run time
    };
}
//# sourceMappingURL=dues-calculation-workflow.js.map