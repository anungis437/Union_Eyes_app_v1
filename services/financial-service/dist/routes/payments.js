"use strict";
/**
 * Payment Processing Routes
 *
 * API endpoints for:
 * - Dues payment processing (Stripe)
 * - Stipend disbursement payouts (ACH)
 * - Public donations (Stripe)
 * - Payment webhooks
 * - Payment analytics
 *
 * Week 7-8 Implementation
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
const PaymentService = __importStar(require("../services/payment-processing"));
// TODO: Fix logger import path
// import { logger } from '@/lib/logger';
const logger = console;
const router = (0, express_1.Router)();
// Validation schemas
const CreateDuesPaymentSchema = zod_1.z.object({
    memberId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().min(0.50).max(100000),
    currency: zod_1.z.string().length(3).default('usd'),
    paymentMethod: zod_1.z.enum(['card', 'bank_account', 'us_bank_account']),
    description: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string()).optional(),
});
const ConfirmDuesPaymentSchema = zod_1.z.object({
    paymentIntentId: zod_1.z.string(),
    transactionId: zod_1.z.string().uuid(),
});
const CreateStipendPayoutSchema = zod_1.z.object({
    disbursementId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().min(1).max(100000),
    recipientBankAccount: zod_1.z.object({
        accountNumber: zod_1.z.string(),
        routingNumber: zod_1.z.string(),
        accountHolderName: zod_1.z.string(),
        accountType: zod_1.z.enum(['checking', 'savings']),
    }),
    description: zod_1.z.string().optional(),
});
const BatchStipendPayoutSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    disbursementIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
const CreateDonationSchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().min(1).max(100000),
    currency: zod_1.z.string().length(3).default('usd'),
    donorEmail: zod_1.z.string().email().optional(),
    donorName: zod_1.z.string().optional(),
    isAnonymous: zod_1.z.boolean().default(false),
    message: zod_1.z.string().max(500).optional(),
    paymentMethod: zod_1.z.enum(['card', 'bank_account', 'us_bank_account']).default('card'),
});
const ConfirmDonationSchema = zod_1.z.object({
    paymentIntentId: zod_1.z.string(),
});
const PaymentSummaryQuerySchema = zod_1.z.object({
    strikeFundId: zod_1.z.string().uuid(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
/**
 * DUES PAYMENT ENDPOINTS
 */
/**
 * POST /api/payments/dues/intent
 * Create Stripe payment intent for dues payment
 */
router.post('/dues/intent', async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const validatedData = CreateDuesPaymentSchema.parse(req.body);
        const paymentIntent = await PaymentService.createDuesPaymentIntent({
            organizationId,
            memberId: validatedData.memberId,
            amount: validatedData.amount,
            currency: validatedData.currency,
            paymentMethod: validatedData.paymentMethod,
            description: validatedData.description,
            metadata: validatedData.metadata,
        });
        res.json({
            success: true,
            paymentIntent,
        });
    }
    catch (error) {
        logger.error('Error creating dues payment intent', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create payment intent',
        });
    }
});
/**
 * POST /api/payments/dues/confirm
 * Confirm dues payment after Stripe processing
 */
router.post('/dues/confirm', async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const validatedData = ConfirmDuesPaymentSchema.parse(req.body);
        await PaymentService.confirmDuesPayment({
            organizationId,
            paymentIntentId: validatedData.paymentIntentId,
            transactionId: validatedData.transactionId,
        });
        res.json({
            success: true,
            message: 'Payment confirmed successfully',
        });
    }
    catch (error) {
        logger.error('Error confirming dues payment', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to confirm payment',
        });
    }
});
/**
 * STIPEND PAYOUT ENDPOINTS
 */
/**
 * POST /api/payments/stipends/payout
 * Create ACH payout for stipend disbursement
 */
router.post('/stipends/payout', async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const validatedData = CreateStipendPayoutSchema.parse(req.body);
        const payout = await PaymentService.createStipendPayout({
            organizationId,
            disbursementId: validatedData.disbursementId,
            amount: validatedData.amount,
            recipientBankAccount: validatedData.recipientBankAccount,
            description: validatedData.description,
        });
        res.json({
            success: true,
            payout,
        });
    }
    catch (error) {
        logger.error('Error creating stipend payout', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create payout',
        });
    }
});
/**
 * POST /api/payments/stipends/payout/batch
 * Process multiple stipend payouts in batch
 */
router.post('/stipends/payout/batch', async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const validatedData = BatchStipendPayoutSchema.parse(req.body);
        const results = await PaymentService.batchProcessStipendPayouts({
            organizationId,
            strikeFundId: validatedData.strikeFundId,
            disbursementIds: validatedData.disbursementIds,
        });
        res.json({
            success: true,
            results,
        });
    }
    catch (error) {
        logger.error('Error processing batch payouts', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process batch payouts',
        });
    }
});
/**
 * DONATION ENDPOINTS
 */
/**
 * POST /api/payments/donations/intent
 * Create Stripe payment intent for public donation
 */
router.post('/donations/intent', async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || req.body.organizationId; // Allow public access
        const validatedData = CreateDonationSchema.parse(req.body);
        const paymentIntent = await PaymentService.createDonationPaymentIntent({
            organizationId,
            strikeFundId: validatedData.strikeFundId,
            amount: validatedData.amount,
            currency: validatedData.currency,
            donorEmail: validatedData.donorEmail,
            donorName: validatedData.donorName,
            isAnonymous: validatedData.isAnonymous,
            message: validatedData.message,
            paymentMethod: validatedData.paymentMethod,
        });
        res.json({
            success: true,
            paymentIntent,
        });
    }
    catch (error) {
        logger.error('Error creating donation payment intent', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create donation',
        });
    }
});
/**
 * POST /api/payments/donations/confirm
 * Confirm donation payment and create donation record
 */
router.post('/donations/confirm', async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || req.body.organizationId; // Allow public access
        const validatedData = ConfirmDonationSchema.parse(req.body);
        const donationId = await PaymentService.confirmDonationPayment({
            organizationId,
            paymentIntentId: validatedData.paymentIntentId,
        });
        res.json({
            success: true,
            donationId,
            message: 'Thank you for your donation!',
        });
    }
    catch (error) {
        logger.error('Error confirming donation', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to confirm donation',
        });
    }
});
/**
 * WEBHOOK ENDPOINTS
 */
/**
 * POST /api/payments/webhook/stripe
 * Handle Stripe webhook events
 */
router.post('/webhook/stripe', async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        await PaymentService.processStripeWebhook(req.body, signature, webhookSecret);
        res.json({ received: true });
    }
    catch (error) {
        logger.error('Error processing Stripe webhook', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Webhook processing failed',
        });
    }
});
/**
 * ANALYTICS ENDPOINTS
 */
/**
 * GET /api/payments/summary
 * Get payment summary and analytics
 */
router.get('/summary', async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const { strikeFundId, startDate, endDate } = PaymentSummaryQuerySchema.parse(req.query);
        const summary = await PaymentService.getPaymentSummary(organizationId, strikeFundId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        res.json({
            success: true,
            summary,
        });
    }
    catch (error) {
        logger.error('Error getting payment summary', { error });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get payment summary',
        });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map