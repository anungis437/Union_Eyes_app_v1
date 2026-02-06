/**
 * Dues Calculation Engine
 *
 * Comprehensive calculation engine supporting 5 calculation methods:
 * 1. Percentage-based (e.g., 2.5% of gross wages)
 * 2. Flat rate (e.g., $25/month)
 * 3. Hourly-based (e.g., $0.50/hour worked)
 * 4. Tiered (progressive rates based on income brackets)
 * 5. Custom formula (JavaScript-safe expressions)
 *
 * Features:
 * - Batch processing for monthly dues runs
 * - Automatic late fee calculation
 * - Additional fee support (COPE, PAC, initiation)
 * - Arrears checking and handling
 * - Audit trail generation
 */
export type CalculationType = 'percentage' | 'flat_rate' | 'hourly' | 'tiered' | 'formula';
export type BillingFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
export type LateFeeType = 'percentage' | 'flat_amount' | 'none';
export interface DuesRule {
    id: string;
    tenantId: string;
    ruleName: string;
    ruleCode: string;
    calculationType: CalculationType;
    percentageRate?: number;
    baseField?: string;
    flatAmount?: number;
    hourlyRate?: number;
    hoursPerPeriod?: number;
    tierStructure?: TierRule[];
    customFormula?: string;
    billingFrequency: BillingFrequency;
    copeContribution: number;
    pacContribution: number;
    initiationFee: number;
    strikeFundContribution: number;
    gracePeriodDays: number;
    lateFeeType: LateFeeType;
    lateFeeAmount?: number;
    lateFeePercentage?: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    isActive: boolean;
}
export interface TierRule {
    min: number;
    max: number | null;
    rate: number;
}
export interface MemberDuesAssignment {
    id: string;
    tenantId: string;
    memberId: string;
    duesRuleId: string;
    effectiveFrom: Date;
    effectiveTo?: Date;
    overrideAmount?: number;
    overrideReason?: string;
    isExempt: boolean;
    exemptionReason?: string;
}
export interface CalculationInput {
    memberId: string;
    tenantId: string;
    assignmentId: string;
    rule: DuesRule;
    grossWages?: number;
    baseSalary?: number;
    hourlyRate?: number;
    hoursWorked?: number;
    overtimeHours?: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    dueDate: Date;
    existingArrears?: number;
    manualOverride?: number;
}
export interface CalculationResult {
    memberId: string;
    tenantId: string;
    assignmentId: string;
    baseDuesAmount: number;
    copeAmount: number;
    pacAmount: number;
    strikeFundAmount: number;
    lateFeeAmount: number;
    adjustmentAmount: number;
    totalAmount: number;
    calculationMethod: CalculationType;
    calculationInputs: Record<string, any>;
    calculationSteps: string[];
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    dueDate: Date;
    calculatedAt: Date;
}
export interface BatchCalculationOptions {
    tenantId: string;
    billingMonth: Date;
    includeExempt?: boolean;
    dryRun?: boolean;
}
export interface BatchCalculationResult {
    success: boolean;
    totalProcessed: number;
    successful: number;
    failed: number;
    skipped: number;
    results: CalculationResult[];
    errors: Array<{
        memberId: string;
        error: string;
    }>;
    summary: {
        totalBaseDues: number;
        totalCope: number;
        totalPac: number;
        totalStrikeFund: number;
        totalLateFees: number;
        totalRevenue: number;
    };
}
export declare class DuesCalculationEngine {
    private readonly MAX_FORMULA_LENGTH;
    private readonly SAFE_FORMULA_REGEX;
    /**
     * Calculate dues for a single member
     */
    calculateMemberDues(input: CalculationInput): Promise<CalculationResult>;
    /**
     * Calculate base dues amount based on calculation type
     */
    private calculateBaseDues;
    /**
     * Percentage-based calculation (e.g., 2.5% of gross wages)
     */
    private calculatePercentageBased;
    /**
     * Flat rate calculation (e.g., $25/month)
     */
    private calculateFlatRate;
    /**
     * Hourly-based calculation (e.g., $0.50/hour)
     */
    private calculateHourlyBased;
    /**
     * Tiered calculation (progressive rates based on income brackets)
     */
    private calculateTiered;
    /**
     * Custom formula calculation (JavaScript-safe expressions)
     */
    private calculateFormula;
    /**
     * Calculate late fees based on rule configuration
     */
    private calculateLateFees;
    /**
     * Validate custom formula for safety
     */
    private validateFormula;
    /**
     * Safely evaluate mathematical formula
     */
    private evaluateSafeFormula;
    /**
     * Batch process dues calculations for all members in a tenant
     */
    batchCalculateDues(assignments: Array<{
        member: any;
        assignment: MemberDuesAssignment;
        rule: DuesRule;
    }>, options: BatchCalculationOptions): Promise<BatchCalculationResult>;
    /**
     * Simple batch calculation from array of CalculationInputs
     */
    batchCalculateDuesSimple(inputs: CalculationInput[]): {
        success: boolean;
        totalProcessed: number;
        successful: number;
        failed: number;
        results: CalculationResult[];
        errors: Array<{
            memberId: string;
            error: string;
        }>;
        summary: {
            totalBaseDues: number;
            totalCope: number;
            totalPac: number;
            totalStrikeFund: number;
            totalLateFees: number;
            totalRevenue: number;
        };
    };
    /**
     * Synchronous version of calculateMemberDues for batch processing
     */
    private calculateDuesSync;
    private calculateBaseDuesSync;
    private calculateFlatRateSync;
    private calculatePercentageBasedSync;
    private calculateHourlyBasedSync;
    private calculateTieredSync;
    private calculateFormulaSync;
}
export default DuesCalculationEngine;
//# sourceMappingURL=calculation-engine.d.ts.map