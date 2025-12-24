/**
 * Reconciliation Engine
 * Auto-matches remittance records with dues transactions
 * Detects variances and manages dispute workflow
 */
/**
 * Reconciliation Engine Class
 */
export class ReconciliationEngine {
    constructor(toleranceAmount = 0.01, tolerancePercentage = 0.5) {
        this.toleranceAmount = toleranceAmount;
        this.tolerancePercentage = tolerancePercentage;
    }
    /**
     * Main reconciliation method
     */
    async reconcile(input) {
        const toleranceAmount = input.toleranceAmount ?? this.toleranceAmount;
        const tolerancePercentage = input.tolerancePercentage ?? this.tolerancePercentage;
        const matches = [];
        const variances = [];
        const unmatchedRemittances = [];
        const unmatchedTransactions = [...input.existingTransactions];
        // Filter transactions that haven't been matched yet
        const availableTransactions = unmatchedTransactions.filter((t) => !t.remittanceId || t.remittanceId === input.remittanceId);
        // Try to match each remittance record
        for (const remRecord of input.remittanceRecords) {
            const match = this.findBestMatch(remRecord, availableTransactions, toleranceAmount, tolerancePercentage);
            if (match) {
                matches.push(match);
                // Remove matched transaction from available pool
                const matchIndex = availableTransactions.findIndex((t) => t.id === match.transactionId);
                if (matchIndex !== -1) {
                    availableTransactions.splice(matchIndex, 1);
                }
                // Check for variance
                if (Math.abs(match.amountVariance) > toleranceAmount) {
                    const transaction = input.existingTransactions.find((t) => t.id === match.transactionId);
                    variances.push({
                        type: match.amountVariance > 0 ? 'overpayment' : 'underpayment',
                        remittanceLineNumber: match.remittanceLineNumber,
                        transactionId: match.transactionId,
                        memberId: transaction?.memberId,
                        employeeId: remRecord.employeeId,
                        expectedAmount: transaction?.amount || 0,
                        actualAmount: remRecord.duesAmount,
                        varianceAmount: match.amountVariance,
                        variancePercentage: transaction?.amount
                            ? (Math.abs(match.amountVariance) / transaction.amount) * 100
                            : 0,
                        description: `${match.amountVariance > 0 ? 'Over' : 'Under'}payment of $${Math.abs(match.amountVariance).toFixed(2)}`,
                    });
                }
            }
            else {
                // No match found
                unmatchedRemittances.push(remRecord);
                variances.push({
                    type: 'unmatched_remittance',
                    remittanceLineNumber: remRecord.rawLineNumber,
                    employeeId: remRecord.employeeId,
                    expectedAmount: 0,
                    actualAmount: remRecord.duesAmount,
                    varianceAmount: remRecord.duesAmount,
                    variancePercentage: 100,
                    description: `Remittance record for employee ${remRecord.employeeId} has no matching transaction`,
                });
            }
        }
        // Report unmatched transactions
        for (const transaction of availableTransactions) {
            variances.push({
                type: 'missing_transaction',
                transactionId: transaction.id,
                memberId: transaction.memberId,
                expectedAmount: transaction.amount,
                actualAmount: 0,
                varianceAmount: -transaction.amount,
                variancePercentage: 100,
                description: `Transaction ${transaction.id} not found in remittance`,
            });
        }
        // Calculate summary
        const totalRemittanceAmount = input.remittanceRecords.reduce((sum, r) => sum + r.duesAmount, 0);
        const totalTransactionAmount = input.existingTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalVariance = totalRemittanceAmount - totalTransactionAmount;
        const autoMatchRate = input.remittanceRecords.length > 0
            ? (matches.length / input.remittanceRecords.length) * 100
            : 0;
        return {
            success: variances.length === 0,
            remittanceId: input.remittanceId,
            summary: {
                totalRemittanceAmount,
                totalTransactionAmount,
                totalVariance,
                matchedCount: matches.length,
                unmatchedRemittanceCount: unmatchedRemittances.length,
                unmatchedTransactionCount: availableTransactions.length,
                varianceCount: variances.length,
                autoMatchRate,
            },
            matches,
            variances,
            unmatchedRemittances,
            unmatchedTransactions: availableTransactions,
        };
    }
    /**
     * Find best matching transaction for a remittance record
     */
    findBestMatch(remRecord, transactions, toleranceAmount, tolerancePercentage) {
        let bestMatch = null;
        let highestConfidence = 0;
        for (const transaction of transactions) {
            const match = this.scoreMatch(remRecord, transaction, toleranceAmount, tolerancePercentage);
            if (match && match.confidence > highestConfidence) {
                bestMatch = match;
                highestConfidence = match.confidence;
            }
        }
        // Only return match if confidence is above threshold (50%)
        return bestMatch && bestMatch.confidence >= 50 ? bestMatch : null;
    }
    /**
     * Score how well a transaction matches a remittance record
     */
    scoreMatch(remRecord, transaction, toleranceAmount, tolerancePercentage) {
        let confidence = 0;
        let matchType = 'fuzzy';
        // Check member ID match (if available)
        const memberIdMatch = this.checkMemberIdMatch(remRecord, transaction);
        if (memberIdMatch === true) {
            confidence += 40; // Strong signal
        }
        else if (memberIdMatch === false) {
            return null; // Definite mismatch
        }
        // If memberIdMatch is null (no member number in remittance), continue with other checks
        // Check period match
        const periodMatch = this.checkPeriodMatch(remRecord, transaction);
        if (periodMatch) {
            confidence += 30;
        }
        else {
            // Partial credit for overlapping periods
            if (this.checkPeriodOverlap(remRecord, transaction)) {
                confidence += 15;
            }
        }
        // Check amount match
        const amountVariance = remRecord.duesAmount - transaction.amount;
        const amountVariancePercentage = (Math.abs(amountVariance) / transaction.amount) * 100;
        if (Math.abs(amountVariance) <= toleranceAmount) {
            confidence += 30; // Exact match within tolerance
            matchType = 'exact';
        }
        else if (amountVariancePercentage <= tolerancePercentage) {
            confidence += 20; // Close match within percentage tolerance
        }
        else if (amountVariancePercentage <= 5) {
            confidence += 10; // Within 5%
        }
        else if (amountVariancePercentage > 20) {
            return null; // Too far off
        }
        return {
            transactionId: transaction.id,
            remittanceLineNumber: remRecord.rawLineNumber || 0,
            matchType,
            confidence,
            amountVariance,
            memberIdMatch: memberIdMatch === true,
            periodMatch,
        };
    }
    /**
     * Check if member IDs match
     * Returns: true (match), false (mismatch), null (cannot determine)
     */
    checkMemberIdMatch(remRecord, transaction) {
        if (!remRecord.memberNumber && !remRecord.employeeId) {
            return null; // Cannot determine
        }
        // Try member number first
        if (remRecord.memberNumber) {
            // Normalize and compare
            const remMemberNumber = this.normalizeMemberId(remRecord.memberNumber);
            const transMemberId = this.normalizeMemberId(transaction.memberId);
            if (remMemberNumber === transMemberId) {
                return true;
            }
        }
        // Try employee ID as fallback
        if (remRecord.employeeId) {
            const remEmployeeId = this.normalizeMemberId(remRecord.employeeId);
            const transMemberId = this.normalizeMemberId(transaction.memberId);
            if (remEmployeeId === transMemberId) {
                return true;
            }
        }
        // If we have an ID but it doesn't match, return false
        return false;
    }
    /**
     * Check if billing periods match exactly
     */
    checkPeriodMatch(remRecord, transaction) {
        return (this.isSameDay(remRecord.billingPeriodStart, transaction.periodStart) &&
            this.isSameDay(remRecord.billingPeriodEnd, transaction.periodEnd));
    }
    /**
     * Check if billing periods overlap
     */
    checkPeriodOverlap(remRecord, transaction) {
        return (remRecord.billingPeriodStart <= transaction.periodEnd &&
            remRecord.billingPeriodEnd >= transaction.periodStart);
    }
    /**
     * Normalize member ID for comparison (remove spaces, dashes, leading zeros)
     */
    normalizeMemberId(id) {
        return id.replace(/[\s-]/g, '').replace(/^0+/, '').toLowerCase();
    }
    /**
     * Check if two dates are the same day
     */
    isSameDay(date1, date2) {
        return (date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate());
    }
    /**
     * Generate human-readable reconciliation report
     */
    generateReport(result) {
        const lines = [];
        lines.push('=== REMITTANCE RECONCILIATION REPORT ===');
        lines.push('');
        lines.push(`Remittance ID: ${result.remittanceId}`);
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push('');
        lines.push('--- SUMMARY ---');
        lines.push(`Total Remittance Amount: $${result.summary.totalRemittanceAmount.toFixed(2)}`);
        lines.push(`Total Transaction Amount: $${result.summary.totalTransactionAmount.toFixed(2)}`);
        lines.push(`Net Variance: $${result.summary.totalVariance.toFixed(2)}`);
        lines.push('');
        lines.push(`Matched Records: ${result.summary.matchedCount}`);
        lines.push(`Auto-Match Rate: ${result.summary.autoMatchRate.toFixed(1)}%`);
        lines.push(`Unmatched Remittance Records: ${result.summary.unmatchedRemittanceCount}`);
        lines.push(`Unmatched Transactions: ${result.summary.unmatchedTransactionCount}`);
        lines.push(`Total Variances: ${result.summary.varianceCount}`);
        lines.push('');
        if (result.variances.length > 0) {
            lines.push('--- VARIANCES ---');
            for (const variance of result.variances) {
                lines.push(`${variance.type.toUpperCase()}: ${variance.description}`);
                lines.push(`  Expected: $${variance.expectedAmount.toFixed(2)}`);
                lines.push(`  Actual: $${variance.actualAmount.toFixed(2)}`);
                lines.push(`  Variance: $${variance.varianceAmount.toFixed(2)} (${variance.variancePercentage.toFixed(1)}%)`);
                lines.push('');
            }
        }
        if (result.matches.length > 0) {
            lines.push('--- MATCHES ---');
            for (const match of result.matches) {
                lines.push(`Transaction ${match.transactionId} matched to line ${match.remittanceLineNumber}`);
                lines.push(`  Match Type: ${match.matchType}`);
                lines.push(`  Confidence: ${match.confidence}%`);
                lines.push(`  Amount Variance: $${match.amountVariance.toFixed(2)}`);
                lines.push('');
            }
        }
        lines.push('=== END OF REPORT ===');
        return lines.join('\n');
    }
}
export default ReconciliationEngine;
//# sourceMappingURL=reconciliation-engine.js.map