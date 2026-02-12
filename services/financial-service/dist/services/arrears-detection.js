"use strict";
/**
 * Arrears Detection Service
 * Automated system to detect overdue payments and create arrears cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectOverduePayments = detectOverduePayments;
exports.calculateLateFees = calculateLateFees;
exports.createArrearsCases = createArrearsCases;
exports.applyLateFees = applyLateFees;
exports.runArrearsDetection = runArrearsDetection;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Detect all overdue transactions and group by member
 */
async function detectOverduePayments(config) {
    const { organizationId, gracePeriodDays = 30 } = config;
    // Calculate cutoff date (today - grace period)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);
    // Query all overdue transactions using raw SQL to match actual database schema
    const overdueTransactions = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT id, member_id, due_date, amount
    FROM dues_transactions
    WHERE organization_id = ${organizationId}
      AND due_date < ${cutoffDate.toISOString()}
      AND status = 'pending'
    ORDER BY due_date ASC
  `);
    // Group by member
    const memberArrears = new Map();
    for (const transaction of overdueTransactions) {
        const memberId = transaction.member_id;
        const existing = memberArrears.get(memberId);
        const dueDate = new Date(transaction.due_date);
        const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = Number(transaction.amount || 0);
        if (existing) {
            existing.transactionIds.push(transaction.id);
            existing.totalOwing += amount;
            existing.transactionCount++;
            if (dueDate < existing.oldestDebtDate) {
                existing.oldestDebtDate = dueDate;
                existing.daysOverdue = daysOverdue;
            }
        }
        else {
            memberArrears.set(memberId, {
                memberId,
                transactionIds: [transaction.id],
                totalOwing: amount,
                oldestDebtDate: dueDate,
                daysOverdue,
                transactionCount: 1,
                suggestedEscalation: determineSuggestedEscalation(daysOverdue, config.escalationThresholds),
            });
        }
    }
    return Array.from(memberArrears.values());
}
/**
 * Calculate late fees for overdue transactions
 */
async function calculateLateFees(transactionId, config) {
    const { lateFeePercentage = 0, lateFeeFixedAmount = 0 } = config;
    const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT amount
    FROM dues_transactions
    WHERE id = ${transactionId}
    LIMIT 1
  `);
    if (!result || result.length === 0) {
        return 0;
    }
    const baseAmount = Number(result[0].amount || 0);
    const percentageFee = (baseAmount * lateFeePercentage) / 100;
    const totalLateFee = percentageFee + lateFeeFixedAmount;
    return Math.round(totalLateFee * 100) / 100;
}
/**
 * Create arrears cases for detected overdue payments
 */
async function createArrearsCases(detectedArrears, organizationId, createdBy) {
    const createdCaseIds = [];
    for (const arrears of detectedArrears) {
        // Check if active case already exists
        const [existingCase] = await db_1.db
            .select()
            .from(db_1.schema.arrearsCases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.organizationId, organizationId), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.memberId, arrears.memberId), (0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.status, 'open')))
            .limit(1);
        if (existingCase) {
            // Update existing case with new transactions
            await db_1.db
                .update(db_1.schema.arrearsCases)
                .set({
                totalOwed: arrears.totalOwing.toString(),
                remainingBalance: arrears.totalOwing.toString(),
                oldestDebtDate: arrears.oldestDebtDate.toISOString().split('T')[0],
                daysOverdue: arrears.daysOverdue.toString(),
                transactionIds: arrears.transactionIds,
                escalationLevel: Math.floor(arrears.daysOverdue / 30).toString(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(db_1.schema.arrearsCases.id, existingCase.id));
            createdCaseIds.push(existingCase.id);
        }
        else {
            // Generate unique case number
            const caseNumber = `ARR-${Date.now()}-${arrears.memberId.substring(0, 8)}`;
            // Create new arrears case
            const [newCase] = await db_1.db
                .insert(db_1.schema.arrearsCases)
                .values({
                organizationId,
                memberId: arrears.memberId,
                caseNumber,
                totalOwed: arrears.totalOwing.toString(),
                remainingBalance: arrears.totalOwing.toString(),
                oldestDebtDate: arrears.oldestDebtDate.toISOString().split('T')[0],
                daysOverdue: arrears.daysOverdue.toString(),
                transactionIds: arrears.transactionIds,
                escalationLevel: Math.floor(arrears.daysOverdue / 30).toString(),
                status: 'open',
                notes: `Auto-generated case: ${arrears.transactionCount} overdue transaction(s), ${arrears.daysOverdue} days overdue`,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            createdCaseIds.push(newCase.id);
        }
    }
    return createdCaseIds;
}
/**
 * Apply late fees to overdue transactions
 */
async function applyLateFees(transactionIds, config) {
    let totalFeesApplied = 0;
    for (const transactionId of transactionIds) {
        const lateFee = await calculateLateFees(transactionId, config);
        if (lateFee > 0) {
            const [transaction] = await db_1.db
                .select({
                totalAmount: db_1.schema.duesTransactions.totalAmount,
            })
                .from(db_1.schema.duesTransactions)
                .where((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.id, transactionId))
                .limit(1);
            if (transaction) {
                const baseAmount = Number(transaction.totalAmount);
                const newTotal = baseAmount + lateFee;
                await db_1.db
                    .update(db_1.schema.duesTransactions)
                    .set({
                    lateFeeAmount: lateFee.toString(),
                    totalAmount: newTotal.toString(),
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(db_1.schema.duesTransactions.id, transactionId));
                totalFeesApplied += lateFee;
            }
        }
    }
    return totalFeesApplied;
}
/**
 * Determine suggested escalation level based on days overdue
 */
function determineSuggestedEscalation(daysOverdue, thresholds) {
    const defaultThresholds = {
        level1Days: 30,
        level2Days: 60,
        level3Days: 90,
        level4Days: 120,
    };
    const t = thresholds || defaultThresholds;
    if (daysOverdue >= t.level4Days) {
        return 'legal_action';
    }
    else if (daysOverdue >= t.level3Days) {
        return 'suspended';
    }
    else if (daysOverdue >= t.level2Days) {
        return 'payment_plan';
    }
    else if (daysOverdue >= t.level1Days) {
        return 'active';
    }
    return 'active';
}
/**
 * Run full arrears detection workflow
 */
async function runArrearsDetection(config, createdBy) {
    // Step 1: Detect all overdue payments
    const detectedArrears = await detectOverduePayments(config);
    if (detectedArrears.length === 0) {
        return {
            detectedCount: 0,
            casesCreated: [],
            totalOwing: 0,
            feesApplied: 0,
        };
    }
    // Step 2: Calculate total owing
    const totalOwing = detectedArrears.reduce((sum, a) => sum + a.totalOwing, 0);
    // Step 3: Apply late fees if configured
    let feesApplied = 0;
    if (config.lateFeePercentage || config.lateFeeFixedAmount) {
        const allTransactionIds = detectedArrears.flatMap((a) => a.transactionIds);
        feesApplied = await applyLateFees(allTransactionIds, config);
    }
    // Step 4: Create or update arrears cases
    const casesCreated = await createArrearsCases(detectedArrears, config.organizationId, createdBy);
    return {
        detectedCount: detectedArrears.length,
        casesCreated,
        totalOwing,
        feesApplied,
    };
}
//# sourceMappingURL=arrears-detection.js.map