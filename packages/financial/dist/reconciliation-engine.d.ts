/**
 * Reconciliation Engine
 * Auto-matches remittance records with dues transactions
 * Detects variances and manages dispute workflow
 */
export interface ReconciliationInput {
    remittanceId: string;
    remittanceRecords: RemittanceRecord[];
    existingTransactions: DuesTransaction[];
    tenantId: string;
    toleranceAmount?: number;
    tolerancePercentage?: number;
}
export interface RemittanceRecord {
    employeeId: string;
    memberNumber?: string;
    duesAmount: number;
    grossWages: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    rawLineNumber?: number;
}
export interface DuesTransaction {
    id: string;
    memberId: string;
    amount: number;
    periodStart: Date;
    periodEnd: Date;
    status: string;
    remittanceId?: string;
}
export interface ReconciliationMatch {
    transactionId: string;
    remittanceLineNumber: number;
    matchType: 'exact' | 'fuzzy' | 'manual';
    confidence: number;
    amountVariance: number;
    memberIdMatch: boolean;
    periodMatch: boolean;
}
export interface ReconciliationVariance {
    type: 'overpayment' | 'underpayment' | 'missing_transaction' | 'unmatched_remittance';
    remittanceLineNumber?: number;
    transactionId?: string;
    memberId?: string;
    employeeId?: string;
    expectedAmount: number;
    actualAmount: number;
    varianceAmount: number;
    variancePercentage: number;
    description: string;
}
export interface ReconciliationResult {
    success: boolean;
    remittanceId: string;
    summary: {
        totalRemittanceAmount: number;
        totalTransactionAmount: number;
        totalVariance: number;
        matchedCount: number;
        unmatchedRemittanceCount: number;
        unmatchedTransactionCount: number;
        varianceCount: number;
        autoMatchRate: number;
    };
    matches: ReconciliationMatch[];
    variances: ReconciliationVariance[];
    unmatchedRemittances: RemittanceRecord[];
    unmatchedTransactions: DuesTransaction[];
}
/**
 * Reconciliation Engine Class
 */
export declare class ReconciliationEngine {
    private toleranceAmount;
    private tolerancePercentage;
    constructor(toleranceAmount?: number, tolerancePercentage?: number);
    /**
     * Main reconciliation method
     */
    reconcile(input: ReconciliationInput): Promise<ReconciliationResult>;
    /**
     * Find best matching transaction for a remittance record
     */
    private findBestMatch;
    /**
     * Score how well a transaction matches a remittance record
     */
    private scoreMatch;
    /**
     * Check if member IDs match
     * Returns: true (match), false (mismatch), null (cannot determine)
     */
    private checkMemberIdMatch;
    /**
     * Check if billing periods match exactly
     */
    private checkPeriodMatch;
    /**
     * Check if billing periods overlap
     */
    private checkPeriodOverlap;
    /**
     * Normalize member ID for comparison (remove spaces, dashes, leading zeros)
     */
    private normalizeMemberId;
    /**
     * Check if two dates are the same day
     */
    private isSameDay;
    /**
     * Generate human-readable reconciliation report
     */
    generateReport(result: ReconciliationResult): string;
}
export default ReconciliationEngine;
//# sourceMappingURL=reconciliation-engine.d.ts.map