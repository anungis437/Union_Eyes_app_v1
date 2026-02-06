"use strict";
/**
 * Dues Transactions Routes
 * Endpoints for calculating and managing dues transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const financial_1 = require("@union-claims/financial");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
const calculationEngine = new financial_1.DuesCalculationEngine();
// Validation schemas
const calculateDuesSchema = zod_1.z.object({
    memberId: zod_1.z.string().uuid(),
    billingPeriodStart: zod_1.z.coerce.date(),
    billingPeriodEnd: zod_1.z.coerce.date(),
    grossWages: zod_1.z.coerce.number().optional(),
    baseSalary: zod_1.z.coerce.number().optional(),
    hourlyRate: zod_1.z.coerce.number().optional(),
    hoursWorked: zod_1.z.coerce.number().optional(),
});
const batchCalculateSchema = zod_1.z.object({
    billingPeriodStart: zod_1.z.coerce.date(),
    billingPeriodEnd: zod_1.z.coerce.date(),
    memberIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    memberData: zod_1.z.array(zod_1.z.object({
        memberId: zod_1.z.string().uuid(),
        grossWages: zod_1.z.number().optional(),
        baseSalary: zod_1.z.number().optional(),
        hourlyRate: zod_1.z.number().optional(),
        hoursWorked: zod_1.z.number().optional(),
    })).optional(),
    dryRun: zod_1.z.boolean().default(false),
});
/**
 * POST /api/dues/transactions/calculate
 * Calculate dues for a single member (preview without saving)
 */
router.post('/calculate', async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const validatedData = calculateDuesSchema.parse(req.body);
        // Fetch active assignment with joined rule
        const [assignment] = await db_1.db
            .select()
            .from(db_1.schema.memberDuesAssignments)
            .leftJoin(db_1.schema.duesRules, (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.ruleId, db_1.schema.duesRules.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.memberId, validatedData.memberId), (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.isActive, true), (0, drizzle_orm_1.isNull)(db_1.schema.memberDuesAssignments.endDate)))
            .limit(1);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                error: 'No active dues assignment found for member',
            });
        }
        const rule = assignment.dues_rules;
        if (!rule) {
            return res.status(404).json({
                success: false,
                error: 'Dues rule not found',
            });
        }
        // Prepare calculation input
        const calculationInput = {
            memberId: validatedData.memberId,
            tenantId: tenantId,
            assignmentId: assignment.member_dues_assignments.id,
            rule: {
                id: rule.id,
                tenantId: rule.tenantId,
                ruleName: rule.ruleName,
                ruleCode: rule.ruleCode,
                calculationType: rule.calculationType,
                percentageRate: rule.percentageRate ? Number(rule.percentageRate) : undefined,
                baseField: rule.baseField,
                flatAmount: rule.flatAmount ? Number(rule.flatAmount) : undefined,
                hourlyRate: rule.hourlyRate ? Number(rule.hourlyRate) : undefined,
                hoursPerPeriod: rule.hoursPerPeriod ? Number(rule.hoursPerPeriod) : undefined,
                tierStructure: rule.tierStructure,
                customFormula: rule.customFormula,
                billingFrequency: rule.billingFrequency,
                copeContribution: 0,
                pacContribution: 0,
                initiationFee: 0,
                strikeFundContribution: 0,
                gracePeriodDays: 0,
                lateFeeType: 'none',
                effectiveFrom: new Date(rule.effectiveDate),
                effectiveTo: rule.endDate ? new Date(rule.endDate) : undefined,
                isActive: rule.isActive,
            },
            billingPeriodStart: new Date(validatedData.billingPeriodStart),
            billingPeriodEnd: new Date(validatedData.billingPeriodEnd),
            dueDate: new Date(validatedData.billingPeriodEnd),
            grossWages: validatedData.grossWages,
            baseSalary: validatedData.baseSalary,
            hourlyRate: validatedData.hourlyRate,
            hoursWorked: validatedData.hoursWorked,
        };
        // Calculate dues
        const result = await calculationEngine.calculateMemberDues(calculationInput);
        res.json({
            success: true,
            data: {
                calculation: result,
                assignment: assignment.member_dues_assignments,
                rule: {
                    id: rule.id,
                    name: rule.ruleName,
                    code: rule.ruleCode,
                    calculationType: rule.calculationType,
                },
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/dues/transactions/batch
 * Batch calculate and create transactions for multiple members
 */
router.post('/batch', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions for batch operations',
            });
        }
        const validatedData = batchCalculateSchema.parse(req.body);
        // Build query for active assignments
        const conditions = [
            (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.tenantId, tenantId),
            (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.isActive, true),
            (0, drizzle_orm_1.isNull)(db_1.schema.memberDuesAssignments.endDate),
        ];
        if (validatedData.memberIds && validatedData.memberIds.length > 0) {
            conditions.push((0, drizzle_orm_1.inArray)(db_1.schema.memberDuesAssignments.memberId, validatedData.memberIds));
        }
        // Fetch all active assignments with rules
        const assignments = await db_1.db
            .select()
            .from(db_1.schema.memberDuesAssignments)
            .leftJoin(db_1.schema.duesRules, (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.ruleId, db_1.schema.duesRules.id))
            .where((0, drizzle_orm_1.and)(...conditions));
        if (assignments.length === 0) {
            return res.json({
                success: true,
                data: {
                    summary: {
                        totalProcessed: 0,
                        successCount: 0,
                        errorCount: 0,
                        totalRevenue: 0,
                    },
                    transactions: [],
                    errors: [],
                },
            });
        }
        // Prepare calculation inputs
        const calculationInputs = assignments
            .filter((a) => a.dues_rules !== null)
            .map((assignment) => {
            const rule = assignment.dues_rules;
            const memberAssignment = assignment.member_dues_assignments;
            const memberInfo = validatedData.memberData?.find((m) => m.memberId === memberAssignment.memberId);
            return {
                memberId: memberAssignment.memberId,
                tenantId: tenantId,
                assignmentId: memberAssignment.id,
                rule: {
                    id: rule.id,
                    tenantId: rule.tenantId,
                    ruleName: rule.ruleName,
                    ruleCode: rule.ruleCode,
                    calculationType: rule.calculationType,
                    percentageRate: rule.percentageRate ? Number(rule.percentageRate) : undefined,
                    baseField: rule.baseField,
                    flatAmount: rule.flatAmount ? Number(rule.flatAmount) : undefined,
                    hourlyRate: rule.hourlyRate ? Number(rule.hourlyRate) : undefined,
                    hoursPerPeriod: rule.hoursPerPeriod ? Number(rule.hoursPerPeriod) : undefined,
                    tierStructure: rule.tierStructure,
                    customFormula: rule.customFormula,
                    billingFrequency: rule.billingFrequency,
                    copeContribution: 0,
                    pacContribution: 0,
                    initiationFee: 0,
                    strikeFundContribution: 0,
                    gracePeriodDays: 0,
                    lateFeeType: 'none',
                    effectiveFrom: new Date(rule.effectiveDate),
                    effectiveTo: rule.endDate ? new Date(rule.endDate) : undefined,
                    isActive: rule.isActive,
                },
                billingPeriodStart: new Date(validatedData.billingPeriodStart),
                billingPeriodEnd: new Date(validatedData.billingPeriodEnd),
                dueDate: new Date(validatedData.billingPeriodEnd),
                grossWages: memberInfo?.grossWages,
                baseSalary: memberInfo?.baseSalary,
                hourlyRate: memberInfo?.hourlyRate,
                hoursWorked: memberInfo?.hoursWorked,
            };
        });
        // Run batch calculation
        const batchResult = calculationEngine.batchCalculateDuesSimple(calculationInputs);
        // If dry run, return results without saving
        if (validatedData.dryRun) {
            return res.json({
                success: true,
                data: {
                    totalProcessed: batchResult.totalProcessed,
                    successful: batchResult.successful,
                    failed: batchResult.failed,
                    summary: batchResult.summary,
                    dryRun: true,
                    message: 'Dry run - no transactions created',
                },
            });
        }
        // Create transaction records
        const transactionsToInsert = batchResult.results
            .filter((r) => !r.errors || r.errors.length === 0) // Check for no errors instead of success property
            .map((result) => {
            const assignment = assignments.find((a) => a.member_dues_assignments.memberId === result.memberId);
            const dueDate = new Date(validatedData.billingPeriodEnd);
            dueDate.setDate(dueDate.getDate() + 7); // Due 7 days after period end
            return {
                tenantId,
                memberId: result.memberId,
                assignmentId: assignment.member_dues_assignments.id,
                transactionType: 'dues',
                periodStart: validatedData.billingPeriodStart,
                periodEnd: validatedData.billingPeriodEnd,
                dueDate: dueDate.toISOString().split('T')[0],
                amount: result.totalAmount.toString(),
                status: 'pending',
                createdBy: userId,
            };
        });
        let createdTransactions = [];
        if (transactionsToInsert.length > 0) {
            createdTransactions = await db_1.db
                .insert(db_1.schema.duesTransactions)
                .values(transactionsToInsert)
                .returning();
        }
        res.json({
            success: true,
            data: {
                summary: batchResult.summary,
                transactionsCreated: createdTransactions.length,
                transactions: createdTransactions,
                errors: batchResult.results.filter((r) => r.errors && r.errors.length > 0),
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/dues/transactions
 * List transactions with filters
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { memberId, status, startDate, endDate } = req.query;
        const conditions = [(0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.tenantId, tenantId)];
        if (memberId) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.memberId, memberId));
        }
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.status, status));
        }
        if (startDate && endDate) {
            conditions.push((0, drizzle_orm_1.between)(db_1.schema.duesTransactions.periodStart, startDate, endDate));
        }
        const transactions = await db_1.db
            .select()
            .from(db_1.schema.duesTransactions)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.schema.duesTransactions.createdAt))
            .limit(100);
        res.json({
            success: true,
            data: transactions,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/dues/transactions/:id
 * Get single transaction
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const [transaction] = await db_1.db
            .select()
            .from(db_1.schema.duesTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.id, id), (0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.tenantId, tenantId)))
            .limit(1);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
        }
        res.json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=dues-transactions.js.map