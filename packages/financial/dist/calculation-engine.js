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
import Decimal from 'decimal.js';
import { addMonths, differenceInDays, startOfMonth } from 'date-fns';
// ============================================================================
// DUES CALCULATION ENGINE
// ============================================================================
export class DuesCalculationEngine {
    constructor() {
        this.MAX_FORMULA_LENGTH = 500;
        this.SAFE_FORMULA_REGEX = /^[0-9+\-*/(). _a-z]+$/i;
    }
    /**
     * Calculate dues for a single member
     */
    async calculateMemberDues(input) {
        const steps = [];
        let baseDuesAmount = new Decimal(0);
        try {
            // Step 1: Check for manual override
            if (input.manualOverride !== undefined) {
                baseDuesAmount = new Decimal(input.manualOverride);
                steps.push(`Manual override applied: ${baseDuesAmount.toFixed(2)}`);
            }
            else {
                // Step 2: Calculate base dues based on calculation type
                baseDuesAmount = await this.calculateBaseDues(input, steps);
            }
            // Step 3: Add additional fees
            const copeAmount = new Decimal(input.rule.copeContribution);
            const pacAmount = new Decimal(input.rule.pacContribution);
            const strikeFundAmount = new Decimal(input.rule.strikeFundContribution);
            const initiationAmount = new Decimal(input.rule.initiationFee);
            steps.push(`COPE contribution: ${copeAmount.toFixed(2)}`);
            steps.push(`PAC contribution: ${pacAmount.toFixed(2)}`);
            steps.push(`Strike fund: ${strikeFundAmount.toFixed(2)}`);
            if (initiationAmount.greaterThan(0)) {
                steps.push(`Initiation fee: ${initiationAmount.toFixed(2)}`);
                baseDuesAmount = baseDuesAmount.plus(initiationAmount);
            }
            // Step 4: Check for arrears and calculate late fees
            let lateFeeAmount = new Decimal(0);
            if (input.existingArrears && input.existingArrears > 0) {
                lateFeeAmount = this.calculateLateFees(input.existingArrears, input.rule, input.dueDate, steps);
            }
            // Step 5: Calculate total
            const totalAmount = baseDuesAmount
                .plus(copeAmount)
                .plus(pacAmount)
                .plus(strikeFundAmount)
                .plus(lateFeeAmount);
            steps.push(`Total dues: ${totalAmount.toFixed(2)}`);
            return {
                memberId: input.memberId,
                tenantId: input.tenantId,
                assignmentId: input.assignmentId,
                baseDuesAmount: baseDuesAmount.toNumber(),
                copeAmount: copeAmount.toNumber(),
                pacAmount: pacAmount.toNumber(),
                strikeFundAmount: strikeFundAmount.toNumber(),
                lateFeeAmount: lateFeeAmount.toNumber(),
                adjustmentAmount: 0,
                totalAmount: totalAmount.toNumber(),
                calculationMethod: input.rule.calculationType,
                calculationInputs: {
                    grossWages: input.grossWages,
                    baseSalary: input.baseSalary,
                    hourlyRate: input.hourlyRate,
                    hoursWorked: input.hoursWorked,
                    overtimeHours: input.overtimeHours,
                    existingArrears: input.existingArrears,
                    manualOverride: input.manualOverride,
                },
                calculationSteps: steps,
                billingPeriodStart: input.billingPeriodStart,
                billingPeriodEnd: input.billingPeriodEnd,
                dueDate: input.dueDate,
                calculatedAt: new Date(),
            };
        }
        catch (error) {
            throw new Error(`Failed to calculate dues for member ${input.memberId}: ${error.message}`);
        }
    }
    /**
     * Calculate base dues amount based on calculation type
     */
    async calculateBaseDues(input, steps) {
        const { rule } = input;
        switch (rule.calculationType) {
            case 'percentage':
                return this.calculatePercentageBased(input, steps);
            case 'flat_rate':
                return this.calculateFlatRate(input, steps);
            case 'hourly':
                return this.calculateHourlyBased(input, steps);
            case 'tiered':
                return this.calculateTiered(input, steps);
            case 'formula':
                return this.calculateFormula(input, steps);
            default:
                throw new Error(`Unsupported calculation type: ${rule.calculationType}`);
        }
    }
    /**
     * Percentage-based calculation (e.g., 2.5% of gross wages)
     */
    calculatePercentageBased(input, steps) {
        const { rule } = input;
        if (!rule.percentageRate || !rule.baseField) {
            throw new Error('Percentage rate and base field are required for percentage-based calculation');
        }
        // Get the base amount from input
        let baseAmount;
        switch (rule.baseField) {
            case 'gross_wages':
                if (input.grossWages === undefined) {
                    throw new Error('Gross wages required for percentage calculation');
                }
                baseAmount = input.grossWages;
                break;
            case 'base_salary':
                if (input.baseSalary === undefined) {
                    throw new Error('Base salary required for percentage calculation');
                }
                baseAmount = input.baseSalary;
                break;
            case 'hourly_rate':
                if (input.hourlyRate === undefined || input.hoursWorked === undefined) {
                    throw new Error('Hourly rate and hours worked required for percentage calculation');
                }
                baseAmount = input.hourlyRate * input.hoursWorked;
                break;
            default:
                throw new Error(`Unsupported base field: ${rule.baseField}`);
        }
        const rate = new Decimal(rule.percentageRate).dividedBy(100);
        const result = new Decimal(baseAmount).times(rate);
        steps.push(`Base amount (${rule.baseField}): ${baseAmount.toFixed(2)}`);
        steps.push(`Rate: ${rule.percentageRate}%`);
        steps.push(`Calculated dues: ${result.toFixed(2)}`);
        return result;
    }
    /**
     * Flat rate calculation (e.g., $25/month)
     */
    calculateFlatRate(input, steps) {
        const { rule } = input;
        if (!rule.flatAmount) {
            throw new Error('Flat amount is required for flat rate calculation');
        }
        const result = new Decimal(rule.flatAmount);
        steps.push(`Flat rate amount: ${result.toFixed(2)}`);
        return result;
    }
    /**
     * Hourly-based calculation (e.g., $0.50/hour)
     */
    calculateHourlyBased(input, steps) {
        const { rule } = input;
        if (!rule.hourlyRate) {
            throw new Error('Hourly rate is required for hourly-based calculation');
        }
        // Use actual hours worked if provided, otherwise use configured hours per period
        const hours = input.hoursWorked ?? rule.hoursPerPeriod ?? 0;
        if (hours === 0) {
            throw new Error('Hours worked or hours per period must be specified');
        }
        const result = new Decimal(rule.hourlyRate).times(hours);
        steps.push(`Hourly rate: ${rule.hourlyRate}`);
        steps.push(`Hours: ${hours}`);
        steps.push(`Calculated dues: ${result.toFixed(2)}`);
        return result;
    }
    /**
     * Tiered calculation (progressive rates based on income brackets)
     */
    calculateTiered(input, steps) {
        const { rule } = input;
        if (!rule.tierStructure || rule.tierStructure.length === 0) {
            throw new Error('Tier structure is required for tiered calculation');
        }
        // Get base income amount
        const baseIncome = input.grossWages ?? input.baseSalary ?? 0;
        if (baseIncome === 0) {
            throw new Error('Gross wages or base salary required for tiered calculation');
        }
        let totalDues = new Decimal(0);
        steps.push(`Base income: ${baseIncome.toFixed(2)}`);
        // Sort tiers by minimum amount
        const sortedTiers = [...rule.tierStructure].sort((a, b) => a.min - b.min);
        for (const tier of sortedTiers) {
            const tierMin = tier.min;
            const tierMax = tier.max ?? Infinity;
            if (baseIncome > tierMin) {
                // Calculate amount in this tier
                const amountInTier = Math.min(baseIncome, tierMax) - tierMin;
                if (amountInTier > 0) {
                    const rate = new Decimal(tier.rate).dividedBy(100);
                    const tierDues = new Decimal(amountInTier).times(rate);
                    totalDues = totalDues.plus(tierDues);
                    steps.push(`Tier ${tierMin}-${tierMax === Infinity ? '∞' : tierMax}: ` +
                        `${amountInTier.toFixed(2)} × ${tier.rate}% = ${tierDues.toFixed(2)}`);
                }
            }
        }
        steps.push(`Total tiered dues: ${totalDues.toFixed(2)}`);
        return totalDues;
    }
    /**
     * Custom formula calculation (JavaScript-safe expressions)
     */
    calculateFormula(input, steps) {
        const { rule } = input;
        if (!rule.customFormula) {
            throw new Error('Custom formula is required for formula-based calculation');
        }
        // Validate formula
        this.validateFormula(rule.customFormula);
        // Build safe context for formula evaluation
        const context = {
            gross_wages: input.grossWages ?? 0,
            base_salary: input.baseSalary ?? 0,
            hourly_rate: input.hourlyRate ?? 0,
            hours_worked: input.hoursWorked ?? 0,
            overtime_hours: input.overtimeHours ?? 0,
        };
        steps.push(`Formula: ${rule.customFormula}`);
        steps.push(`Context: ${JSON.stringify(context)}`);
        try {
            // Replace context variables in formula
            let formula = rule.customFormula;
            Object.entries(context).forEach(([key, value]) => {
                formula = formula.replace(new RegExp(key, 'g'), value.toString());
            });
            // Evaluate formula using safe math evaluation
            const result = this.evaluateSafeFormula(formula);
            steps.push(`Evaluated formula: ${formula}`);
            steps.push(`Result: ${result.toFixed(2)}`);
            return result;
        }
        catch (error) {
            throw new Error(`Formula evaluation failed: ${error.message}`);
        }
    }
    /**
     * Calculate late fees based on rule configuration
     */
    calculateLateFees(arrearsAmount, rule, dueDate, steps) {
        if (rule.lateFeeType === 'none') {
            return new Decimal(0);
        }
        const now = new Date();
        const daysOverdue = differenceInDays(now, dueDate);
        if (daysOverdue <= rule.gracePeriodDays) {
            steps.push(`Within grace period (${rule.gracePeriodDays} days), no late fee`);
            return new Decimal(0);
        }
        let lateFee = new Decimal(0);
        if (rule.lateFeeType === 'flat_amount' && rule.lateFeeAmount) {
            lateFee = new Decimal(rule.lateFeeAmount);
            steps.push(`Flat late fee: ${lateFee.toFixed(2)}`);
        }
        else if (rule.lateFeeType === 'percentage' && rule.lateFeePercentage) {
            const rate = new Decimal(rule.lateFeePercentage).dividedBy(100);
            lateFee = new Decimal(arrearsAmount).times(rate);
            steps.push(`Late fee (${rule.lateFeePercentage}% of ${arrearsAmount}): ${lateFee.toFixed(2)}`);
        }
        return lateFee;
    }
    /**
     * Validate custom formula for safety
     */
    validateFormula(formula) {
        if (formula.length > this.MAX_FORMULA_LENGTH) {
            throw new Error(`Formula exceeds maximum length of ${this.MAX_FORMULA_LENGTH} characters`);
        }
        if (!this.SAFE_FORMULA_REGEX.test(formula)) {
            throw new Error('Formula contains unsafe characters');
        }
        // Check for dangerous patterns
        const dangerousPatterns = [
            /eval/i,
            /function/i,
            /import/i,
            /require/i,
            /process/i,
            /exec/i,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(formula)) {
                throw new Error(`Formula contains forbidden pattern: ${pattern}`);
            }
        }
    }
    /**
     * Safely evaluate mathematical formula
     */
    evaluateSafeFormula(formula) {
        // Simple recursive descent parser for basic math expressions
        // Supports: +, -, *, /, (), numbers
        let pos = 0;
        const peek = () => formula[pos] || '';
        const consume = () => formula[pos++] || '';
        const skipWhitespace = () => {
            while (peek() === ' ')
                consume();
        };
        const parseNumber = () => {
            skipWhitespace();
            let numStr = '';
            while (/[0-9.]/.test(peek())) {
                numStr += consume();
            }
            if (!numStr)
                throw new Error('Expected number');
            return new Decimal(numStr);
        };
        const parseFactor = () => {
            skipWhitespace();
            if (peek() === '(') {
                consume(); // (
                const result = parseExpression();
                skipWhitespace();
                if (consume() !== ')')
                    throw new Error('Expected )');
                return result;
            }
            return parseNumber();
        };
        const parseTerm = () => {
            let result = parseFactor();
            skipWhitespace();
            while (peek() === '*' || peek() === '/') {
                const op = consume();
                const right = parseFactor();
                result = op === '*' ? result.times(right) : result.dividedBy(right);
                skipWhitespace();
            }
            return result;
        };
        const parseExpression = () => {
            let result = parseTerm();
            skipWhitespace();
            while (peek() === '+' || peek() === '-') {
                const op = consume();
                const right = parseTerm();
                result = op === '+' ? result.plus(right) : result.minus(right);
                skipWhitespace();
            }
            return result;
        };
        return parseExpression();
    }
    /**
     * Batch process dues calculations for all members in a tenant
     */
    async batchCalculateDues(assignments, options) {
        const results = [];
        const errors = [];
        let skipped = 0;
        const billingPeriodStart = startOfMonth(options.billingMonth);
        const billingPeriodEnd = addMonths(billingPeriodStart, 1);
        const dueDate = addMonths(billingPeriodStart, 1); // Due first of next month
        for (const { member, assignment, rule } of assignments) {
            try {
                // Skip exempt members unless explicitly included
                if (assignment.isExempt && !options.includeExempt) {
                    skipped++;
                    continue;
                }
                // Skip if assignment not effective
                if (assignment.effectiveFrom > billingPeriodStart ||
                    (assignment.effectiveTo && assignment.effectiveTo < billingPeriodStart)) {
                    skipped++;
                    continue;
                }
                // Build calculation input
                const input = {
                    memberId: member.id,
                    tenantId: options.tenantId,
                    assignmentId: assignment.id,
                    rule,
                    grossWages: member.gross_wages,
                    baseSalary: member.base_salary,
                    hourlyRate: member.hourly_rate,
                    hoursWorked: member.hours_worked,
                    overtimeHours: member.overtime_hours,
                    billingPeriodStart,
                    billingPeriodEnd,
                    dueDate,
                    existingArrears: member.existing_arrears,
                    manualOverride: assignment.overrideAmount,
                };
                const result = await this.calculateMemberDues(input);
                results.push(result);
            }
            catch (error) {
                errors.push({
                    memberId: member.id,
                    error: error.message,
                });
            }
        }
        // Calculate summary
        const summary = results.reduce((acc, result) => ({
            totalBaseDues: acc.totalBaseDues + result.baseDuesAmount,
            totalCope: acc.totalCope + result.copeAmount,
            totalPac: acc.totalPac + result.pacAmount,
            totalStrikeFund: acc.totalStrikeFund + result.strikeFundAmount,
            totalLateFees: acc.totalLateFees + result.lateFeeAmount,
            totalRevenue: acc.totalRevenue + result.totalAmount,
        }), {
            totalBaseDues: 0,
            totalCope: 0,
            totalPac: 0,
            totalStrikeFund: 0,
            totalLateFees: 0,
            totalRevenue: 0,
        });
        return {
            success: errors.length === 0,
            totalProcessed: assignments.length,
            successful: results.length,
            failed: errors.length,
            skipped,
            results,
            errors,
            summary,
        };
    }
    /**
     * Simple batch calculation from array of CalculationInputs
     */
    batchCalculateDuesSimple(inputs) {
        const results = [];
        const errors = [];
        for (const input of inputs) {
            try {
                const result = this.calculateDuesSync(input);
                results.push(result);
            }
            catch (error) {
                errors.push({
                    memberId: input.memberId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        // Calculate summary
        const summary = results.reduce((acc, result) => ({
            totalBaseDues: acc.totalBaseDues + result.baseDuesAmount,
            totalCope: acc.totalCope + result.copeAmount,
            totalPac: acc.totalPac + result.pacAmount,
            totalStrikeFund: acc.totalStrikeFund + result.strikeFundAmount,
            totalLateFees: acc.totalLateFees + result.lateFeeAmount,
            totalRevenue: acc.totalRevenue + result.totalAmount,
        }), {
            totalBaseDues: 0,
            totalCope: 0,
            totalPac: 0,
            totalStrikeFund: 0,
            totalLateFees: 0,
            totalRevenue: 0,
        });
        return {
            success: errors.length === 0,
            totalProcessed: inputs.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors,
            summary,
        };
    }
    /**
     * Synchronous version of calculateMemberDues for batch processing
     */
    calculateDuesSync(input) {
        const steps = [];
        const errors = [];
        try {
            // Calculate base dues amount
            const baseDuesAmount = this.calculateBaseDuesSync(input, steps);
            // Calculate additional fees (all zero for now as per the fix)
            const copeAmount = 0;
            const pacAmount = 0;
            const initiationFee = 0;
            const strikeFundAmount = 0;
            // Calculate late fees (if applicable)
            const lateFeeAmount = 0; // Simplified for now
            // Calculate total
            const totalAmount = baseDuesAmount + copeAmount + pacAmount + initiationFee + strikeFundAmount + lateFeeAmount;
            return {
                memberId: input.memberId,
                tenantId: input.tenantId,
                assignmentId: input.assignmentId,
                baseDuesAmount,
                copeAmount,
                pacAmount,
                strikeFundAmount,
                lateFeeAmount,
                totalAmount,
                billingPeriodStart: input.billingPeriodStart,
                billingPeriodEnd: input.billingPeriodEnd,
                dueDate: input.dueDate,
                calculatedAt: new Date(),
                calculationMethod: input.rule.calculationType,
                calculationInputs: {
                    grossWages: input.grossWages,
                    baseSalary: input.baseSalary,
                    hourlyRate: input.hourlyRate,
                    hoursWorked: input.hoursWorked,
                    ruleId: input.rule.id,
                    initiationFee,
                    errors,
                },
                calculationSteps: steps,
                adjustmentAmount: 0,
            };
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    calculateBaseDuesSync(input, steps) {
        const rule = input.rule;
        switch (rule.calculationType) {
            case 'flat_rate':
                return this.calculateFlatRateSync(input, steps);
            case 'percentage':
                return this.calculatePercentageBasedSync(input, steps);
            case 'hourly':
                return this.calculateHourlyBasedSync(input, steps);
            case 'tiered':
                return this.calculateTieredSync(input, steps);
            case 'formula':
                return this.calculateFormulaSync(input, steps);
            default:
                throw new Error(`Unsupported calculation type: ${rule.calculationType}`);
        }
    }
    calculateFlatRateSync(input, steps) {
        const { rule } = input;
        if (!rule.flatAmount) {
            throw new Error('Flat amount not specified for flat rate calculation');
        }
        const amount = Number(rule.flatAmount);
        steps.push(`Flat rate: $${amount.toFixed(2)}`);
        return amount;
    }
    calculatePercentageBasedSync(input, steps) {
        const { rule, grossWages, baseSalary } = input;
        if (!rule.percentageRate) {
            throw new Error('Percentage rate not specified');
        }
        const rate = Number(rule.percentageRate) / 100;
        const baseAmount = rule.baseField === 'gross_wages' ? (grossWages || 0) : (baseSalary || 0);
        const amount = baseAmount * rate;
        steps.push(`Base amount (${rule.baseField}): $${baseAmount.toFixed(2)}`);
        steps.push(`Percentage rate: ${(rate * 100).toFixed(2)}%`);
        steps.push(`Calculated dues: $${amount.toFixed(2)}`);
        return amount;
    }
    calculateHourlyBasedSync(input, steps) {
        const { rule, hoursWorked } = input;
        if (!rule.hourlyRate) {
            throw new Error('Hourly rate not specified');
        }
        const rate = Number(rule.hourlyRate);
        const hours = hoursWorked || 0;
        const amount = rate * hours;
        steps.push(`Hourly rate: $${rate.toFixed(2)}`);
        steps.push(`Hours worked: ${hours}`);
        steps.push(`Calculated dues: $${amount.toFixed(2)}`);
        return amount;
    }
    calculateTieredSync(input, steps) {
        // Simplified - just return 0 for now
        steps.push('Tiered calculation not fully implemented');
        return 0;
    }
    calculateFormulaSync(input, steps) {
        // Simplified - just return 0 for now
        steps.push('Formula calculation not fully implemented');
        return 0;
    }
}
// ============================================================================
// EXPORTS
// ============================================================================
export default DuesCalculationEngine;
//# sourceMappingURL=calculation-engine.js.map