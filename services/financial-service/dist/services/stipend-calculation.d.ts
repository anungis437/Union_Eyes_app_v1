/**
 * Stipend Calculation Service
 * Week 6: Automated stipend calculations based on picket attendance
 *
 * Features:
 * - Eligibility verification (minimum hours threshold)
 * - Weekly stipend calculation
 * - Approval workflow (pending → approved → paid)
 * - Payment tracking and reconciliation
 */
export interface StipendCalculationRequest {
    tenantId: string;
    strikeFundId: string;
    weekStartDate: Date;
    weekEndDate: Date;
    minimumHours?: number;
    hourlyRate?: number;
}
export interface StipendEligibility {
    memberId: string;
    totalHours: number;
    eligible: boolean;
    stipendAmount: number;
    reason?: string;
}
export interface DisbursementRequest {
    tenantId: string;
    strikeFundId: string;
    memberId: string;
    amount: number;
    weekStartDate: Date;
    weekEndDate: Date;
    approvedBy: string;
    paymentMethod: 'direct_deposit' | 'check' | 'cash' | 'paypal';
    notes?: string;
}
export interface DisbursementApproval {
    disbursementId: string;
    approvedBy: string;
    approvalNotes?: string;
}
/**
 * Calculate stipends for all eligible members for a given week
 */
export declare function calculateWeeklyStipends(request: StipendCalculationRequest): Promise<StipendEligibility[]>;
/**
 * Create a pending disbursement record
 */
export declare function createDisbursement(request: DisbursementRequest): Promise<{
    success: boolean;
    disbursementId?: string;
    error?: string;
}>;
/**
 * Approve a pending disbursement
 */
export declare function approveDisbursement(tenantId: string, approval: DisbursementApproval): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Mark a disbursement as paid
 */
export declare function markDisbursementPaid(tenantId: string, disbursementId: string, transactionId: string, paidBy: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Get disbursement history for a member
 */
export declare function getMemberDisbursements(tenantId: string, memberId: string, strikeFundId?: string): Promise<any[]>;
/**
 * Get pending disbursements for approval
 */
export declare function getPendingDisbursements(tenantId: string, strikeFundId: string): Promise<any[]>;
/**
 * Get total disbursed amount for a strike fund
 */
export declare function getStrikeFundDisbursementSummary(tenantId: string, strikeFundId: string): Promise<{
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    memberCount: number;
}>;
/**
 * Batch create disbursements for all eligible members
 */
export declare function batchCreateDisbursements(request: StipendCalculationRequest & {
    approvedBy: string;
    paymentMethod: string;
}): Promise<{
    success: boolean;
    created: number;
    skipped: number;
    disbursementIds: string[];
    errors: string[];
}>;
//# sourceMappingURL=stipend-calculation.d.ts.map