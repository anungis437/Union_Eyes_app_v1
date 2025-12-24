"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWeeklyStipends = calculateWeeklyStipends;
exports.createDisbursement = createDisbursement;
exports.approveDisbursement = approveDisbursement;
exports.markDisbursementPaid = markDisbursementPaid;
exports.getMemberDisbursements = getMemberDisbursements;
exports.getPendingDisbursements = getPendingDisbursements;
exports.getStrikeFundDisbursementSummary = getStrikeFundDisbursementSummary;
exports.batchCreateDisbursements = batchCreateDisbursements;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
// Configuration constants
const DEFAULT_MINIMUM_HOURS_PER_WEEK = 20; // Minimum hours to qualify for stipend
const DEFAULT_HOURLY_STIPEND_RATE = 15; // $ per hour
/**
 * Calculate stipends for all eligible members for a given week
 */
async function calculateWeeklyStipends(request) {
    try {
        const { tenantId, strikeFundId, weekStartDate, weekEndDate } = request;
        const minimumHours = request.minimumHours || DEFAULT_MINIMUM_HOURS_PER_WEEK;
        const hourlyRate = request.hourlyRate || DEFAULT_HOURLY_STIPEND_RATE;
        // Get strike fund configuration
        const [strikeFund] = await db_1.db
            .select()
            .from(db_1.schema.strikeFunds)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.strikeFunds.id, strikeFundId), (0, drizzle_orm_1.eq)(db_1.schema.strikeFunds.tenantId, tenantId)))
            .limit(1);
        if (!strikeFund) {
            throw new Error('Strike fund not found');
        }
        // Use fund-specific configuration if available
        const fundMinHours = strikeFund.minimumAttendanceHours
            ? parseFloat(strikeFund.minimumAttendanceHours)
            : minimumHours;
        const fundHourlyRate = strikeFund.weeklyStipendAmount
            ? parseFloat(strikeFund.weeklyStipendAmount) / fundMinHours
            : hourlyRate;
        // Aggregate attendance hours by member for the week
        const attendanceRecords = await db_1.db
            .select({
            memberId: db_1.schema.picketAttendance.memberId,
            totalHours: (0, drizzle_orm_1.sql) `CAST(SUM(CAST(${db_1.schema.picketAttendance.hoursWorked} AS DECIMAL)) AS TEXT)`,
        })
            .from(db_1.schema.picketAttendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.tenantId, tenantId), (0, drizzle_orm_1.eq)(db_1.schema.picketAttendance.strikeFundId, strikeFundId), (0, drizzle_orm_1.between)(db_1.schema.picketAttendance.checkInTime, weekStartDate.toISOString(), weekEndDate.toISOString()), (0, drizzle_orm_1.sql) `${db_1.schema.picketAttendance.checkOutTime} IS NOT NULL` // Only count completed shifts
        ))
            .groupBy(db_1.schema.picketAttendance.memberId);
        // Calculate eligibility for each member
        const eligibilityResults = attendanceRecords.map(record => {
            const hours = parseFloat(record.totalHours || '0');
            const eligible = hours >= fundMinHours;
            const stipendAmount = eligible ? Math.round(hours * fundHourlyRate * 100) / 100 : 0;
            return {
                memberId: record.memberId,
                totalHours: hours,
                eligible,
                stipendAmount,
                reason: eligible
                    ? `Worked ${hours} hours (minimum: ${fundMinHours})`
                    : `Insufficient hours: ${hours} (minimum: ${fundMinHours})`,
            };
        });
        return eligibilityResults;
    }
    catch (error) {
        console.error('Stipend calculation error:', error);
        throw new Error(`Failed to calculate stipends: ${error.message}`);
    }
}
/**
 * Create a pending disbursement record
 */
async function createDisbursement(request) {
    try {
        const [disbursement] = await db_1.db
            .insert(db_1.schema.stipendDisbursements)
            .values({
            tenantId: request.tenantId,
            strikeFundId: request.strikeFundId,
            memberId: request.memberId,
            amount: request.amount.toString(),
            weekStartDate: request.weekStartDate,
            weekEndDate: request.weekEndDate,
            status: 'pending',
            paymentMethod: request.paymentMethod,
            approvedBy: request.approvedBy,
            notes: request.notes,
        })
            .returning();
        return {
            success: true,
            disbursementId: disbursement.id,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to create disbursement',
        };
    }
}
/**
 * Approve a pending disbursement
 */
async function approveDisbursement(tenantId, approval) {
    try {
        const [existing] = await db_1.db
            .select()
            .from(db_1.schema.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.id, approval.disbursementId), (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return { success: false, error: 'Disbursement not found' };
        }
        if (existing.status !== 'pending') {
            return { success: false, error: `Disbursement is already ${existing.status}` };
        }
        await db_1.db
            .update(db_1.schema.stipendDisbursements)
            .set({
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: approval.approvedBy,
            notes: approval.approvalNotes,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.id, approval.disbursementId));
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to approve disbursement',
        };
    }
}
/**
 * Mark a disbursement as paid
 */
async function markDisbursementPaid(tenantId, disbursementId, transactionId, paidBy) {
    try {
        const [existing] = await db_1.db
            .select()
            .from(db_1.schema.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.id, disbursementId), (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            return { success: false, error: 'Disbursement not found' };
        }
        if (existing.status !== 'approved') {
            return { success: false, error: `Disbursement must be approved first (current status: ${existing.status})` };
        }
        await db_1.db
            .update(db_1.schema.stipendDisbursements)
            .set({
            status: 'paid',
            paymentDate: new Date(),
            notes: `Transaction ID: ${transactionId}, Processed by: ${paidBy}`,
        })
            .where((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.id, disbursementId));
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to mark disbursement as paid',
        };
    }
}
/**
 * Get disbursement history for a member
 */
async function getMemberDisbursements(tenantId, memberId, strikeFundId) {
    try {
        const conditions = [
            (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.tenantId, tenantId),
            (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.memberId, memberId),
        ];
        if (strikeFundId) {
            conditions.push((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.strikeFundId, strikeFundId));
        }
        const disbursements = await db_1.db
            .select()
            .from(db_1.schema.stipendDisbursements)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.schema.stipendDisbursements.weekStartDate));
        return disbursements.map(d => ({
            ...d,
            amount: parseFloat(d.totalAmount),
        }));
    }
    catch (error) {
        console.error('Get disbursements error:', error);
        return [];
    }
}
/**
 * Get pending disbursements for approval
 */
async function getPendingDisbursements(tenantId, strikeFundId) {
    try {
        const disbursements = await db_1.db
            .select()
            .from(db_1.schema.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.strikeFundId, strikeFundId), (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.status, 'pending')))
            .orderBy(db_1.schema.stipendDisbursements.weekStartDate);
        return disbursements.map(d => ({
            ...d,
            amount: parseFloat(d.totalAmount),
        }));
    }
    catch (error) {
        console.error('Get pending disbursements error:', error);
        return [];
    }
}
/**
 * Get total disbursed amount for a strike fund
 */
async function getStrikeFundDisbursementSummary(tenantId, strikeFundId) {
    try {
        const result = await db_1.db
            .select({
            status: db_1.schema.stipendDisbursements.status,
            totalAmount: (0, drizzle_orm_1.sql) `CAST(SUM(CAST(${db_1.schema.stipendDisbursements.totalAmount} AS DECIMAL)) AS TEXT)`,
            memberCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${db_1.schema.stipendDisbursements.memberId})`,
        })
            .from(db_1.schema.stipendDisbursements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.tenantId, tenantId), (0, drizzle_orm_1.eq)(db_1.schema.stipendDisbursements.strikeFundId, strikeFundId)))
            .groupBy(db_1.schema.stipendDisbursements.status);
        const summary = {
            totalPending: 0,
            totalApproved: 0,
            totalPaid: 0,
            memberCount: 0,
        };
        result.forEach(row => {
            const amount = parseFloat(row.totalAmount || '0');
            if (row.status === 'pending')
                summary.totalPending = amount;
            if (row.status === 'approved')
                summary.totalApproved = amount;
            if (row.status === 'paid')
                summary.totalPaid = amount;
            summary.memberCount = Math.max(summary.memberCount, row.memberCount);
        });
        return summary;
    }
    catch (error) {
        console.error('Get disbursement summary error:', error);
        return {
            totalPending: 0,
            totalApproved: 0,
            totalPaid: 0,
            memberCount: 0,
        };
    }
}
/**
 * Batch create disbursements for all eligible members
 */
async function batchCreateDisbursements(request) {
    try {
        const eligibility = await calculateWeeklyStipends(request);
        const eligible = eligibility.filter(e => e.eligible);
        const disbursementIds = [];
        const errors = [];
        for (const member of eligible) {
            const result = await createDisbursement({
                tenantId: request.tenantId,
                strikeFundId: request.strikeFundId,
                memberId: member.memberId,
                amount: member.stipendAmount,
                weekStartDate: request.weekStartDate,
                weekEndDate: request.weekEndDate,
                approvedBy: request.approvedBy,
                paymentMethod: request.paymentMethod,
                notes: `Week ${request.weekStartDate.toISOString().split('T')[0]} - ${member.totalHours} hours worked`,
            });
            if (result.success && result.disbursementId) {
                disbursementIds.push(result.disbursementId);
            }
            else {
                errors.push(`${member.memberId}: ${result.error}`);
            }
        }
        return {
            success: true,
            created: disbursementIds.length,
            skipped: eligibility.length - eligible.length,
            disbursementIds,
            errors,
        };
    }
    catch (error) {
        return {
            success: false,
            created: 0,
            skipped: 0,
            disbursementIds: [],
            errors: [error.message],
        };
    }
}
//# sourceMappingURL=stipend-calculation.js.map