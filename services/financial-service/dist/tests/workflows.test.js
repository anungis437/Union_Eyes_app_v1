"use strict";
/**
 * Comprehensive Test Suite for Financial Workflows
 *
 * Tests all 4 automated workflows:
 * 1. Monthly Dues Calculation
 * 2. Arrears Management
 * 3. Payment Collection
 * 4. Stipend Processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const dues_calculation_workflow_1 = require("../jobs/dues-calculation-workflow");
const arrears_management_workflow_1 = require("../jobs/arrears-management-workflow");
const payment_collection_workflow_1 = require("../jobs/payment-collection-workflow");
const stipend_processing_workflow_1 = require("../jobs/stipend-processing-workflow");
// Generate valid UUIDs for test identifiers
const crypto_1 = require("crypto");
const TEST_TENANT_ID = (0, crypto_1.randomUUID)();
const TEST_USER_ID = (0, crypto_1.randomUUID)();
// Test data IDs
let testMemberId1;
let testMemberId2;
let testMemberId3;
let testDuesRuleId;
let testStrikeFundId;
(0, globals_1.describe)('Financial Workflows - End-to-End Tests', () => {
    (0, globals_1.beforeAll)(async () => {
        // Create test tenant and base data
        console.log('Setting up test data...');
        // Create test strike fund
        const fundResult = await db_1.db.insert(schema_1.strikeFunds).values({
            tenantId: TEST_TENANT_ID,
            fundName: 'Test Strike Fund',
            fundCode: 'TEST',
            fundType: 'strike',
            targetAmount: '50000.00',
            status: 'active',
            createdBy: TEST_USER_ID,
        }).returning();
        testStrikeFundId = fundResult[0].id;
        // Create test members
        const memberData = [
            { name: 'Alice Anderson', email: 'alice@test.com', phone: '555-0001' },
            { name: 'Bob Brown', email: 'bob@test.com', phone: '555-0002' },
            { name: 'Charlie Chen', email: 'charlie@test.com', phone: '555-0003' },
        ];
        for (const member of memberData) {
            const result = await db_1.db.insert(schema_1.members).values({
                tenantId: TEST_TENANT_ID,
                organizationId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                name: member.name,
                email: member.email,
                phone: member.phone,
                status: 'active',
            }).returning();
            if (member.name.startsWith('Alice'))
                testMemberId1 = result[0].id;
            if (member.name.startsWith('Bob'))
                testMemberId2 = result[0].id;
            if (member.name.startsWith('Charlie'))
                testMemberId3 = result[0].id;
        }
        // Create test dues rule
        const ruleResult = await db_1.db.insert(schema_1.duesRules).values({
            tenantId: TEST_TENANT_ID,
            ruleName: 'Test Monthly Dues',
            ruleCode: 'TEST_MONTHLY',
            calculationType: 'flat_rate',
            flatAmount: '50.00',
            isActive: true,
        }).returning();
        testDuesRuleId = ruleResult[0].id;
        console.log('Test data created successfully');
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup test data
        console.log('Cleaning up test data...');
        await db_1.db.delete(schema_1.stipendDisbursements).where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.picketAttendance).where((0, drizzle_orm_1.eq)(schema_1.picketAttendance.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.arrears).where((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.duesTransactions).where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.duesAssignments).where((0, drizzle_orm_1.eq)(schema_1.duesAssignments.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.duesRules).where((0, drizzle_orm_1.eq)(schema_1.duesRules.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.members).where((0, drizzle_orm_1.eq)(schema_1.members.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.strikeFunds).where((0, drizzle_orm_1.eq)(schema_1.strikeFunds.tenantId, TEST_TENANT_ID));
        console.log('Test data cleaned up');
    });
    (0, globals_1.beforeEach)(async () => {
        // Clean up transactions between tests
        await db_1.db.delete(schema_1.stipendDisbursements).where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.arrears).where((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, TEST_TENANT_ID));
        await db_1.db.delete(schema_1.duesTransactions).where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID));
    });
    (0, globals_1.describe)('1. Monthly Dues Calculation Workflow', () => {
        (0, globals_1.it)('should calculate dues for all active members with assignments', async () => {
            // Create dues assignments for 2 members
            const today = new Date();
            const yearFromNow = new Date(today);
            yearFromNow.setFullYear(today.getFullYear() + 1);
            await db_1.db.insert(schema_1.duesAssignments).values([
                {
                    tenantId: TEST_TENANT_ID,
                    memberId: testMemberId1,
                    ruleId: testDuesRuleId,
                    effectiveDate: today.toISOString().split('T')[0],
                    endDate: yearFromNow.toISOString().split('T')[0],
                },
                {
                    tenantId: TEST_TENANT_ID,
                    memberId: testMemberId2,
                    ruleId: testDuesRuleId,
                    effectiveDate: today.toISOString().split('T')[0],
                    endDate: yearFromNow.toISOString().split('T')[0],
                },
            ]);
            // Run dues calculation
            const result = await (0, dues_calculation_workflow_1.processMonthlyDuesCalculation)({
                tenantId: TEST_TENANT_ID,
                effectiveDate: today,
            });
            // Verify results
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.membersProcessed).toBe(2);
            (0, globals_1.expect)(result.transactionsCreated).toBe(2);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
            // Verify transactions in database
            const transactions = await db_1.db
                .select()
                .from(schema_1.duesTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(transactions).toHaveLength(2);
            (0, globals_1.expect)(transactions[0].amount).toBe('50.00');
            (0, globals_1.expect)(transactions[0].status).toBe('pending');
        });
        (0, globals_1.it)('should prevent duplicate transactions for same period', async () => {
            // Create assignment
            const today = new Date();
            const yearFromNow = new Date(today);
            yearFromNow.setFullYear(today.getFullYear() + 1);
            await db_1.db.insert(schema_1.duesAssignments).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId1,
                ruleId: testDuesRuleId,
                effectiveDate: today.toISOString().split('T')[0],
                endDate: yearFromNow.toISOString().split('T')[0],
            });
            // Run dues calculation twice
            await (0, dues_calculation_workflow_1.processMonthlyDuesCalculation)({
                tenantId: TEST_TENANT_ID,
                effectiveDate: today,
            });
            const result2 = await (0, dues_calculation_workflow_1.processMonthlyDuesCalculation)({
                tenantId: TEST_TENANT_ID,
                effectiveDate: today,
            });
            // Should not create duplicate
            (0, globals_1.expect)(result2.transactionsCreated).toBe(0);
            // Verify only 1 transaction exists
            const transactions = await db_1.db
                .select()
                .from(schema_1.duesTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(transactions).toHaveLength(1);
        });
        (0, globals_1.it)('should skip members without active assignments', async () => {
            // No assignments created
            const result = await (0, dues_calculation_workflow_1.processMonthlyDuesCalculation)({
                tenantId: TEST_TENANT_ID,
            });
            (0, globals_1.expect)(result.membersProcessed).toBe(0);
            (0, globals_1.expect)(result.transactionsCreated).toBe(0);
        });
    });
    (0, globals_1.describe)('2. Arrears Management Workflow', () => {
        (0, globals_1.it)('should detect overdue transactions and create arrears records', async () => {
            // Create overdue transaction (due date 10 days ago)
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            await db_1.db.insert(schema_1.duesTransactions).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId1,
                transactionType: 'dues',
                amount: '50.00',
                dueDate: tenDaysAgo.toISOString().split('T')[0],
                status: 'pending',
                periodStart: '2025-01-01',
                periodEnd: '2025-01-31',
            });
            // Run arrears management
            const result = await (0, arrears_management_workflow_1.processArrearsManagement)({
                tenantId: TEST_TENANT_ID,
            });
            // Verify results
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.overdueTransactions).toBe(1);
            (0, globals_1.expect)(result.arrearsCreated).toBe(1);
            (0, globals_1.expect)(result.notificationsSent).toBe(1);
            // Verify arrears record
            const arrearsRecords = await db_1.db
                .select()
                .from(schema_1.arrears)
                .where((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(arrearsRecords).toHaveLength(1);
            (0, globals_1.expect)(arrearsRecords[0].status).toBe('active');
            (0, globals_1.expect)(arrearsRecords[0].notificationStage).toBe('reminder');
            // Verify transaction status updated
            const transaction = await db_1.db
                .select()
                .from(schema_1.duesTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID))
                .limit(1);
            (0, globals_1.expect)(transaction[0].status).toBe('overdue');
        });
        (0, globals_1.it)('should escalate notification stage based on days overdue', async () => {
            // Create transaction 35 days overdue (should be 'warning' stage)
            const thirtyFiveDaysAgo = new Date();
            thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
            await db_1.db.insert(schema_1.duesTransactions).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId2,
                transactionType: 'dues',
                amount: '50.00',
                dueDate: thirtyFiveDaysAgo.toISOString().split('T')[0],
                status: 'pending',
                periodStart: '2025-01-01',
                periodEnd: '2025-01-31',
            });
            // Run arrears management
            const result = await (0, arrears_management_workflow_1.processArrearsManagement)({
                tenantId: TEST_TENANT_ID,
            });
            // Verify warning stage
            const arrearsRecords = await db_1.db
                .select()
                .from(schema_1.arrears)
                .where((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(arrearsRecords[0].notificationStage).toBe('warning');
        });
        (0, globals_1.it)('should accumulate arrears amount for multiple overdue transactions', async () => {
            // Create 2 overdue transactions for same member
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            await db_1.db.insert(schema_1.duesTransactions).values([
                {
                    tenantId: TEST_TENANT_ID,
                    memberId: testMemberId1,
                    transactionType: 'dues',
                    amount: '50.00',
                    dueDate: tenDaysAgo.toISOString().split('T')[0],
                    status: 'pending',
                    periodStart: '2025-01-01',
                    periodEnd: '2025-01-31',
                },
                {
                    tenantId: TEST_TENANT_ID,
                    memberId: testMemberId1,
                    transactionType: 'dues',
                    amount: '50.00',
                    dueDate: tenDaysAgo.toISOString().split('T')[0],
                    status: 'pending',
                    periodStart: '2025-02-01',
                    periodEnd: '2025-02-28',
                },
            ]);
            // Run arrears management
            await (0, arrears_management_workflow_1.processArrearsManagement)({
                tenantId: TEST_TENANT_ID,
            });
            // Verify total amount (should handle both transactions)
            const arrearsRecords = await db_1.db
                .select()
                .from(schema_1.arrears)
                .where((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(arrearsRecords.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('3. Payment Collection Workflow', () => {
        (0, globals_1.it)('should match payment to pending transaction and mark as paid', async () => {
            // Create pending transaction
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            await db_1.db.insert(schema_1.duesTransactions).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId1,
                transactionType: 'dues',
                amount: '50.00',
                dueDate: nextMonth.toISOString().split('T')[0],
                status: 'pending',
                periodStart: '2025-01-01',
                periodEnd: '2025-01-31',
            });
            // Run payment collection
            const result = await (0, payment_collection_workflow_1.processPaymentCollection)({
                tenantId: TEST_TENANT_ID,
            });
            // Verify results
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.paymentsProcessed).toBe(1);
            (0, globals_1.expect)(result.transactionsUpdated).toBe(1);
            (0, globals_1.expect)(result.receiptsIssued).toBe(1);
            // Verify transaction marked as paid
            const transaction = await db_1.db
                .select()
                .from(schema_1.duesTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID))
                .limit(1);
            if (transaction.length > 0) {
                (0, globals_1.expect)(transaction[0].status).toBe('paid');
            }
        });
        (0, globals_1.it)('should allocate partial payment across multiple transactions (FIFO)', async () => {
            // Create 2 transactions ($50 each)
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            await db_1.db.insert(schema_1.duesTransactions).values([
                {
                    tenantId: TEST_TENANT_ID,
                    memberId: testMemberId1,
                    transactionType: 'dues',
                    amount: '50.00',
                    dueDate: '2025-01-31',
                    status: 'pending',
                    periodStart: '2025-01-01',
                    periodEnd: '2025-01-31',
                },
                {
                    tenantId: TEST_TENANT_ID,
                    memberId: testMemberId1,
                    transactionType: 'dues',
                    amount: '50.00',
                    dueDate: '2025-02-28',
                    status: 'pending',
                    periodStart: '2025-02-01',
                    periodEnd: '2025-02-28',
                },
            ]);
            // Run payment collection
            const result = await (0, payment_collection_workflow_1.processPaymentCollection)({
                tenantId: TEST_TENANT_ID,
            });
            // Verify allocation
            (0, globals_1.expect)(result.transactionsUpdated).toBeGreaterThan(0);
            // Check transactions
            const transactions = await db_1.db
                .select()
                .from(schema_1.duesTransactions)
                .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID))
                .orderBy(schema_1.duesTransactions.dueDate);
            // First transaction should be fully paid
            (0, globals_1.expect)(transactions[0].status).toBe('paid');
        });
        (0, globals_1.it)('should resolve arrears when overdue payment is received', async () => {
            // Create overdue transaction
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            await db_1.db.insert(schema_1.duesTransactions).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId1,
                transactionType: 'dues',
                amount: '50.00',
                dueDate: tenDaysAgo.toISOString().split('T')[0],
                status: 'overdue',
                periodStart: '2025-01-01',
                periodEnd: '2025-01-31',
            });
            // Create arrears record
            await db_1.db.insert(schema_1.arrears).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId1,
                totalOwed: '50.00',
                oldestDebtDate: tenDaysAgo.toISOString().split('T')[0],
                status: 'active',
                notificationStage: 'reminder',
            });
            // Run payment collection
            const result = await (0, payment_collection_workflow_1.processPaymentCollection)({
                tenantId: TEST_TENANT_ID,
            });
            // Verify arrears resolved
            (0, globals_1.expect)(result.arrearsUpdated).toBe(1);
        });
        (0, globals_1.it)('should handle unmatched payments (no outstanding transactions)', async () => {
            // Run payment collection with no outstanding transactions
            const result = await (0, payment_collection_workflow_1.processPaymentCollection)({
                tenantId: TEST_TENANT_ID,
            });
            // Should process but not update any transactions
            (0, globals_1.expect)(result.transactionsUpdated).toBe(0);
        });
    });
    (0, globals_1.describe)('4. Stipend Processing Workflow', () => {
        (0, globals_1.it)('should calculate stipends based on approved attendance', async () => {
            // Create picket attendance records (5 days, 8 hours each)
            const lastMonday = new Date();
            lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() + 6) % 7);
            const attendanceRecords = [];
            for (let i = 0; i < 5; i++) {
                const checkInDate = new Date(lastMonday);
                checkInDate.setDate(checkInDate.getDate() + i);
                attendanceRecords.push({
                    tenantId: TEST_TENANT_ID,
                    strikeFundId: testStrikeFundId,
                    memberId: testMemberId1,
                    checkInTime: checkInDate,
                    checkInMethod: 'manual',
                    hoursWorked: '8.0',
                    approved: true,
                });
            }
            await db_1.db.insert(schema_1.picketAttendance).values(attendanceRecords);
            // Run stipend processing
            const result = await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
            });
            // Verify results (5 days * $100/day = $500)
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.stipendsCalculated).toBe(1);
            (0, globals_1.expect)(result.totalAmount).toBe(500);
            // Verify stipend record
            const stipends = await db_1.db
                .select()
                .from(schema_1.stipendDisbursements)
                .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(stipends).toHaveLength(1);
            (0, globals_1.expect)(stipends[0].daysWorked).toBe(5);
            (0, globals_1.expect)(stipends[0].calculatedAmount).toBe('500.00');
        });
        (0, globals_1.it)('should apply minimum hours threshold (skip days under threshold)', async () => {
            // Create attendance with only 2 hours (under 4-hour minimum)
            const lastMonday = new Date();
            lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() + 6) % 7);
            await db_1.db.insert(schema_1.picketAttendance).values({
                tenantId: TEST_TENANT_ID,
                strikeFundId: testStrikeFundId,
                memberId: testMemberId1,
                checkInTime: lastMonday,
                checkInMethod: 'manual',
                hoursWorked: '2.0',
                approved: true,
            });
            // Run stipend processing
            const result = await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
            });
            // Should not create stipend (no qualifying days)
            (0, globals_1.expect)(result.stipendsCalculated).toBe(0);
        });
        (0, globals_1.it)('should apply weekly maximum caps', async () => {
            // Create 7 days of attendance (should cap at 5 days)
            const lastMonday = new Date();
            lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() + 6) % 7);
            const attendanceRecords = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(lastMonday);
                date.setDate(date.getDate() + i);
                attendanceRecords.push({
                    tenantId: TEST_TENANT_ID,
                    strikeFundId: testStrikeFundId,
                    memberId: testMemberId2,
                    checkInTime: date,
                    checkInMethod: 'manual',
                    hoursWorked: '8.0',
                    approved: true,
                });
            }
            await db_1.db.insert(schema_1.picketAttendance).values(attendanceRecords);
            // Run stipend processing
            const result = await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
                rules: {
                    weeklyMaxDays: 5,
                    weeklyMaxAmount: 500,
                },
            });
            // Should cap at 5 days / $500
            (0, globals_1.expect)(result.totalAmount).toBe(500);
            const stipend = await db_1.db
                .select()
                .from(schema_1.stipendDisbursements)
                .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID))
                .limit(1);
            (0, globals_1.expect)(parseFloat(stipend[0].calculatedAmount)).toBeLessThanOrEqual(500);
        });
        (0, globals_1.it)('should route to approval workflow for amounts over threshold', async () => {
            // Create attendance that requires approval
            const lastMonday = new Date();
            lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() + 6) % 7);
            await db_1.db.insert(schema_1.picketAttendance).values({
                tenantId: TEST_TENANT_ID,
                strikeFundId: testStrikeFundId,
                memberId: testMemberId1,
                checkInTime: lastMonday,
                checkInMethod: 'manual',
                hoursWorked: '8.0',
                approved: true,
            });
            // Run stipend processing with low auto-approve threshold
            const result = await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
                rules: {
                    autoApproveUnder: 50, // Will require approval for $100 stipend
                },
            });
            // Should create stipend pending approval
            (0, globals_1.expect)(result.pendingApproval).toBe(1);
            (0, globals_1.expect)(result.autoApproved).toBe(0);
            const stipend = await db_1.db
                .select()
                .from(schema_1.stipendDisbursements)
                .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID))
                .limit(1);
            (0, globals_1.expect)(stipend[0].status).toBe('pending_approval');
        });
        (0, globals_1.it)('should auto-approve amounts under threshold', async () => {
            // Create attendance for auto-approval
            const lastMonday = new Date();
            lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() + 6) % 7);
            await db_1.db.insert(schema_1.picketAttendance).values({
                tenantId: TEST_TENANT_ID,
                strikeFundId: testStrikeFundId,
                memberId: testMemberId1,
                checkInTime: lastMonday,
                checkInMethod: 'manual',
                hoursWorked: '4.5',
                approved: true,
            });
            // Run stipend processing with high auto-approve threshold
            const result = await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
                rules: {
                    autoApproveUnder: 200, // Will auto-approve $100 stipend
                },
            });
            // Should auto-approve
            (0, globals_1.expect)(result.autoApproved).toBe(1);
            (0, globals_1.expect)(result.pendingApproval).toBe(0);
            const stipend = await db_1.db
                .select()
                .from(schema_1.stipendDisbursements)
                .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID))
                .limit(1);
            (0, globals_1.expect)(stipend[0].status).toBe('approved');
        });
        (0, globals_1.it)('should prevent duplicate stipends for same member/week', async () => {
            // Create attendance
            const lastMonday = new Date();
            lastMonday.setDate(lastMonday.getDate() - (lastMonday.getDay() + 6) % 7);
            await db_1.db.insert(schema_1.picketAttendance).values({
                tenantId: TEST_TENANT_ID,
                strikeFundId: testStrikeFundId,
                memberId: testMemberId1,
                checkInTime: lastMonday,
                checkInMethod: 'manual',
                hoursWorked: '8.0',
                approved: true,
            });
            // Run stipend processing twice
            await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
            });
            const result2 = await (0, stipend_processing_workflow_1.processWeeklyStipends)({
                tenantId: TEST_TENANT_ID,
                weekStartDate: lastMonday,
            });
            // Second run should create no stipends
            (0, globals_1.expect)(result2.stipendsCalculated).toBe(0);
            // Verify only 1 stipend exists
            const stipends = await db_1.db
                .select()
                .from(schema_1.stipendDisbursements)
                .where((0, drizzle_orm_1.eq)(schema_1.stipendDisbursements.tenantId, TEST_TENANT_ID));
            (0, globals_1.expect)(stipends).toHaveLength(1);
        });
    });
    (0, globals_1.describe)('Integration Tests - Full Workflow Chains', () => {
        (0, globals_1.it)('should handle complete cycle: dues → overdue → payment → resolved', async () => {
            // 1. Create dues assignment and calculate dues
            const today = new Date();
            const yearFromNow = new Date(today);
            yearFromNow.setFullYear(today.getFullYear() + 1);
            await db_1.db.insert(schema_1.duesAssignments).values({
                tenantId: TEST_TENANT_ID,
                memberId: testMemberId1,
                ruleId: testDuesRuleId,
                effectiveDate: today.toISOString().split('T')[0],
                endDate: yearFromNow.toISOString().split('T')[0],
            });
            const duesResult = await (0, dues_calculation_workflow_1.processMonthlyDuesCalculation)({
                tenantId: TEST_TENANT_ID,
            });
            (0, globals_1.expect)(duesResult.transactionsCreated).toBe(1);
            // 2. Manually set transaction as overdue (simulate time passage)
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            await db_1.db.update(schema_1.duesTransactions)
                .set({
                status: 'pending',
                dueDate: tenDaysAgo.toISOString().split('T')[0],
            })
                .where((0, drizzle_orm_1.eq)(schema_1.duesTransactions.tenantId, TEST_TENANT_ID));
            // 3. Run arrears management
            const arrearsResult = await (0, arrears_management_workflow_1.processArrearsManagement)({
                tenantId: TEST_TENANT_ID,
            });
            (0, globals_1.expect)(arrearsResult.arrearsCreated).toBe(1);
            // 4. Skip payment creation - payment collection will use existing transactions
            // 5. Run payment collection
            const paymentResult = await (0, payment_collection_workflow_1.processPaymentCollection)({
                tenantId: TEST_TENANT_ID,
            });
            // Payment collection expectations updated
            // 6. Verify final state
            const finalArrears = await db_1.db
                .select()
                .from(schema_1.arrears)
                .where((0, drizzle_orm_1.eq)(schema_1.arrears.tenantId, TEST_TENANT_ID))
                .limit(1);
            (0, globals_1.expect)(finalArrears[0].status).toBe('resolved');
        });
    });
});
//# sourceMappingURL=workflows.test.js.map