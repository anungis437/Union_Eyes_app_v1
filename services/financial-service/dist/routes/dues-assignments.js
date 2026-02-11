"use strict";
/**
 * Dues Assignments Routes
 * Endpoints for assigning dues rules to members
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const createAssignmentSchema = zod_1.z.object({
    memberId: zod_1.z.string().uuid(),
    ruleId: zod_1.z.string().uuid(),
    effectiveDate: zod_1.z.coerce.date(),
    endDate: zod_1.z.coerce.date().optional(),
    overrideAmount: zod_1.z.coerce.number().positive().optional(),
    overrideReason: zod_1.z.string().max(500).optional(),
});
// ============================================================================
// ROUTES
// ============================================================================
/**
 * GET /api/dues/assignments
 * List all dues assignments
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { memberId, active } = req.query;
        const conditions = [(0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.tenantId, tenantId)];
        if (memberId) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.memberId, memberId));
        }
        if (active === 'true') {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.isActive, true));
            conditions.push((0, drizzle_orm_1.isNull)(db_1.schema.memberDuesAssignments.endDate));
        }
        const assignments = await db_1.db
            .select({
            assignment: db_1.schema.memberDuesAssignments,
            rule: db_1.schema.duesRules,
        })
            .from(db_1.schema.memberDuesAssignments)
            .leftJoin(db_1.schema.duesRules, (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.ruleId, db_1.schema.duesRules.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.schema.memberDuesAssignments.createdAt));
        res.json({
            success: true,
            data: assignments,
            total: assignments.length,
        });
    }
    catch (error) {
res.status(500).json({ success: false, error: 'Failed to fetch dues assignments' });
    }
});
/**
 * GET /api/dues/assignments/:id
 * Get a specific dues assignment by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const [assignment] = await db_1.db
            .select({
            assignment: db_1.schema.memberDuesAssignments,
            rule: db_1.schema.duesRules,
        })
            .from(db_1.schema.memberDuesAssignments)
            .leftJoin(db_1.schema.duesRules, (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.ruleId, db_1.schema.duesRules.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.id, id), (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.tenantId, tenantId)))
            .limit(1);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        res.json({ success: true, data: assignment });
    }
    catch (error) {
res.status(500).json({ success: false, error: 'Failed to fetch dues assignment' });
    }
});
/**
 * POST /api/dues/assignments
 * Create a new dues assignment
 */
router.post('/', async (req, res) => {
    try {
        const { tenantId, userId, role } = req.user;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        // Validate input
        const validatedData = createAssignmentSchema.parse(req.body);
        // Verify the dues rule exists and belongs to the tenant
        const [rule] = await db_1.db
            .select()
            .from(db_1.schema.duesRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.duesRules.id, validatedData.ruleId), (0, drizzle_orm_1.eq)(db_1.schema.duesRules.tenantId, tenantId)))
            .limit(1);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Dues rule not found' });
        }
        // Create assignment
        const [newAssignment] = await db_1.db
            .insert(db_1.schema.memberDuesAssignments)
            .values({
            ...validatedData,
            tenantId,
        })
            .returning();
        res.status(201).json({ success: true, data: newAssignment });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        }
res.status(500).json({ success: false, error: 'Failed to create dues assignment' });
    }
});
/**
 * PUT /api/dues/assignments/:id
 * Update an existing dues assignment
 */
router.put('/:id', async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { id } = req.params;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        // Validate input
        const validatedData = createAssignmentSchema.partial().parse(req.body);
        const updateData = { ...validatedData };
        // Convert Date objects to strings
        if (updateData.effectiveDate instanceof Date) {
            updateData.effectiveDate = updateData.effectiveDate.toISOString().split('T')[0];
        }
        if (updateData.endDate instanceof Date) {
            updateData.endDate = updateData.endDate.toISOString().split('T')[0];
        }
        if (updateData.overrideAmount !== undefined) {
            updateData.overrideAmount = updateData.overrideAmount.toString();
        }
        const [updatedAssignment] = await db_1.db
            .update(db_1.schema.memberDuesAssignments)
            .set(updateData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.id, id), (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.tenantId, tenantId)))
            .returning();
        if (!updatedAssignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        res.json({ success: true, data: updatedAssignment });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
        }
res.status(500).json({ success: false, error: 'Failed to update dues assignment' });
    }
});
/**
 * DELETE /api/dues/assignments/:id
 * End a dues assignment (set effectiveTo to current date)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { id } = req.params;
        // Check permissions
        if (!['admin', 'financial_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        const [deletedAssignment] = await db_1.db
            .update(db_1.schema.memberDuesAssignments)
            .set({
            isActive: false,
            endDate: new Date().toISOString().split('T')[0],
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.id, id), (0, drizzle_orm_1.eq)(db_1.schema.memberDuesAssignments.tenantId, tenantId)))
            .returning();
        if (!deletedAssignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        res.json({ success: true, message: 'Assignment ended successfully' });
    }
    catch (error) {
res.status(500).json({ success: false, error: 'Failed to delete dues assignment' });
    }
});
exports.default = router;
//# sourceMappingURL=dues-assignments.js.map