/**
 * Arrears Detection Service
 * Automated system to detect overdue payments and create arrears cases
 */
export interface ArrearsDetectionConfig {
    tenantId: string;
    gracePeriodDays?: number;
    lateFeePercentage?: number;
    lateFeeFixedAmount?: number;
    escalationThresholds?: {
        level1Days?: number;
        level2Days?: number;
        level3Days?: number;
        level4Days?: number;
    };
}
export interface DetectedArrears {
    memberId: string;
    transactionIds: string[];
    totalOwing: number;
    oldestDebtDate: Date;
    daysOverdue: number;
    transactionCount: number;
    suggestedEscalation: string;
}
/**
 * Detect all overdue transactions and group by member
 */
export declare function detectOverduePayments(config: ArrearsDetectionConfig): Promise<DetectedArrears[]>;
/**
 * Calculate late fees for overdue transactions
 */
export declare function calculateLateFees(transactionId: string, config: ArrearsDetectionConfig): Promise<number>;
/**
 * Create arrears cases for detected overdue payments
 */
export declare function createArrearsCases(detectedArrears: DetectedArrears[], tenantId: string, createdBy: string): Promise<string[]>;
/**
 * Apply late fees to overdue transactions
 */
export declare function applyLateFees(transactionIds: string[], config: ArrearsDetectionConfig): Promise<number>;
/**
 * Run full arrears detection workflow
 */
export declare function runArrearsDetection(config: ArrearsDetectionConfig, createdBy: string): Promise<{
    detectedCount: number;
    casesCreated: string[];
    totalOwing: number;
    feesApplied: number;
}>;
//# sourceMappingURL=arrears-detection.d.ts.map