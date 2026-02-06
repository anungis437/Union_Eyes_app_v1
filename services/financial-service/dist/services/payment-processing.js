"use strict";
/**
 * Payment Processing Service
 *
 * Handles payment integration for:
 * - Dues payments (Stripe)
 * - Stipend disbursements (ACH/Direct Deposit)
 * - Public donations (Stripe)
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDuesPaymentIntent = createDuesPaymentIntent;
exports.confirmDuesPayment = confirmDuesPayment;
exports.createStipendPayout = createStipendPayout;
exports.batchProcessStipendPayouts = batchProcessStipendPayouts;
exports.createDonationPaymentIntent = createDonationPaymentIntent;
exports.confirmDonationPayment = confirmDonationPayment;
exports.processStripeWebhook = processStripeWebhook;
exports.getPaymentSummary = getPaymentSummary;
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const schema = __importStar(require("../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
// Initialize Stripe (use test key in development)
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2025-02-24.acacia',
});
/**
 * Create a Stripe payment intent for dues payment
 */
async function createDuesPaymentIntent(request) {
    try {
        const { tenantId, memberId, amount, currency = 'usd', paymentMethod, description, metadata } = request;
        // Validate amount (minimum $0.50 for Stripe)
        if (amount < 0.50) {
            throw new Error('Amount must be at least $0.50');
        }
        // Convert to cents
        const amountInCents = Math.round(amount * 100);
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            payment_method_types: [paymentMethod],
            description: description || `Union dues payment for member ${memberId}`,
            metadata: {
                tenantId,
                memberId,
                type: 'dues_payment',
                ...metadata,
            },
        });
        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount: amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
        };
    }
    catch (error) {
        console.error('Error creating dues payment intent:', error);
        throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Confirm a dues payment after Stripe webhook
 */
async function confirmDuesPayment(request) {
    const { tenantId, paymentIntentId, transactionId } = request;
    try {
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment not successful: ${paymentIntent.status}`);
        }
        // Update transaction record in database
        await db_1.db.update(schema.duesTransactions)
            .set({
            status: 'paid',
            paymentMethod: 'stripe',
            paymentDate: new Date(),
            stripePaymentIntentId: paymentIntentId,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.duesTransactions.id, transactionId), (0, drizzle_orm_1.eq)(schema.duesTransactions.tenantId, tenantId)));
    }
    catch (error) {
        console.error('Error confirming dues payment:', error);
        throw error;
    }
}
/**
 * Create ACH payout for stipend disbursement
 *
 * Note: In production, this would use Stripe Connect or a dedicated ACH processor
 * For MVP, we'll simulate the payout creation
 */
async function createStipendPayout(request) {
    const { tenantId, disbursementId, amount, recipientBankAccount, description } = request;
    try {
        // Validate amount
        if (amount < 1) {
            throw new Error('Payout amount must be at least $1.00');
        }
        // In production, integrate with Stripe Connect or ACH processor
        // For now, create a simulated payout record
        // Generate transaction ID
        const transactionId = `ACH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        // Estimate arrival (ACH typically takes 1-3 business days)
        const estimatedArrival = new Date();
        estimatedArrival.setDate(estimatedArrival.getDate() + 2);
        // Update disbursement record
        await db_1.db.update(schema.stipendDisbursements)
            .set({
            status: 'paid',
            transactionId,
            paidAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.stipendDisbursements.id, disbursementId), (0, drizzle_orm_1.eq)(schema.stipendDisbursements.tenantId, tenantId)));
        return {
            payoutId: transactionId,
            status: 'pending',
            estimatedArrival,
            transactionId,
        };
    }
    catch (error) {
        console.error('Error creating stipend payout:', error);
        throw new Error(`Failed to create payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Process multiple stipend payouts in batch
 */
async function batchProcessStipendPayouts(request) {
    const { tenantId, strikeFundId, disbursementIds } = request;
    const results = [];
    let successful = 0;
    let failed = 0;
    for (const disbursementId of disbursementIds) {
        try {
            // Get disbursement details
            const [disbursement] = await db_1.db.select()
                .from(schema.stipendDisbursements)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.stipendDisbursements.id, disbursementId), (0, drizzle_orm_1.eq)(schema.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema.stipendDisbursements.status, 'approved')))
                .limit(1);
            if (!disbursement) {
                results.push({
                    disbursementId,
                    success: false,
                    error: 'Disbursement not found or not approved',
                });
                failed++;
                continue;
            }
            // In production, would retrieve member bank account details
            // For now, simulate successful payout
            const transactionId = `ACH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            await db_1.db.update(schema.stipendDisbursements)
                .set({
                status: 'paid',
                transactionId,
                paidAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.stipendDisbursements.id, disbursementId));
            results.push({
                disbursementId,
                success: true,
                transactionId,
            });
            successful++;
        }
        catch (error) {
            results.push({
                disbursementId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
        }
    }
    return {
        successful,
        failed,
        results,
    };
}
/**
 * Create Stripe payment intent for public donation
 */
async function createDonationPaymentIntent(request) {
    try {
        const { tenantId, strikeFundId, amount, currency = 'usd', donorEmail, donorName, isAnonymous = false, message, paymentMethod = 'card', } = request;
        // Validate amount (minimum $1.00 for donations)
        if (amount < 1.00) {
            throw new Error('Donation amount must be at least $1.00');
        }
        // Convert to cents
        const amountInCents = Math.round(amount * 100);
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            payment_method_types: [paymentMethod],
            description: `Donation to strike fund`,
            metadata: {
                tenantId,
                strikeFundId,
                type: 'donation',
                donorEmail: donorEmail || '',
                donorName: isAnonymous ? 'Anonymous' : (donorName || ''),
                isAnonymous: isAnonymous.toString(),
                message: message || '',
            },
            receipt_email: donorEmail,
        });
        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount: amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
        };
    }
    catch (error) {
        console.error('Error creating donation payment intent:', error);
        throw new Error(`Failed to create donation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Confirm donation payment and create donation record
 */
async function confirmDonationPayment(request) {
    const { tenantId, paymentIntentId } = request;
    try {
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new Error(`Payment not successful: ${paymentIntent.status}`);
        }
        const metadata = paymentIntent.metadata;
        const amount = paymentIntent.amount / 100; // Convert from cents
        // Create donation record
        const [donation] = await db_1.db.insert(schema.donations)
            .values({
            tenantId,
            strikeFundId: metadata.strikeFundId,
            amount: amount.toString(),
            donorName: metadata.donorName || 'Anonymous',
            donorEmail: metadata.donorEmail || null,
            isAnonymous: metadata.isAnonymous === 'true',
            message: metadata.message || null,
            stripePaymentIntentId: paymentIntentId,
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning({ id: schema.donations.id });
        return donation.id;
    }
    catch (error) {
        console.error('Error confirming donation payment:', error);
        throw error;
    }
}
/**
 * Process Stripe webhook events
 */
async function processStripeWebhook(event, signature, webhookSecret) {
    try {
        // Verify webhook signature (in production)
        // const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        throw error;
    }
}
async function handlePaymentIntentSucceeded(paymentIntent) {
    const metadata = paymentIntent.metadata;
    const type = metadata.type;
    if (type === 'dues_payment') {
        // Update dues transaction
        await db_1.db.update(schema.duesTransactions)
            .set({
            status: 'paid',
            paymentMethod: 'stripe',
            paymentDate: new Date(),
            stripePaymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.duesTransactions.id, metadata.transactionId));
    }
    else if (type === 'donation') {
        // Create or update donation record
        const amount = paymentIntent.amount / 100;
        await db_1.db.insert(schema.donations)
            .values({
            tenantId: metadata.tenantId,
            strikeFundId: metadata.strikeFundId,
            amount: amount.toString(),
            donorName: metadata.donorName || 'Anonymous',
            donorEmail: metadata.donorEmail || null,
            isAnonymous: metadata.isAnonymous === 'true',
            message: metadata.message || null,
            stripePaymentIntentId: paymentIntent.id,
            status: 'completed',
            createdAt: new Date().toISOString(),
        });
    }
}
async function handlePaymentIntentFailed(paymentIntent) {
    const metadata = paymentIntent.metadata;
    const type = metadata.type;
    if (type === 'dues_payment') {
        await db_1.db.update(schema.duesTransactions)
            .set({
            status: 'failed',
            stripePaymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.duesTransactions.id, metadata.transactionId));
    }
}
async function handleChargeRefunded(charge) {
    const paymentIntentId = charge.payment_intent;
    // Update relevant records to refunded status
    await db_1.db.update(schema.duesTransactions)
        .set({
        status: 'refunded',
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema.duesTransactions.paymentReference, paymentIntentId));
    await db_1.db.update(schema.donations)
        .set({
        status: 'refunded',
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema.donations.stripePaymentIntentId, paymentIntentId));
}
/**
 * Get payment summary for a strike fund
 */
async function getPaymentSummary(tenantId, strikeFundId, startDate, endDate) {
    // Dues payments
    const duesQuery = db_1.db.select({
        total: (0, drizzle_orm_1.sql) `CAST(SUM(CAST(${schema.duesTransactions.amount} AS DECIMAL)) AS TEXT)`,
        count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        average: (0, drizzle_orm_1.sql) `CAST(AVG(CAST(${schema.duesTransactions.amount} AS DECIMAL)) AS TEXT)`,
    })
        .from(schema.duesTransactions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.duesTransactions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema.duesTransactions.status, 'paid')));
    // Donations
    const donationsQuery = db_1.db.select({
        total: (0, drizzle_orm_1.sql) `CAST(SUM(CAST(${schema.donations.amount} AS DECIMAL)) AS TEXT)`,
        count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        average: (0, drizzle_orm_1.sql) `CAST(AVG(CAST(${schema.donations.amount} AS DECIMAL)) AS TEXT)`,
    })
        .from(schema.donations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.donations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema.donations.strikeFundId, strikeFundId), (0, drizzle_orm_1.eq)(schema.donations.status, 'completed')));
    // Stipend disbursements
    const stipendsQuery = db_1.db.select({
        total: (0, drizzle_orm_1.sql) `CAST(SUM(CAST(${schema.stipendDisbursements.totalAmount} AS DECIMAL)) AS TEXT)`,
        count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        average: (0, drizzle_orm_1.sql) `CAST(AVG(CAST(${schema.stipendDisbursements.totalAmount} AS DECIMAL)) AS TEXT)`,
    })
        .from(schema.stipendDisbursements)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema.stipendDisbursements.strikeFundId, strikeFundId), (0, drizzle_orm_1.eq)(schema.stipendDisbursements.status, 'paid')));
    const [duesResults] = await duesQuery;
    const [donationsResults] = await donationsQuery;
    const [stipendsResults] = await stipendsQuery;
    const duesTotal = parseFloat(duesResults.total || '0');
    const donationsTotal = parseFloat(donationsResults.total || '0');
    const stipendsTotal = parseFloat(stipendsResults.total || '0');
    const totalRevenue = duesTotal + donationsTotal;
    const totalDisbursed = stipendsTotal;
    const netBalance = totalRevenue - totalDisbursed;
    return {
        duesPayments: {
            total: duesTotal,
            count: duesResults.count,
            averageAmount: parseFloat(duesResults.average || '0'),
        },
        donations: {
            total: donationsTotal,
            count: donationsResults.count,
            averageAmount: parseFloat(donationsResults.average || '0'),
        },
        stipendDisbursements: {
            total: stipendsTotal,
            count: stipendsResults.count,
            averageAmount: parseFloat(stipendsResults.average || '0'),
        },
        totalRevenue,
        totalDisbursed,
        netBalance,
    };
}
//# sourceMappingURL=payment-processing.js.map