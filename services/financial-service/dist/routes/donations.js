"use strict";
/**
 * Public Donations Routes
 * Public-facing endpoints for strike fund donations with Stripe integration
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const zod_1 = require("zod");
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
// TODO: Fix logger import path
// import { logger } from '@/lib/logger';
const logger = console;
const router = (0, express_1.Router)();
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
});
// Validation schemas
const createDonationSchema = zod_1.z.object({
    fundId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive().min(1), // Minimum $1
    donorName: zod_1.z.string().min(1).max(100).optional(),
    donorEmail: zod_1.z.string().email().optional(),
    isAnonymous: zod_1.z.boolean().default(false),
    message: zod_1.z.string().max(500).optional(),
    returnUrl: zod_1.z.string().url().optional(),
});
/**
 * POST /api/donations
 * Create a donation payment intent (no authentication required for public donations)
 */
router.post('/', async (req, res) => {
    try {
        const validatedData = createDonationSchema.parse(req.body);
        // Verify strike fund exists and is active
        const fundResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, fund_name, tenant_id, status, current_balance, target_amount
      FROM strike_funds
      WHERE id = ${validatedData.fundId}
        AND status = 'active'
      LIMIT 1
    `);
        const funds = Array.isArray(fundResult) ? fundResult : (fundResult.rows || fundResult);
        if (funds.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Strike fund not found or inactive',
            });
        }
        const fund = funds[0];
        const organizationId = fund.tenant_id;
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(validatedData.amount * 100), // Convert to cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                fundId: validatedData.fundId,
                fundName: fund.fund_name,
                donorName: validatedData.donorName || 'Anonymous',
                donorEmail: validatedData.donorEmail || '',
                isAnonymous: validatedData.isAnonymous.toString(),
                message: validatedData.message || '',
                organizationId,
            },
            description: `Donation to ${fund.fund_name}`,
            receipt_email: validatedData.donorEmail || undefined,
        });
        // Create pending donation record in database
        const donationResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO public_donations (
        tenant_id, strike_fund_id, amount, donor_name, donor_email,
        is_anonymous, payment_provider, payment_intent_id,
        status, message
      ) VALUES (
        ${organizationId}, ${validatedData.fundId}, ${validatedData.amount.toString()},
        ${validatedData.donorName || null}, ${validatedData.donorEmail || null},
        ${validatedData.isAnonymous}, 'stripe', ${paymentIntent.id},
        'pending', ${validatedData.message || null}
      )
      RETURNING *
    `);
        const donations = Array.isArray(donationResult) ? donationResult : (donationResult.rows || donationResult);
        res.status(201).json({
            success: true,
            data: {
                donationId: donations[0].id,
                clientSecret: paymentIntent.client_secret,
                amount: validatedData.amount,
                fundName: fund.fund_name,
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
 * POST /api/donations/webhooks/stripe
 * Handle Stripe webhook events (payment confirmations, failures)
 */
router.post('/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).json({
            success: false,
            error: 'Missing stripe-signature header',
        });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    }
    catch (err) {
        logger.error('Webhook signature verification failed', { error: err });
        return res.status(400).json({
            success: false,
            error: `Webhook Error: ${err.message}`,
        });
    }
    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                await handlePaymentSuccess(paymentIntent);
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                await handlePaymentFailure(paymentIntent);
                break;
            }
            case 'payment_intent.canceled': {
                const paymentIntent = event.data.object;
                await handlePaymentCancellation(paymentIntent);
                break;
            }
            default:
                logger.info('Unhandled event type', { eventType: event.type });
        }
        res.json({ received: true });
    }
    catch (error) {
        logger.error('Error processing webhook', { error });
        res.status(500).json({
            success: false,
            error: 'Error processing webhook',
        });
    }
});
/**
 * GET /api/donations/campaigns/:fundId
 * Get public campaign information for a strike fund
 */
router.get('/campaigns/:fundId', async (req, res) => {
    try {
        const { fundId } = req.params;
        const fundResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        sf.id,
        sf.fund_name,
        sf.description,
        sf.target_amount,
        sf.current_balance,
        sf.strike_start_date,
        sf.strike_end_date,
        sf.status,
        COUNT(DISTINCT pd.id) as donor_count,
        COALESCE(SUM(CASE WHEN pd.status = 'completed' THEN pd.amount ELSE 0 END), 0) as total_donations
      FROM strike_funds sf
      LEFT JOIN public_donations pd ON pd.strike_fund_id = sf.id
      WHERE sf.id = ${fundId}
        AND sf.status IN ('active', 'completed')
      GROUP BY sf.id, sf.fund_name, sf.description, sf.target_amount, sf.current_balance, 
               sf.strike_start_date, sf.strike_end_date, sf.status
      LIMIT 1
    `);
        // postgres-js with drizzle returns array directly, not wrapped in .rows
        const rows = Array.isArray(fundResult) ? fundResult : (fundResult.rows || fundResult);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found',
            });
        }
        const fund = rows[0];
        // Get recent donations (non-anonymous only)
        const recentDonationsResult = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        donor_name,
        amount,
        message,
        created_at
      FROM public_donations
      WHERE strike_fund_id = ${fundId}
        AND is_anonymous = false
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 10
    `);
        const recentDonations = Array.isArray(recentDonationsResult) ? recentDonationsResult : (recentDonationsResult.rows || recentDonationsResult);
        res.json({
            success: true,
            data: {
                id: fund.id,
                name: fund.fund_name,
                description: fund.description,
                goal: parseFloat(fund.target_amount),
                currentBalance: parseFloat(fund.current_balance),
                totalDonations: parseFloat(fund.total_donations),
                donorCount: parseInt(fund.donor_count),
                startDate: fund.strike_start_date,
                endDate: fund.strike_end_date,
                status: fund.status,
                percentComplete: (parseFloat(fund.total_donations) / parseFloat(fund.target_amount)) * 100,
                recentDonations: recentDonations,
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
 * GET /api/donations/:donationId
 * Get donation status (for confirmation page)
 */
router.get('/:donationId', async (req, res) => {
    try {
        const { donationId } = req.params;
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT 
        pd.id,
        pd.amount,
        pd.donor_name,
        pd.is_anonymous,
        pd.status,
        pd.transaction_id,
        pd.created_at,
        sf.fund_name
      FROM public_donations pd
      JOIN strike_funds sf ON sf.id = pd.strike_fund_id
      WHERE pd.id = ${donationId}
      LIMIT 1
    `);
        const donations = Array.isArray(result) ? result : (result.rows || result);
        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Donation not found',
            });
        }
        res.json({
            success: true,
            data: donations[0],
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// Helper functions for webhook event handling
async function handlePaymentSuccess(paymentIntent) {
    const metadata = paymentIntent.metadata;
    // Update donation record
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE public_donations
    SET 
      status = 'completed',
      transaction_id = ${paymentIntent.id},
      processed_at = NOW(),
      updated_at = NOW()
    WHERE payment_intent_id = ${paymentIntent.id}
  `);
    // Update strike fund balance
    const amount = paymentIntent.amount / 100; // Convert from cents
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE strike_funds
    SET 
      current_balance = current_balance + ${amount.toString()},
      updated_at = NOW()
    WHERE id = ${metadata.fundId}
  `);
    logger.info('Payment succeeded for donation', { fundId: metadata.fundId, amount });
}
async function handlePaymentFailure(paymentIntent) {
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE public_donations
    SET 
      status = 'failed',
      updated_at = NOW()
    WHERE payment_intent_id = ${paymentIntent.id}
  `);
    logger.warn('Payment failed for intent', { paymentIntentId: paymentIntent.id });
}
async function handlePaymentCancellation(paymentIntent) {
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE public_donations
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE payment_intent_id = ${paymentIntent.id}
  `);
    logger.info('Payment cancelled for intent', { paymentIntentId: paymentIntent.id });
}
exports.default = router;
//# sourceMappingURL=donations.js.map