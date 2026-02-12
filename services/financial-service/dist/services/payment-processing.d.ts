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
export type PaymentProcessor = 'stripe' | 'ach' | 'check' | 'cash' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
export type StripePaymentMethod = 'card' | 'bank_account' | 'us_bank_account';
/**
 * DUES PAYMENT PROCESSING
 */
export interface CreateDuesPaymentRequest {
    organizationId: string;
    memberId: string;
    amount: number;
    currency?: string;
    paymentMethod: StripePaymentMethod;
    description?: string;
    metadata?: Record<string, string>;
}
export interface DuesPaymentIntent {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
}
/**
 * Create a Stripe payment intent for dues payment
 */
export declare function createDuesPaymentIntent(request: CreateDuesPaymentRequest): Promise<DuesPaymentIntent>;
export interface ConfirmDuesPaymentRequest {
    organizationId: string;
    paymentIntentId: string;
    transactionId: string;
}
/**
 * Confirm a dues payment after Stripe webhook
 */
export declare function confirmDuesPayment(request: ConfirmDuesPaymentRequest): Promise<void>;
/**
 * STIPEND DISBURSEMENT PROCESSING
 */
export interface CreateStipendPayoutRequest {
    organizationId: string;
    disbursementId: string;
    amount: number;
    recipientBankAccount: {
        accountNumber: string;
        routingNumber: string;
        accountHolderName: string;
        accountType: 'checking' | 'savings';
    };
    description?: string;
}
export interface StipendPayoutResult {
    payoutId: string;
    status: string;
    estimatedArrival: Date;
    transactionId: string;
}
/**
 * Create ACH payout for stipend disbursement
 *
 * Note: In production, this would use Stripe Connect or a dedicated ACH processor
 * For MVP, we'll simulate the payout creation
 */
export declare function createStipendPayout(request: CreateStipendPayoutRequest): Promise<StipendPayoutResult>;
export interface BatchStipendPayoutRequest {
    organizationId: string;
    strikeFundId: string;
    disbursementIds: string[];
}
export interface BatchPayoutResult {
    successful: number;
    failed: number;
    results: Array<{
        disbursementId: string;
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
}
/**
 * Process multiple stipend payouts in batch
 */
export declare function batchProcessStipendPayouts(request: BatchStipendPayoutRequest): Promise<BatchPayoutResult>;
/**
 * PUBLIC DONATION PROCESSING
 */
export interface CreateDonationPaymentRequest {
    organizationId: string;
    strikeFundId: string;
    amount: number;
    currency?: string;
    donorEmail?: string;
    donorName?: string;
    isAnonymous?: boolean;
    message?: string;
    paymentMethod?: StripePaymentMethod;
}
export interface DonationPaymentIntent {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
    publicUrl?: string;
}
/**
 * Create Stripe payment intent for public donation
 */
export declare function createDonationPaymentIntent(request: CreateDonationPaymentRequest): Promise<DonationPaymentIntent>;
export interface ConfirmDonationRequest {
    organizationId: string;
    paymentIntentId: string;
}
/**
 * Confirm donation payment and create donation record
 */
export declare function confirmDonationPayment(request: ConfirmDonationRequest): Promise<string>;
/**
 * PAYMENT WEBHOOK PROCESSING
 */
export interface StripeWebhookEvent {
    id: string;
    type: string;
    data: {
        object: any;
    };
}
/**
 * Process Stripe webhook events
 */
export declare function processStripeWebhook(event: StripeWebhookEvent, signature: string, webhookSecret: string): Promise<void>;
/**
 * PAYMENT ANALYTICS
 */
export interface PaymentSummary {
    duesPayments: {
        total: number;
        count: number;
        averageAmount: number;
    };
    donations: {
        total: number;
        count: number;
        averageAmount: number;
    };
    stipendDisbursements: {
        total: number;
        count: number;
        averageAmount: number;
    };
    totalRevenue: number;
    totalDisbursed: number;
    netBalance: number;
}
/**
 * Get payment summary for a strike fund
 */
export declare function getPaymentSummary(organizationId: string, strikeFundId: string, startDate?: Date, endDate?: Date): Promise<PaymentSummary>;
//# sourceMappingURL=payment-processing.d.ts.map