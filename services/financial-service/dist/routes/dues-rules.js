"use strict";
/**
 * Dues Rules Routes
 * Endpoints for managing dues calculation rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
// TODO: Fix logger import path
// import { logger } from '@/lib/logger';
const logger = console;
const router = (0, express_1.Router)();
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const createDuesRuleSchema = zod_1.z.object({
    ruleName: zod_1.z.string().min(1).max(255),
    ruleCode: zod_1.z.string().min(1).max(50),
    description: zod_1.z.string().optional(),
    calculationType: zod_1.z.enum(['percentage', 'flat_rate', 'hourly', 'tiered', 'formula']),
    // Calculation parameters
    percentageRate: zod_1.z.coerce.number().positive().optional(),
    baseField: zod_1.z.string().optional(),
    flatAmount: zod_1.z.coerce.number().positive().optional(),
    hourlyRate: zod_1.z.coerce.number().positive().optional(),
    tierStructure: zod_1.z.any().optional(), // JSONB field
    customFormula: zod_1.z.string().max(500).optional(),
    billingFrequency: zod_1.z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']),
    dueDayOfMonth: zod_1.z.coerce.number().int().min(1).max(31).optional(),
    hoursPerPeriod: zod_1.z.coerce.number().positive().optional(),
    // Applicability
    applicableCategories: zod_1.z.any().optional(), // JSONB field
    applicableStatuses: zod_1.z.any().optional(), // JSONB field
    applicableLocals: zod_1.z.any().optional(), // JSONB field
    applicableDepartments: zod_1.z.any().optional(), // JSONB field
    // Effective dates
    effectiveDate: zod_1.z.coerce.date(),
    endDate: zod_1.z.coerce.date().optional(),
    // Metadata
    isActive: zod_1.z.boolean().default(true),
});
// ============================================================================
// ROUTES
// ============================================================================
/**
 * GET /api/dues/rules
 * List all dues rules for the tenant
 */
router.get('/', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { active, category, status } = req.query;
        // Build query conditions
        const conditions = [(0, drizzle_orm_1.eq)(db_1.schema.duesRules.organizationId, organizationId)];
        if (active !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.duesRules.isActive, active === 'true'));
        }
        const rules = await db_1.db
            .select()
            .from(db_1.schema.duesRules)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.schema.duesRules.createdAt));
        res.json({
            success: true,
            data: rules,
            total: rules.length,
        });
    }
    catch (error) {
        logger.error('Error fetching dues rules', { error });
        res.status(500).json({ success: false, error: 'Failed to fetch dues rules' });
    }
});
/**
 * GET /api/dues/rules/:id
 * Get a specific dues rule by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const [rule] = await db_1.db
            .select()
            .from(db_1.schema.duesRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesRules.id, id), (0, drizzle_orm_1.eq)(db_1.schema.duesRules.organizationId, organizationId)))
            .limit(1);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Dues rule not found' });
        }
        res.json({ success: true, data: rule });
    }
    catch (error) {
        logger.error('Error fetching dues rule', { error });
        res.status(500).json({ success: false, error: 'Failed to fetch dues rule' });
    }
});
/**
 * POST /api/dues/rules
 * Create a new dues rule
 */
router.post('/', async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        // Validate input
        const validatedData = createDuesRuleSchema.parse(req.body);
        const [newRule] = await db_1.db
            .insert(db_1.schema.duesRules)
            .values({
            ...validatedData,
            organizationId: organizationId,
            createdBy: userId,
        })
            .returning();
        res.status(201).json({ success: true, data: newRule });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        }
        logger.error('Error creating dues rule', { error });
        res.status(500).json({ success: false, error: 'Failed to create dues rule' });
    }
});
/**
 * PUT /api/dues/rules/:id
 * Update an existing dues rule
 */
router.put('/:id', async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        const { id } = req.params;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        // Validate input
        const validatedData = createDuesRuleSchema.partial().parse(req.body);
        // Convert numeric fields to strings for database
        const updateData = { ...validatedData };
        ['percentageRate', 'flatAmount', 'hourlyRate', 'minimumAmount', 'maximumAmount'].forEach(field => {
            if (updateData[field] !== undefined && typeof updateData[field] === 'number') {
                updateData[field] = updateData[field].toString();
            }
        });
        const [updatedRule] = await db_1.db
            .update(db_1.schema.duesRules)
            .set(updateData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesRules.id, id), (0, drizzle_orm_1.eq)(db_1.schema.duesRules.organizationId, organizationId)))
            .returning();
        if (!updatedRule) {
            return res.status(404).json({ success: false, error: 'Dues rule not found' });
        }
        res.json({ success: true, data: updatedRule });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        }
        logger.error('Error updating dues rule', { error });
        res.status(500).json({ success: false, error: 'Failed to update dues rule' });
    }
});
/**
 * DELETE /api/dues/rules/:id
 * Soft delete a dues rule (set isActive = false)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { organizationId, role } = req.user;
        const { id } = req.params;
        // Check permissions (admin only)
        if (role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        const [deletedRule] = await db_1.db
            .update(db_1.schema.duesRules)
            .set({
            isActive: false,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesRules.id, id), (0, drizzle_orm_1.eq)(db_1.schema.duesRules.organizationId, organizationId)))
            .returning();
        if (!deletedRule) {
            return res.status(404).json({ success: false, error: 'Dues rule not found' });
        }
        res.json({ success: true, message: 'Dues rule deleted successfully' });
    }
    catch (error) {
        logger.error('Error deleting dues rule', { error });
        res.status(500).json({ success: false, error: 'Failed to delete dues rule' });
    }
});
/**
 * POST /api/dues/rules/:id/duplicate
 * Duplicate an existing dues rule with a new code and name
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const { organizationId, userId, role } = req.user;
        const { id } = req.params;
        const { newCode, newName } = req.body;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        if (!newCode || !newName) {
            return res.status(400).json({
                success: false,
                error: 'newCode and newName are required'
            });
        }
        // Fetch original rule
        const [originalRule] = await db_1.db
            .select()
            .from(db_1.schema.duesRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesRules.id, id), (0, drizzle_orm_1.eq)(db_1.schema.duesRules.organizationId, organizationId)))
            .limit(1);
        if (!originalRule) {
            return res.status(404).json({ success: false, error: 'Original dues rule not found' });
        }
        // Create duplicate with new code and name
        const { id: _, createdAt, updatedAt, createdBy, ...ruleData } = originalRule;
        const [duplicatedRule] = await db_1.db
            .insert(db_1.schema.duesRules)
            .values({
            ...ruleData,
            ruleCode: newCode,
            ruleName: newName,
            organizationId: organizationId,
            createdBy: userId,
        })
            .returning();
        res.status(201).json({ success: true, data: duplicatedRule });
    }
    catch (error) {
        logger.error('Error duplicating dues rule', { error });
        res.status(500).json({ success: false, error: 'Failed to duplicate dues rule' });
    }
});
exports.default = router;
//# sourceMappingURL=dues-rules.js.map