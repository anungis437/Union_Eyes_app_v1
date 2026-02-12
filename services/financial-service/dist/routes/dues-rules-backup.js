"use strict";
/**
 * Dues Rules Routes
 * Endpoints for managing dues calculation rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_1 = require("../db/index");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
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
    percentageRate: zod_1.z.number().positive().optional(),
    baseField: zod_1.z.string().optional(),
    flatAmount: zod_1.z.number().positive().optional(),
    hourlyRate: zod_1.z.number().positive().optional(),
    hoursPerPeriod: zod_1.z.number().int().positive().optional(),
    tierStructure: zod_1.z.array(zod_1.z.object({
        min: zod_1.z.number(),
        max: zod_1.z.number().nullable(),
        rate: zod_1.z.number().positive(),
    })).optional(),
    customFormula: zod_1.z.string().max(500).optional(),
    billingFrequency: zod_1.z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']),
    // Additional fees
    copeContribution: zod_1.z.number().default(0),
    pacContribution: zod_1.z.number().default(0),
    initiationFee: zod_1.z.number().default(0),
    strikeFundContribution: zod_1.z.number().default(0),
    // Late fees
    gracePeriodDays: zod_1.z.number().int().default(30),
    lateFeeType: zod_1.z.enum(['percentage', 'flat_amount', 'none']).default('none'),
    lateFeeAmount: zod_1.z.number().optional(),
    lateFeePercentage: zod_1.z.number().optional(),
    // Applicability
    memberCategory: zod_1.z.string().optional(),
    employmentStatus: zod_1.z.string().optional(),
    localNumber: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    effectiveFrom: zod_1.z.string().transform(str => new Date(str)),
    effectiveTo: zod_1.z.string().transform(str => new Date(str)).optional(),
});
// ============================================================================
// ROUTES
// ============================================================================
/**
 * GET /api/dues/rules
 * List all dues rules for tenant
 */
router.get('/', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { active } = req.query;
        // Build where conditions
        const conditions = [(0, drizzle_orm_1.eq)(schema_1.duesRules.organizationId, organizationId)];
        if (active === 'true') {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.duesRules.isActive, true));
        }
        const rules = await index_1.db
            .select()
            .from(schema_1.duesRules)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.duesRules.createdAt));
        res.json({
            success: true,
            data: rules,
            total: rules.length,
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
 * GET /api/dues/rules/:id
 * Get specific dues rule
 */
router.get('/:id', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { id } = req.params;
        const rules = await index_1.db
            .select()
            .from(schema_1.duesRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesRules.id, id), (0, drizzle_orm_1.eq)(schema_1.duesRules.organizationId, organizationId)))
            .limit(1);
        const rule = rules[0];
        if (!rule) {
            return res.status(404).json({
                success: false,
                error: 'Dues rule not found',
            });
        }
        res.json({
            success: true,
            data: rule,
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
 * POST /api/dues/rules
 * Create new dues rule
 */
router.post('/', async (req, res) => {
    try {
        const { organizationId, role } = req.user;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to create dues rules',
            });
        }
        // Validate input
        const validatedData = createDuesRuleSchema.parse(req.body);
        // Map validation schema to database schema
        const dbData = {
            organizationId: organizationId,
            ruleName: validatedData.ruleName,
            ruleCode: validatedData.ruleCode,
            description: validatedData.description,
            calculationType: validatedData.calculationType,
            percentageRate: validatedData.percentageRate?.toString(),
            baseField: validatedData.baseField,
            flatAmount: validatedData.flatAmount?.toString(),
            hourlyRate: validatedData.hourlyRate?.toString(),
            hoursPerPeriod: validatedData.hoursPerPeriod,
            tierStructure: validatedData.tierStructure,
            customFormula: validatedData.customFormula,
            billingFrequency: validatedData.billingFrequency,
            effectiveDate: validatedData.effectiveFrom.toISOString().split('T')[0],
            endDate: validatedData.effectiveTo?.toISOString().split('T')[0],
            createdBy: req.user.id,
        };
        const newRule = await index_1.db.insert(schema_1.duesRules).values(dbData).returning();
        res.status(201).json({
            success: true,
            data: newRule[0],
            message: 'Dues rule created successfully',
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
 * PUT /api/dues/rules/:id
 * Update existing dues rule
 */
router.put('/:id', async (req, res) => {
    try {
        const { organizationId, role } = req.user;
        const { id } = req.params;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to update dues rules',
            });
        }
        // Validate input
        const validatedData = createDuesRuleSchema.partial().parse(req.body);
        // Map validation schema to database schema for update
        const dbData = {};
        if (validatedData.ruleName)
            dbData.ruleName = validatedData.ruleName;
        if (validatedData.ruleCode)
            dbData.ruleCode = validatedData.ruleCode;
        if (validatedData.description !== undefined)
            dbData.description = validatedData.description;
        if (validatedData.calculationType)
            dbData.calculationType = validatedData.calculationType;
        if (validatedData.percentageRate !== undefined)
            dbData.percentageRate = validatedData.percentageRate?.toString();
        if (validatedData.baseField !== undefined)
            dbData.baseField = validatedData.baseField;
        if (validatedData.flatAmount !== undefined)
            dbData.flatAmount = validatedData.flatAmount?.toString();
        if (validatedData.hourlyRate !== undefined)
            dbData.hourlyRate = validatedData.hourlyRate?.toString();
        if (validatedData.hoursPerPeriod !== undefined)
            dbData.hoursPerPeriod = validatedData.hoursPerPeriod;
        if (validatedData.tierStructure !== undefined)
            dbData.tierStructure = validatedData.tierStructure;
        if (validatedData.customFormula !== undefined)
            dbData.customFormula = validatedData.customFormula;
        if (validatedData.billingFrequency)
            dbData.billingFrequency = validatedData.billingFrequency;
        if (validatedData.effectiveFrom)
            dbData.effectiveDate = validatedData.effectiveFrom.toISOString().split('T')[0];
        if (validatedData.effectiveTo)
            dbData.endDate = validatedData.effectiveTo.toISOString().split('T')[0];
        dbData.updatedAt = new Date().toISOString();
        const updatedRule = await index_1.db
            .update(schema_1.duesRules)
            .set(dbData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesRules.id, id), (0, drizzle_orm_1.eq)(schema_1.duesRules.organizationId, organizationId)))
            .returning();
        if (updatedRule.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Dues rule not found',
            });
        }
        res.json({
            success: true,
            data: updatedRule[0],
            message: 'Dues rule updated successfully',
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
 * DELETE /api/dues/rules/:id
 * Soft delete dues rule (set isActive = false)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { organizationId, role } = req.user;
        const { id } = req.params;
        // Check permissions - only admin can delete
        if (role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only administrators can delete dues rules',
            });
        }
        const result = await index_1.db
            .update(schema_1.duesRules)
            .set({
            isActive: false,
            updatedAt: new Date().toISOString(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesRules.id, id), (0, drizzle_orm_1.eq)(schema_1.duesRules.organizationId, organizationId)))
            .returning();
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Dues rule not found',
            });
        }
        res.json({
            success: true,
            message: 'Dues rule deactivated successfully',
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
 * POST /api/dues/rules/:id/duplicate
 * Duplicate an existing dues rule
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const { organizationId, role } = req.user;
        const { id } = req.params;
        const { newRuleCode, newRuleName } = req.body;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        // Fetch existing rule
        const existingRules = await index_1.db
            .select()
            .from(schema_1.duesRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.duesRules.id, id), (0, drizzle_orm_1.eq)(schema_1.duesRules.organizationId, organizationId)))
            .limit(1);
        const existingRule = existingRules[0];
        if (!existingRule) {
            return res.status(404).json({
                success: false,
                error: 'Dues rule not found',
            });
        }
        // Create new rule with modified code/name
        const duplicatedRule = await index_1.db.insert(schema_1.duesRules).values({
            organizationId,
            ruleName: newRuleName || `${existingRule.ruleName} (Copy)`,
            ruleCode: newRuleCode || `${existingRule.ruleCode}_COPY`,
            description: existingRule.description,
            calculationType: existingRule.calculationType,
            percentageRate: existingRule.percentageRate,
            baseField: existingRule.baseField,
            flatAmount: existingRule.flatAmount,
            hourlyRate: existingRule.hourlyRate,
            hoursPerPeriod: existingRule.hoursPerPeriod,
            tierStructure: existingRule.tierStructure,
            customFormula: existingRule.customFormula,
            billingFrequency: existingRule.billingFrequency,
            effectiveDate: existingRule.effectiveDate,
            endDate: existingRule.endDate,
            createdBy: req.user.id,
        }).returning();
        res.status(201).json({
            success: true,
            data: duplicatedRule[0],
            message: 'Dues rule duplicated successfully',
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
//# sourceMappingURL=dues-rules-backup.js.map