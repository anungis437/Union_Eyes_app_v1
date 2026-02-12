"use strict";
/**
 * Stipend Management Routes
 * Week 6: API endpoints for stipend calculations and disbursements
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const StipendService = __importStar(require("../services/stipend-calculation"));
const router = (0, express_1.Router)();
// Validation schemas
const calculateStipendsSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    weekStartDate: zod_1.z.string().datetime(),
    weekEndDate: zod_1.z.string().datetime(),
    minimumHours: zod_1.z.number().positive().optional(),
    hourlyRate: zod_1.z.number().positive().optional(),
});
const createDisbursementSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    memberId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    weekStartDate: zod_1.z.string().datetime(),
    weekEndDate: zod_1.z.string().datetime(),
    paymentMethod: zod_1.z.enum(['direct_deposit', 'check', 'cash', 'paypal']),
    notes: zod_1.z.string().optional(),
});
const approveDisbursementSchema = zod_1.z.object({
    disbursementId: zod_1.z.string().uuid(),
    approvalNotes: zod_1.z.string().optional(),
});
const markPaidSchema = zod_1.z.object({
    disbursementId: zod_1.z.string().uuid(),
    transactionId: zod_1.z.string().min(1),
});
const batchCreateSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    weekStartDate: zod_1.z.string().datetime(),
    weekEndDate: zod_1.z.string().datetime(),
    minimumHours: zod_1.z.number().positive().optional(),
    hourlyRate: zod_1.z.number().positive().optional(),
    paymentMethod: zod_1.z.enum(['direct_deposit', 'check', 'cash', 'paypal']),
});
/**
 * POST /api/stipends/calculate
 * Calculate weekly stipends for all members
 */
router.post('/calculate', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const validatedData = calculateStipendsSchema.parse(req.body);
        const eligibility = await StipendService.calculateWeeklyStipends({
            organizationId,
            strikeFundId: validatedData.strikeFundId,
            weekStartDate: new Date(validatedData.weekStartDate),
            weekEndDate: new Date(validatedData.weekEndDate),
            minimumHours: validatedData.minimumHours,
            hourlyRate: validatedData.hourlyRate,
        });
        res.json({
            success: true,
            eligibility,
            summary: {
                totalMembers: eligibility.length,
                eligible: eligibility.filter(e => e.eligible).length,
                totalStipendAmount: eligibility
                    .filter(e => e.eligible)
                    .reduce((sum, e) => sum + e.stipendAmount, 0),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to calculate stipends',
        });
    }
});
/**
 * POST /api/stipends/disbursements
 * Create a disbursement record
 */
router.post('/disbursements', async (req, res) => {
    try {
        const { organizationId, id: userId } = req.user;
        const validatedData = createDisbursementSchema.parse(req.body);
        const result = await StipendService.createDisbursement({
            organizationId,
            strikeFundId: validatedData.strikeFundId,
            memberId: validatedData.memberId,
            amount: validatedData.amount,
            weekStartDate: new Date(validatedData.weekStartDate),
            weekEndDate: new Date(validatedData.weekEndDate),
            approvedBy: userId,
            paymentMethod: validatedData.paymentMethod,
            notes: validatedData.notes,
        });
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create disbursement',
        });
    }
});
/**
 * POST /api/stipends/disbursements/batch
 * Batch create disbursements for all eligible members
 */
router.post('/disbursements/batch', async (req, res) => {
    try {
        const { organizationId, id: userId } = req.user;
        const validatedData = batchCreateSchema.parse(req.body);
        const result = await StipendService.batchCreateDisbursements({
            organizationId,
            strikeFundId: validatedData.strikeFundId,
            weekStartDate: new Date(validatedData.weekStartDate),
            weekEndDate: new Date(validatedData.weekEndDate),
            minimumHours: validatedData.minimumHours,
            hourlyRate: validatedData.hourlyRate,
            approvedBy: userId,
            paymentMethod: validatedData.paymentMethod,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to batch create disbursements',
        });
    }
});
/**
 * GET /api/stipends/disbursements/pending/:strikeFundId
 * Get pending disbursements for approval
 */
router.get('/disbursements/pending/:strikeFundId', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { strikeFundId } = req.params;
        const disbursements = await StipendService.getPendingDisbursements(organizationId, strikeFundId);
        res.json({
            success: true,
            disbursements,
            count: disbursements.length,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get pending disbursements',
        });
    }
});
/**
 * GET /api/stipends/disbursements/member/:memberId
 * Get disbursement history for a member
 */
router.get('/disbursements/member/:memberId', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { memberId } = req.params;
        const { strikeFundId } = req.query;
        const disbursements = await StipendService.getMemberDisbursements(organizationId, memberId, strikeFundId);
        res.json({
            success: true,
            disbursements,
            count: disbursements.length,
            totalAmount: disbursements.reduce((sum, d) => sum + d.amount, 0),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get member disbursements',
        });
    }
});
/**
 * POST /api/stipends/disbursements/:disbursementId/approve
 * Approve a pending disbursement
 */
router.post('/disbursements/:disbursementId/approve', async (req, res) => {
    try {
        const { organizationId, id: userId } = req.user;
        const { disbursementId } = req.params;
        const { approvalNotes } = approveDisbursementSchema.parse({
            disbursementId,
            ...req.body
        });
        const result = await StipendService.approveDisbursement(organizationId, {
            disbursementId,
            approvedBy: userId,
            approvalNotes,
        });
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to approve disbursement',
        });
    }
});
/**
 * POST /api/stipends/disbursements/:disbursementId/paid
 * Mark disbursement as paid
 */
router.post('/disbursements/:disbursementId/paid', async (req, res) => {
    try {
        const { organizationId, id: userId } = req.user;
        const { disbursementId } = req.params;
        const { transactionId } = markPaidSchema.parse({ disbursementId, ...req.body });
        const result = await StipendService.markDisbursementPaid(organizationId, disbursementId, transactionId, userId);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to mark disbursement as paid',
        });
    }
});
/**
 * GET /api/stipends/summary/:strikeFundId
 * Get disbursement summary for a strike fund
 */
router.get('/summary/:strikeFundId', async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { strikeFundId } = req.params;
        const summary = await StipendService.getStrikeFundDisbursementSummary(organizationId, strikeFundId);
        res.json({
            success: true,
            summary,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get disbursement summary',
        });
    }
});
exports.default = router;
//# sourceMappingURL=stipends.js.map