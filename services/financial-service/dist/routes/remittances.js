"use strict";
/**
 * Employer Remittances Routes
 * Endpoints for managing employer bulk payments and reconciliation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const financial_1 = require("@union-claims/financial");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
// Validation schemas
const createRemittanceSchema = zod_1.z.object({
    employerId: zod_1.z.string().uuid(),
    employerName: zod_1.z.string().min(1).max(255),
    batchNumber: zod_1.z.string().min(1).max(50),
    billingPeriodStart: zod_1.z.coerce.date(),
    billingPeriodEnd: zod_1.z.coerce.date(),
    remittancePeriodStart: zod_1.z.coerce.date().optional(),
    remittancePeriodEnd: zod_1.z.coerce.date().optional(),
    totalAmount: zod_1.z.coerce.number().positive(),
    totalMembers: zod_1.z.number().int().positive(),
    remittanceDate: zod_1.z.coerce.date(),
    paymentMethod: zod_1.z.enum(['check', 'ach', 'wire', 'credit_card']),
    referenceNumber: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
const reconcileSchema = zod_1.z.object({
    transactionIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    autoMatch: zod_1.z.boolean().default(true),
});
/**
 * GET /api/remittances
 * List all remittances with filters
 */
router.get('/', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { employerId, status, batchNumber } = req.query;
        const conditions = [(0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.tenantId, organizationId)];
        if (employerId) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.employerId, employerId));
        }
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.status, status));
        }
        const remittances = await db_1.db
            .select()
            .from(db_1.schema.employerRemittances)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.schema.employerRemittances.remittanceDate))
            .limit(100);
        res.json({
            success: true,
            data: remittances,
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
 * GET /api/remittances/:id
 * Get single remittance with matched transactions
 */
router.get('/:id', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const [remittance] = await db_1.db
            .select()
            .from(db_1.schema.employerRemittances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id), (0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.tenantId, organizationId)))
            .limit(1);
        if (!remittance) {
            return res.status(404).json({
                success: false,
                error: 'Remittance not found',
            });
        }
        // Fetch matched transactions - note: remittanceId doesn't exist in schema
        // Would need to add this column or use metadata for tracking
        const transactions = [];
        res.json({
            success: true,
            data: {
                remittance,
                matchedTransactions: transactions,
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
 * POST /api/remittances
 * Create a new remittance record
 */
router.post('/', async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const validatedData = createRemittanceSchema.parse(req.body);
        // Batch number field doesn't exist in schema - skip duplicate check
        // Could use fileHash or metadata for tracking if needed
        const [remittance] = await db_1.db
            .insert(db_1.schema.employerRemittances)
            .values({
            tenantId: organizationId,
            employerName: validatedData.employerName,
            employerId: validatedData.employerId,
            remittancePeriodStart: validatedData.remittancePeriodStart || validatedData.billingPeriodStart,
            remittancePeriodEnd: validatedData.remittancePeriodEnd || validatedData.billingPeriodEnd,
            totalAmount: validatedData.totalAmount.toString(),
            memberCount: validatedData.totalMembers || 0,
            remittanceDate: validatedData.remittanceDate,
            status: 'pending',
            notes: validatedData.notes,
            // Store additional data in metadata if needed
            metadata: validatedData.referenceNumber ? { referenceNumber: validatedData.referenceNumber } : {},
        })
            .returning();
        res.status(201).json({
            success: true,
            data: remittance,
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
 * POST /api/remittances/:id/reconcile
 * Reconcile remittance with dues transactions
 */
router.post('/:id/reconcile', async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        const { id } = req.params;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const validatedData = reconcileSchema.parse(req.body);
        // Fetch remittance
        const [remittance] = await db_1.db
            .select()
            .from(db_1.schema.employerRemittances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id), (0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.tenantId, organizationId)))
            .limit(1);
        if (!remittance) {
            return res.status(404).json({
                success: false,
                error: 'Remittance not found',
            });
        }
        if (remittance.reconciliationStatus === 'reconciled') {
            return res.status(400).json({
                success: false,
                error: 'Remittance already reconciled',
            });
        }
        let transactionsToMatch = [];
        if (validatedData.transactionIds && validatedData.transactionIds.length > 0) {
            // Manual matching with specified transaction IDs
            transactionsToMatch = await db_1.db
                .select()
                .from(db_1.schema.duesTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.organizationId, organizationId), (0, drizzle_orm_1.sql) `${db_1.schema.duesTransactions.id} = ANY(${validatedData.transactionIds})`));
        }
        else if (validatedData.autoMatch) {
            // Auto-match: Find pending transactions for same period
            transactionsToMatch = await db_1.db
                .select()
                .from(db_1.schema.duesTransactions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.organizationId, organizationId), (0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.periodStart, remittance.remittancePeriodStart), (0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.periodEnd, remittance.remittancePeriodEnd)));
        }
        if (transactionsToMatch.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No matching transactions found',
            });
        }
        // Calculate matched total
        const matchedTotal = transactionsToMatch.reduce((sum, t) => sum + Number(t.totalAmount), 0);
        const expectedTotal = Number(remittance.totalAmount);
        const variance = expectedTotal - matchedTotal;
        // Update transactions - remittanceId doesn't exist in schema
        // Store remittance link in metadata or notes field
        await db_1.db
            .update(db_1.schema.duesTransactions)
            .set({
            paidDate: remittance.remittanceDate, // Already a string from date column
            notes: `Paid via remittance ${id}`,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.organizationId, organizationId), (0, drizzle_orm_1.sql) `${db_1.schema.duesTransactions.id} = ANY(${transactionsToMatch.map((t) => t.id)})`));
        // Update remittance status
        const newStatus = Math.abs(variance) < 0.01 ? 'reconciled' : 'variance_detected';
        const [updatedRemittance] = await db_1.db
            .update(db_1.schema.employerRemittances)
            .set({
            reconciliationStatus: newStatus,
            varianceAmount: variance.toString(),
            reconciliationDate: new Date().toISOString(),
            reconciledBy: userId,
            // Store match details in metadata
            metadata: {
                matchedTransactions: transactionsToMatch.length,
                matchedAmount: matchedTotal,
            },
        })
            .where((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id))
            .returning();
        res.json({
            success: true,
            data: {
                remittance: updatedRemittance,
                matchedTransactions: transactionsToMatch.length,
                matchedAmount: matchedTotal,
                expectedAmount: expectedTotal,
                variance,
                status: newStatus,
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
 * PUT /api/remittances/:id
 * Update remittance details
 */
router.put('/:id', async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        const { id } = req.params;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        const updateSchema = zod_1.z.object({
            notes: zod_1.z.string().optional(),
            referenceNumber: zod_1.z.string().optional(),
        });
        const validatedData = updateSchema.parse(req.body);
        const [updatedRemittance] = await db_1.db
            .update(db_1.schema.employerRemittances)
            .set({
            ...validatedData,
            // updatedAt is handled automatically by database trigger
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id), (0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.tenantId, organizationId)))
            .returning();
        if (!updatedRemittance) {
            return res.status(404).json({
                success: false,
                error: 'Remittance not found',
            });
        }
        res.json({
            success: true,
            data: updatedRemittance,
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
 * POST /api/remittances/upload
 * Upload and parse remittance file (CSV, Excel, XML)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }
        const file = req.file;
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        // Parse configuration from request body
        const parserConfig = req.body.config ? JSON.parse(req.body.config) : {};
        const parser = new financial_1.RemittanceParser(parserConfig);
        let parseResult;
        // Parse based on file type
        if (fileExtension === 'csv') {
            parseResult = await parser.parseCSV(file.buffer);
        }
        else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            parseResult = await parser.parseExcel(file.buffer);
        }
        else if (fileExtension === 'xml') {
            parseResult = await parser.parseXML(file.buffer);
        }
        else {
            return res.status(400).json({
                success: false,
                error: `Unsupported file type: ${fileExtension}. Supported types: csv, xlsx, xls, xml`,
            });
        }
        res.json({
            success: parseResult.success,
            data: {
                fileName: file.originalname,
                fileSize: file.size,
                parsedRecords: parseResult.records,
                summary: parseResult.summary,
                errors: parseResult.errors,
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
 * POST /api/remittances/:id/reconcile
 * Auto-reconcile remittance with transactions
 */
router.post('/:id/reconcile', async (req, res) => {
    try {
        const { organizationId: organizationIdFromUser, tenantId: legacyTenantId, userId, role } = req.user;
        const organizationId = organizationIdFromUser ?? legacyTenantId;
        const { id } = req.params;
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        // Fetch remittance
        const [remittance] = await db_1.db
            .select()
            .from(db_1.schema.employerRemittances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id), (0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.tenantId, organizationId)))
            .limit(1);
        if (!remittance) {
            return res.status(404).json({
                success: false,
                error: 'Remittance not found',
            });
        }
        // Fetch remittance details (parsed records should be stored in JSON field or separate table)
        // For now, assuming they're in req.body.records
        const remittanceRecords = req.body.records || [];
        if (remittanceRecords.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No remittance records provided. Upload and parse file first.',
            });
        }
        // Fetch existing transactions for the billing period
        const transactions = await db_1.db
            .select()
            .from(db_1.schema.duesTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.organizationId, organizationId), (0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.transactionType, 'charge'), (0, drizzle_orm_1.sql) `${db_1.schema.duesTransactions.periodStart} >= ${remittance.remittancePeriodStart}`, (0, drizzle_orm_1.sql) `${db_1.schema.duesTransactions.periodEnd} <= ${remittance.remittancePeriodEnd}`));
        // Run reconciliation
        const reconciliationEngine = new financial_1.ReconciliationEngine();
        const reconciliationResult = await reconciliationEngine.reconcile({
            remittanceId: id,
            remittanceRecords,
            existingTransactions: transactions.map((t) => ({
                id: t.id,
                memberId: t.memberId,
                amount: Number(t.amount),
                periodStart: t.periodStart,
                periodEnd: t.periodEnd,
            })),
            tenantId: organizationId,
        });
        // If auto-apply is enabled, update matched transactions
        if (req.body.autoApply !== false && reconciliationResult.success) {
            for (const match of reconciliationResult.matches) {
                await db_1.db
                    .update(db_1.schema.duesTransactions)
                    .set({
                    paidDate: remittance.remittanceDate, // Already a string
                    notes: `Paid via remittance ${id}`,
                })
                    .where((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.id, match.transactionId));
            }
            // Update remittance status
            await db_1.db
                .update(db_1.schema.employerRemittances)
                .set({
                reconciliationStatus: reconciliationResult.variances.length === 0 ? 'completed' : 'needs_review',
                varianceAmount: reconciliationResult.summary.totalVariance.toString(),
                metadata: {
                    matchedCount: reconciliationResult.summary.matchedCount,
                    totalVariance: reconciliationResult.summary.totalVariance,
                },
            })
                .where((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id));
        }
        // Generate report
        const report = reconciliationEngine.generateReport(reconciliationResult);
        res.json({
            success: true,
            data: {
                reconciliation: reconciliationResult,
                report,
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
 * GET /api/remittances/:id/report
 * Generate reconciliation report
 */
router.get('/:id/report', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const { format = 'json' } = req.query;
        // Fetch remittance
        const [remittance] = await db_1.db
            .select()
            .from(db_1.schema.employerRemittances)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.id, id), (0, drizzle_orm_1.eq)(db_1.schema.employerRemittances.tenantId, organizationId)))
            .limit(1);
        if (!remittance) {
            return res.status(404).json({
                success: false,
                error: 'Remittance not found',
            });
        }
        // Fetch matched transactions
        // Fetch matched transactions - remittanceId doesn't exist
        // Would need to query by notes or metadata
        const transactions = [];
        const reportData = {
            remittance: {
                id: remittance.id,
                employerId: remittance.employerId,
                totalAmount: remittance.totalAmount,
                memberCount: remittance.memberCount,
                remittanceDate: remittance.remittanceDate,
                reconciliationStatus: remittance.reconciliationStatus,
                varianceAmount: remittance.varianceAmount,
            },
            transactions: transactions.map((t) => ({
                id: t.id,
                memberId: t.memberId,
                amount: t.amount,
                status: t.status,
                paidDate: t.paidDate,
            })),
            summary: {
                matchedCount: transactions.length,
                totalReconciled: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
                variance: remittance.varianceAmount,
            },
        };
        if (format === 'text') {
            // Generate text report
            const lines = [
                '=== REMITTANCE REPORT ===',
                '',
                `Remittance ID: ${remittance.id}`,
                `Remittance Date: ${remittance.remittanceDate}`,
                `Total Amount: $${Number(remittance.totalAmount).toFixed(2)}`,
                `Member Count: ${remittance.memberCount}`,
                `Status: ${remittance.reconciliationStatus || remittance.status}`,
                '',
                '--- Matched Transactions ---',
                ...transactions.map((t) => `${t.memberId}: $${Number(t.amount).toFixed(2)} (${t.paidDate || 'N/A'})`),
                '',
                `Total Matched: ${transactions.length}`,
                `Total Reconciled: $${reportData.summary.totalReconciled.toFixed(2)}`,
                `Variance: $${Number(remittance.varianceAmount || 0).toFixed(2)}`,
                '',
                '=== END OF REPORT ===',
            ];
            res.setHeader('Content-Type', 'text/plain');
            res.send(lines.join('\n'));
        }
        else {
            res.json({
                success: true,
                data: reportData,
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=remittances.js.map