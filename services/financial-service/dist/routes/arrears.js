"use strict";
/**
 * Arrears Management Routes
 * Endpoints for collections, payment plans, and escalation workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const arrears_detection_1 = require("../services/arrears-detection");
const router = (0, express_1.Router)();
// Validation schemas
const createArrearsCaseSchema = zod_1.z.object({
    memberId: zod_1.z.string().uuid(),
    transactionIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    totalAmount: zod_1.z.coerce.number().positive(),
    daysOverdue: zod_1.z.number().int().positive(),
    notes: zod_1.z.string().optional(),
});
const paymentPlanSchema = zod_1.z.object({
    installmentAmount: zod_1.z.coerce.number().positive(),
    numberOfInstallments: zod_1.z.number().int().positive(),
    startDate: zod_1.z.coerce.date(),
    frequency: zod_1.z.enum(['weekly', 'biweekly', 'monthly']),
    notes: zod_1.z.string().optional(),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'payment_plan', 'suspended', 'legal_action', 'resolved', 'written_off']),
    notes: zod_1.z.string().optional(),
});
const contactLogSchema = zod_1.z.object({
    contactType: zod_1.z.enum(['email', 'phone', 'letter', 'in_person']),
    notes: zod_1.z.string().min(1),
    outcome: zod_1.z.string().optional(),
});
const arrearsDetectionSchema = zod_1.z.object({
    gracePeriodDays: zod_1.z.coerce.number().int().nonnegative().default(30),
    lateFeePercentage: zod_1.z.coerce.number().min(0).max(100).optional(),
    lateFeeFixedAmount: zod_1.z.coerce.number().min(0).optional(),
    applyLateFees: zod_1.z.boolean().default(false),
    createCases: zod_1.z.boolean().default(true),
    escalationThresholds: zod_1.z
        .object({
        level1Days: zod_1.z.number().int().positive().default(30),
        level2Days: zod_1.z.number().int().positive().default(60),
        level3Days: zod_1.z.number().int().positive().default(90),
        level4Days: zod_1.z.number().int().positive().default(120),
    })
        .optional(),
});
/**
 * POST /api/arrears/detect
 * Run automated arrears detection
 */
router.post('/detect', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const validatedData = arrearsDetectionSchema.parse(req.body);
        const config = {
            tenantId,
            gracePeriodDays: validatedData.gracePeriodDays,
            escalationThresholds: validatedData.escalationThresholds,
        };
        if (validatedData.applyLateFees) {
            config.lateFeePercentage = validatedData.lateFeePercentage || 0;
            config.lateFeeFixedAmount = validatedData.lateFeeFixedAmount || 0;
        }
        let result;
        if (validatedData.createCases) {
            // Run full detection and create cases
            result = await (0, arrears_detection_1.runArrearsDetection)(config, userId);
        }
        else {
            // Just detect without creating cases
            const detected = await (0, arrears_detection_1.detectOverduePayments)(config);
            result = {
                detectedCount: detected.length,
                casesCreated: [],
                totalOwing: detected.reduce((sum, a) => sum + a.totalOwing, 0),
                feesApplied: 0,
                detectedArrears: detected,
            };
        }
        res.json({
            success: true,
            data: result,
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
 * GET /api/arrears
 * List all arrears cases with filters
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { memberId, status } = req.query;
        const conditions = [(0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId)];
        if (memberId) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.memberId, memberId));
        }
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.status, status));
        }
        const cases = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.schema.arrearsCases.createdAt))
            .limit(100);
        res.json({
            success: true,
            data: cases,
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
 * GET /api/arrears/:id
 * Get single arrears case with related transactions
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const [arrearsCase] = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId)))
            .limit(1);
        if (!arrearsCase) {
            return res.status(404).json({
                success: false,
                error: 'Arrears case not found',
            });
        }
        // Fetch related transactions
        const transactionIds = arrearsCase.transactionIds;
        let transactions = [];
        if (transactionIds && transactionIds.length > 0) {
            transactions = await db_1.db
                .select()
                .from(db_1.schema.duesTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.tenantId, tenantId), (0, drizzle_orm_1.sql) `${db_1.schema.duesTransactions.id} = ANY(${transactionIds})`));
        }
        res.json({
            success: true,
            data: {
                case: arrearsCase,
                transactions,
            },
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
 * POST /api/arrears
 * Create a new arrears case
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const validatedData = createArrearsCaseSchema.parse(req.body);
        // Check if active case already exists for member
        const [existingCase] = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.memberId, validatedData.memberId), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.status, 'active')))
            .limit(1);
        if (existingCase) {
            return res.status(409).json({
                success: false,
                error: 'Active arrears case already exists for this member',
            });
        }
        const [arrearsCase] = await db_1.db
            .insert(db_1.schema.arrearsCases)
            .values({
            tenantId,
            memberId: validatedData.memberId,
            transactionIds: validatedData.transactionIds,
            totalAmount: validatedData.totalAmount.toString(),
            remainingBalance: validatedData.totalAmount.toString(),
            daysOverdue: validatedData.daysOverdue.toString(),
            status: 'active',
            escalationLevel: '1',
            notes: validatedData.notes,
            createdBy: userId,
        })
            .returning();
        res.status(201).json({
            success: true,
            data: arrearsCase,
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
 * POST /api/arrears/:id/payment-plan
 * Create or update payment plan for arrears case
 */
router.post('/:id/payment-plan', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const validatedData = paymentPlanSchema.parse(req.body);
        // Fetch arrears case
        const [arrearsCase] = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId)))
            .limit(1);
        if (!arrearsCase) {
            return res.status(404).json({
                success: false,
                error: 'Arrears case not found',
            });
        }
        // Calculate payment schedule
        const paymentSchedule = [];
        let currentDate = new Date(validatedData.startDate);
        for (let i = 0; i < validatedData.numberOfInstallments; i++) {
            paymentSchedule.push({
                installmentNumber: i + 1,
                dueDate: new Date(currentDate),
                amount: validatedData.installmentAmount,
                status: 'pending',
            });
            // Calculate next due date based on frequency
            switch (validatedData.frequency) {
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'biweekly':
                    currentDate.setDate(currentDate.getDate() + 14);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
            }
        }
        const [updatedCase] = await db_1.db
            .update(db_1.schema.arrearsCases)
            .set({
            status: 'payment_plan',
            paymentPlanActive: true,
            paymentPlanStartDate: validatedData.startDate.toISOString().split('T')[0],
            installmentAmount: validatedData.installmentAmount.toString(),
            numberOfInstallments: validatedData.numberOfInstallments.toString(),
            paymentSchedule,
        })
            .where((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id))
            .returning();
        res.json({
            success: true,
            data: {
                case: updatedCase,
                paymentSchedule,
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
 * PUT /api/arrears/:id/status
 * Update arrears case status (escalation workflow)
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        const { id } = req.params;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const validatedData = updateStatusSchema.parse(req.body);
        // Determine escalation level based on status
        const escalationLevels = {
            active: 1,
            payment_plan: 2,
            suspended: 3,
            legal_action: 4,
            resolved: 0,
            written_off: 0,
        };
        const [updatedCase] = await db_1.db
            .update(db_1.schema.arrearsCases)
            .set({
            status: validatedData.status,
            escalationLevel: escalationLevels[validatedData.status].toString(),
            notes: validatedData.notes,
            updatedBy: userId,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId)))
            .returning();
        if (!updatedCase) {
            return res.status(404).json({
                success: false,
                error: 'Arrears case not found',
            });
        }
        res.json({
            success: true,
            data: updatedCase,
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
 * POST /api/arrears/:id/contact
 * Log contact attempt with member
 */
router.post('/:id/contact', async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { id } = req.params;
        const validatedData = contactLogSchema.parse(req.body);
        // Fetch current case
        const [arrearsCase] = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId)))
            .limit(1);
        if (!arrearsCase) {
            return res.status(404).json({
                success: false,
                error: 'Arrears case not found',
            });
        }
        // Add to contact history
        const contactHistory = arrearsCase.contactHistory || [];
        contactHistory.push({
            timestamp: new Date(),
            contactType: validatedData.contactType,
            notes: validatedData.notes,
            outcome: validatedData.outcome,
            performedBy: userId,
        });
        const [updatedCase] = await db_1.db
            .update(db_1.schema.arrearsCases)
            .set({
            contactHistory,
            lastContactDate: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id))
            .returning();
        res.json({
            success: true,
            data: updatedCase,
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
 * POST /api/arrears/:id/payment
 * Record a payment against arrears case
 */
router.post('/:id/payment', async (req, res) => {
    try {
        const { tenantId, userId } = req.user;
        const { id } = req.params;
        const paymentSchema = zod_1.z.object({
            amount: zod_1.z.coerce.number().positive(),
            paymentDate: zod_1.z.coerce.date().default(() => new Date()),
            paymentMethod: zod_1.z.string().optional(),
            notes: zod_1.z.string().optional(),
        });
        const validatedData = paymentSchema.parse(req.body);
        // Fetch current case
        const [arrearsCase] = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.tenantId, tenantId)))
            .limit(1);
        if (!arrearsCase) {
            return res.status(404).json({
                success: false,
                error: 'Arrears case not found',
            });
        }
        const currentBalance = Number(arrearsCase.remainingBalance);
        const paymentAmount = validatedData.amount;
        const newBalance = Math.max(0, currentBalance - paymentAmount);
        // Update case with payment
        const updateData = {
            remainingBalance: newBalance.toString(),
            updatedAt: new Date(),
        };
        // If fully paid, resolve the case
        if (newBalance === 0) {
            updateData.status = 'resolved';
            updateData.resolvedDate = new Date();
        }
        const [updatedCase] = await db_1.db
            .update(db_1.schema.arrearsCases)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, id))
            .returning();
        res.json({
            success: true,
            data: {
                case: updatedCase,
                payment: {
                    amount: paymentAmount,
                    previousBalance: currentBalance,
                    newBalance,
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
exports.default = router;
//# sourceMappingURL=arrears.js.map