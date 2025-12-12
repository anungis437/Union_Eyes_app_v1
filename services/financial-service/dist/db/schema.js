"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duesTransactionsRelations = exports.memberDuesAssignmentsRelations = exports.duesRulesRelations = exports.notificationLog = exports.userNotificationPreferences = exports.notificationTemplates = exports.notificationQueue = exports.notificationTypeEnum = exports.notificationChannelEnum = exports.notificationStatusEnum = exports.donations = exports.donationStatusEnum = exports.stipendDisbursements = exports.picketAttendance = exports.arrears = exports.members = exports.organizationMembers = exports.strikeFunds = exports.checkInMethodEnum = exports.arrearsCases = exports.arrearsStatusDbEnum = exports.employerRemittances = exports.duesTransactions = exports.duesAssignments = exports.memberDuesAssignments = exports.duesRules = exports.arrearsStatusEnum = exports.remittanceStatusEnum = exports.paymentStatusEnum = exports.transactionTypeEnum = exports.billingFrequencyEnum = exports.calculationTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Enums matching database enums
exports.calculationTypeEnum = (0, pg_core_1.pgEnum)('calculation_type', [
    'percentage',
    'flat_rate',
    'hourly',
    'tiered',
    'formula'
]);
exports.billingFrequencyEnum = (0, pg_core_1.pgEnum)('billing_frequency', [
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'annually'
]);
exports.transactionTypeEnum = (0, pg_core_1.pgEnum)('transaction_type', [
    'payment',
    'adjustment',
    'refund',
    'write_off'
]);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)('payment_status', [
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
]);
exports.remittanceStatusEnum = (0, pg_core_1.pgEnum)('remittance_processing_status', [
    'uploaded',
    'processing',
    'matched',
    'discrepancy',
    'completed'
]);
exports.arrearsStatusEnum = (0, pg_core_1.pgEnum)('arrears_status', [
    'active',
    'payment_plan',
    'suspended',
    'legal_action',
    'resolved',
    'written_off'
]);
// Dues Rules Table
exports.duesRules = (0, pg_core_1.pgTable)('dues_rules', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    ruleName: (0, pg_core_1.text)('rule_name').notNull(),
    ruleCode: (0, pg_core_1.text)('rule_code').notNull(),
    description: (0, pg_core_1.text)('description'),
    calculationType: (0, exports.calculationTypeEnum)('calculation_type').notNull(),
    // Percentage-based fields
    percentageRate: (0, pg_core_1.numeric)('percentage_rate', { precision: 5, scale: 2 }),
    baseField: (0, pg_core_1.text)('base_field'), // 'gross_wages', 'base_salary', 'hourly_rate'
    // Flat rate fields
    flatAmount: (0, pg_core_1.numeric)('flat_amount', { precision: 10, scale: 2 }),
    // Hourly-based fields
    hourlyRate: (0, pg_core_1.numeric)('hourly_rate', { precision: 10, scale: 2 }),
    hoursPerPeriod: (0, pg_core_1.numeric)('hours_per_period', { precision: 10, scale: 0 }),
    // Tiered structure
    tierStructure: (0, pg_core_1.jsonb)('tier_structure'), // Array of {minAmount, maxAmount, rate, flatAmount}
    // Custom formula
    customFormula: (0, pg_core_1.text)('custom_formula'),
    // Billing configuration
    billingFrequency: (0, exports.billingFrequencyEnum)('billing_frequency').notNull().default('monthly'),
    // Effective dates
    effectiveDate: (0, pg_core_1.date)('effective_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'),
    // Metadata
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdBy: (0, pg_core_1.text)('created_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('dues_rules_tenant_idx').on(table.tenantId),
    codeIdx: (0, pg_core_1.uniqueIndex)('dues_rules_code_idx').on(table.tenantId, table.ruleCode),
    activeIdx: (0, pg_core_1.index)('dues_rules_active_idx').on(table.tenantId, table.isActive),
}));
// Member Dues Assignments Table
exports.memberDuesAssignments = (0, pg_core_1.pgTable)('member_dues_assignments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    memberId: (0, pg_core_1.uuid)('member_id').notNull(),
    ruleId: (0, pg_core_1.uuid)('rule_id').notNull().references(() => exports.duesRules.id),
    // Override fields
    overrideAmount: (0, pg_core_1.numeric)('override_amount', { precision: 10, scale: 2 }),
    overrideReason: (0, pg_core_1.text)('override_reason'),
    // Status
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    effectiveDate: (0, pg_core_1.date)('effective_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('member_dues_assignments_tenant_idx').on(table.tenantId),
    memberIdx: (0, pg_core_1.index)('member_dues_assignments_member_idx').on(table.memberId),
    ruleIdx: (0, pg_core_1.index)('member_dues_assignments_rule_idx').on(table.ruleId),
    activeIdx: (0, pg_core_1.index)('member_dues_assignments_active_idx').on(table.tenantId, table.isActive),
}));
// Alias for backward compatibility
exports.duesAssignments = exports.memberDuesAssignments;
// Dues Transactions Table
exports.duesTransactions = (0, pg_core_1.pgTable)('dues_transactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    memberId: (0, pg_core_1.uuid)('member_id').notNull(),
    assignmentId: (0, pg_core_1.uuid)('assignment_id').references(() => exports.memberDuesAssignments.id),
    ruleId: (0, pg_core_1.uuid)('rule_id'),
    // Transaction details
    transactionType: (0, pg_core_1.text)('transaction_type').notNull(),
    // Amount fields
    amount: (0, pg_core_1.numeric)('amount', { precision: 10, scale: 2 }).notNull(),
    lateFeeAmount: (0, pg_core_1.numeric)('late_fee_amount', { precision: 10, scale: 2 }).default('0.00'),
    totalAmount: (0, pg_core_1.numeric)('total_amount', { precision: 10, scale: 2 }),
    periodStart: (0, pg_core_1.date)('period_start').notNull(),
    periodEnd: (0, pg_core_1.date)('period_end').notNull(),
    dueDate: (0, pg_core_1.date)('due_date').notNull(),
    // Payment information
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    paymentDate: (0, pg_core_1.timestamp)('payment_date', { withTimezone: true }),
    paidDate: (0, pg_core_1.timestamp)('paid_date', { withTimezone: true }),
    paymentMethod: (0, pg_core_1.text)('payment_method'),
    paymentReference: (0, pg_core_1.text)('payment_reference'),
    // Integration fields
    remittanceId: (0, pg_core_1.uuid)('remittance_id'),
    stripePaymentIntentId: (0, pg_core_1.text)('stripe_payment_intent_id'),
    notes: (0, pg_core_1.text)('notes'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('dues_transactions_tenant_idx').on(table.tenantId),
    memberIdx: (0, pg_core_1.index)('dues_transactions_member_idx').on(table.memberId),
    statusIdx: (0, pg_core_1.index)('dues_transactions_status_idx').on(table.status),
    dueDateIdx: (0, pg_core_1.index)('dues_transactions_due_date_idx').on(table.dueDate),
    periodIdx: (0, pg_core_1.index)('dues_transactions_period_idx').on(table.periodStart, table.periodEnd),
}));
// Employer Remittances Table
exports.employerRemittances = (0, pg_core_1.pgTable)('employer_remittances', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employerName: (0, pg_core_1.text)('employer_name').notNull(),
    employerId: (0, pg_core_1.text)('employer_id'),
    // Remittance details
    batchNumber: (0, pg_core_1.text)('batch_number').notNull(),
    remittanceDate: (0, pg_core_1.date)('remittance_date').notNull(),
    // Period fields (database uses remittance_period_start/end)
    remittancePeriodStart: (0, pg_core_1.date)('remittance_period_start').notNull(),
    remittancePeriodEnd: (0, pg_core_1.date)('remittance_period_end').notNull(),
    periodStart: (0, pg_core_1.date)('remittance_period_start').notNull(), // Alias
    periodEnd: (0, pg_core_1.date)('remittance_period_end').notNull(), // Alias
    billingPeriodStart: (0, pg_core_1.date)('remittance_period_start').notNull(), // Alias for old code
    billingPeriodEnd: (0, pg_core_1.date)('remittance_period_end').notNull(), // Alias for old code
    // Amounts
    totalAmount: (0, pg_core_1.numeric)('total_amount', { precision: 12, scale: 2 }).notNull(),
    remittedAmount: (0, pg_core_1.numeric)('total_amount', { precision: 12, scale: 2 }).notNull(), // Alias
    matchedAmount: (0, pg_core_1.numeric)('matched_amount', { precision: 12, scale: 2 }).default('0'),
    unmatchedAmount: (0, pg_core_1.numeric)('unmatched_amount', { precision: 12, scale: 2 }).default('0'),
    varianceAmount: (0, pg_core_1.numeric)('variance_amount', { precision: 12, scale: 2 }).default('0'),
    totalVariance: (0, pg_core_1.numeric)('variance_amount', { precision: 12, scale: 2 }).default('0'), // Alias
    // Member counts (database uses member_count)
    memberCount: (0, pg_core_1.numeric)('member_count', { precision: 10, scale: 0 }).notNull(),
    totalMembers: (0, pg_core_1.numeric)('member_count', { precision: 10, scale: 0 }).notNull(), // Alias
    expectedMemberCount: (0, pg_core_1.numeric)('expected_member_count', { precision: 6, scale: 0 }),
    actualMemberCount: (0, pg_core_1.numeric)('actual_member_count', { precision: 6, scale: 0 }),
    matchedTransactions: (0, pg_core_1.numeric)('matched_transactions', { precision: 10, scale: 0 }).default('0'),
    // File tracking
    fileUrl: (0, pg_core_1.text)('file_url'),
    fileHash: (0, pg_core_1.text)('file_hash'),
    uploadedFile: (0, pg_core_1.text)('file_url'), // Alias
    reconciliationReport: (0, pg_core_1.text)('reconciliation_report'),
    // Status fields
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    processingStatus: (0, pg_core_1.text)('status').notNull().default('pending'), // Alias for backward compatibility
    reconciliationStatus: (0, pg_core_1.text)('reconciliation_status'),
    reconciliationDate: (0, pg_core_1.timestamp)('reconciliation_date', { withTimezone: true }),
    reconciledAt: (0, pg_core_1.timestamp)('reconciliation_date', { withTimezone: true }), // Alias
    reconciledBy: (0, pg_core_1.text)('reconciled_by'),
    varianceReason: (0, pg_core_1.text)('variance_reason'),
    // Metadata
    uploadedBy: (0, pg_core_1.uuid)('uploaded_by'),
    notes: (0, pg_core_1.text)('notes'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('employer_remittances_tenant_idx').on(table.tenantId),
    employerIdx: (0, pg_core_1.index)('employer_remittances_employer_idx').on(table.employerId),
    batchIdx: (0, pg_core_1.uniqueIndex)('employer_remittances_batch_idx').on(table.tenantId, table.batchNumber),
    statusIdx: (0, pg_core_1.index)('employer_remittances_status_idx').on(table.status),
    periodIdx: (0, pg_core_1.index)('employer_remittances_period_idx').on(table.remittancePeriodStart, table.remittancePeriodEnd),
}));
// Arrears status enum for actual database status values
exports.arrearsStatusDbEnum = (0, pg_core_1.pgEnum)('arrears_status_db', [
    'open',
    'payment_plan',
    'collections',
    'legal',
    'resolved',
    'written_off'
]);
// Arrears Cases Table
exports.arrearsCases = (0, pg_core_1.pgTable)('arrears_cases', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    memberId: (0, pg_core_1.uuid)('member_id').notNull(),
    // Arrears details
    caseNumber: (0, pg_core_1.text)('case_number').notNull(),
    totalOwed: (0, pg_core_1.numeric)('total_owed', { precision: 10, scale: 2 }).notNull(),
    remainingBalance: (0, pg_core_1.numeric)('remaining_balance', { precision: 10, scale: 2 }),
    oldestDebtDate: (0, pg_core_1.date)('oldest_debt_date'),
    daysOverdue: (0, pg_core_1.numeric)('days_overdue', { precision: 5, scale: 0 }),
    transactionIds: (0, pg_core_1.jsonb)('transaction_ids').default('[]'),
    // Status
    status: (0, pg_core_1.text)('status').notNull().default('open'),
    // Payment plan
    paymentPlanId: (0, pg_core_1.uuid)('payment_plan_id'),
    paymentPlanAmount: (0, pg_core_1.numeric)('payment_plan_amount', { precision: 10, scale: 2 }),
    paymentPlanFrequency: (0, pg_core_1.text)('payment_plan_frequency'),
    paymentPlanActive: (0, pg_core_1.boolean)('payment_plan_active').default(false),
    paymentPlanStartDate: (0, pg_core_1.date)('payment_plan_start_date'),
    installmentAmount: (0, pg_core_1.numeric)('installment_amount', { precision: 10, scale: 2 }),
    numberOfInstallments: (0, pg_core_1.numeric)('number_of_installments', { precision: 3, scale: 0 }),
    paymentSchedule: (0, pg_core_1.jsonb)('payment_schedule').default('[]'),
    // Communications
    lastContactDate: (0, pg_core_1.timestamp)('last_contact_date'),
    lastContactMethod: (0, pg_core_1.text)('last_contact_method'),
    nextFollowupDate: (0, pg_core_1.date)('next_followup_date'),
    contactHistory: (0, pg_core_1.jsonb)('contact_history').default('[]'),
    // Escalation
    escalationLevel: (0, pg_core_1.numeric)('escalation_level', { precision: 1, scale: 0 }).default('0'),
    escalationHistory: (0, pg_core_1.jsonb)('escalation_history').default('[]'),
    // Resolution
    resolutionDate: (0, pg_core_1.timestamp)('resolution_date'),
    resolutionType: (0, pg_core_1.text)('resolution_type'),
    resolutionNotes: (0, pg_core_1.text)('resolution_notes'),
    // Metadata
    notes: (0, pg_core_1.text)('notes'),
    metadata: (0, pg_core_1.jsonb)('metadata').default('{}'),
    createdBy: (0, pg_core_1.text)('created_by'),
    updatedBy: (0, pg_core_1.text)('updated_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('arrears_tenant').on(table.tenantId),
    memberIdx: (0, pg_core_1.index)('arrears_member').on(table.memberId),
    statusIdx: (0, pg_core_1.index)('arrears_status').on(table.tenantId, table.status),
    caseIdx: (0, pg_core_1.uniqueIndex)('arrears_case_number').on(table.caseNumber),
}));
// ============================================================================
// STRIKE FUND & PICKET ATTENDANCE
// ============================================================================
exports.checkInMethodEnum = (0, pg_core_1.pgEnum)('check_in_method', [
    'nfc',
    'qr_code',
    'gps',
    'manual'
]);
// Strike Funds Table (matches actual database schema)
exports.strikeFunds = (0, pg_core_1.pgTable)('strike_funds', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    fundName: (0, pg_core_1.text)('fund_name').notNull(),
    fundCode: (0, pg_core_1.text)('fund_code').notNull(),
    description: (0, pg_core_1.text)('description'),
    fundType: (0, pg_core_1.text)('fund_type').notNull(),
    currentBalance: (0, pg_core_1.numeric)('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
    targetAmount: (0, pg_core_1.numeric)('target_amount', { precision: 12, scale: 2 }),
    minimumThreshold: (0, pg_core_1.numeric)('minimum_threshold', { precision: 12, scale: 2 }),
    contributionRate: (0, pg_core_1.numeric)('contribution_rate', { precision: 10, scale: 2 }),
    contributionFrequency: (0, pg_core_1.text)('contribution_frequency'),
    strikeStatus: (0, pg_core_1.text)('strike_status').notNull().default('inactive'),
    strikeStartDate: (0, pg_core_1.date)('strike_start_date'),
    strikeEndDate: (0, pg_core_1.date)('strike_end_date'),
    weeklyStipendAmount: (0, pg_core_1.numeric)('weekly_stipend_amount', { precision: 10, scale: 2 }),
    dailyPicketBonus: (0, pg_core_1.numeric)('daily_picket_bonus', { precision: 8, scale: 2 }),
    minimumAttendanceHours: (0, pg_core_1.numeric)('minimum_attendance_hours', { precision: 4, scale: 2 }).default('4.0'),
    minimumHoursPerWeek: (0, pg_core_1.numeric)('minimum_attendance_hours', { precision: 4, scale: 2 }).default('4.0'), // Alias
    estimatedBurnRate: (0, pg_core_1.numeric)('estimated_burn_rate', { precision: 10, scale: 2 }),
    estimatedDurationWeeks: (0, pg_core_1.numeric)('estimated_duration_weeks', { precision: 10, scale: 0 }),
    fundDepletionDate: (0, pg_core_1.date)('fund_depletion_date'),
    lastPredictionUpdate: (0, pg_core_1.timestamp)('last_prediction_update', { withTimezone: true }),
    acceptsPublicDonations: (0, pg_core_1.boolean)('accepts_public_donations').default(false),
    donationPageUrl: (0, pg_core_1.text)('donation_page_url'),
    fundraisingGoal: (0, pg_core_1.numeric)('fundraising_goal', { precision: 12, scale: 2 }),
    status: (0, pg_core_1.text)('status').default('active'),
    createdBy: (0, pg_core_1.text)('created_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('strike_funds_tenant_idx').on(table.tenantId),
    statusIdx: (0, pg_core_1.index)('strike_funds_status_idx').on(table.tenantId, table.strikeStatus),
}));
// Organization Members Table (represents union members)
exports.organizationMembers = (0, pg_core_1.pgTable)('organization_members', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    organizationId: (0, pg_core_1.text)('organization_id').notNull(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    phone: (0, pg_core_1.text)('phone'),
    role: (0, pg_core_1.text)('role').notNull().default('member'),
    status: (0, pg_core_1.text)('status').notNull().default('active'),
    department: (0, pg_core_1.text)('department'),
    position: (0, pg_core_1.text)('position'),
    hireDate: (0, pg_core_1.timestamp)('hire_date', { withTimezone: true }),
    membershipNumber: (0, pg_core_1.text)('membership_number'),
    seniority: (0, pg_core_1.numeric)('seniority', { precision: 10, scale: 0 }).default('0'),
    unionJoinDate: (0, pg_core_1.timestamp)('union_join_date', { withTimezone: true }),
    preferredContactMethod: (0, pg_core_1.text)('preferred_contact_method'),
    metadata: (0, pg_core_1.text)('metadata'),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('org_members_tenant_idx').on(table.tenantId),
    userIdx: (0, pg_core_1.index)('org_members_user_idx').on(table.userId),
}));
// Alias for convenience - many parts of code reference 'members'
exports.members = exports.organizationMembers;
// Simple Arrears Table (legacy/simpler version)
exports.arrears = (0, pg_core_1.pgTable)('arrears', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    memberId: (0, pg_core_1.uuid)('member_id').notNull(),
    totalOwed: (0, pg_core_1.numeric)('total_owed', { precision: 10, scale: 2 }).notNull().default('0.00'),
    oldestDebtDate: (0, pg_core_1.date)('oldest_debt_date'),
    monthsOverdue: (0, pg_core_1.numeric)('months_overdue', { precision: 10, scale: 0 }).default('0'),
    arrearsStatus: (0, pg_core_1.text)('arrears_status').notNull().default('active'),
    status: (0, pg_core_1.text)('arrears_status').notNull().default('active'), // Alias for code compatibility
    notificationStage: (0, pg_core_1.text)('notification_stage').default('none'),
    transactionId: (0, pg_core_1.uuid)('transaction_id'),
    paymentPlanActive: (0, pg_core_1.boolean)('payment_plan_active').default(false),
    paymentPlanAmount: (0, pg_core_1.numeric)('payment_plan_amount', { precision: 10, scale: 2 }),
    paymentPlanFrequency: (0, pg_core_1.text)('payment_plan_frequency'),
    paymentPlanStartDate: (0, pg_core_1.date)('payment_plan_start_date'),
    paymentPlanEndDate: (0, pg_core_1.date)('payment_plan_end_date'),
    suspensionEffectiveDate: (0, pg_core_1.date)('suspension_effective_date'),
    suspensionReason: (0, pg_core_1.text)('suspension_reason'),
    collectionAgency: (0, pg_core_1.text)('collection_agency'),
    legalActionDate: (0, pg_core_1.date)('legal_action_date'),
    legalReference: (0, pg_core_1.text)('legal_reference'),
    notes: (0, pg_core_1.text)('notes'),
    lastContactDate: (0, pg_core_1.date)('last_contact_date'),
    nextFollowUpDate: (0, pg_core_1.date)('next_follow_up_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('arrears_tenant_idx').on(table.tenantId),
    memberIdx: (0, pg_core_1.index)('arrears_member_idx').on(table.memberId),
    statusIdx: (0, pg_core_1.index)('arrears_status_idx').on(table.arrearsStatus),
}));
// Picket Attendance Table
exports.picketAttendance = (0, pg_core_1.pgTable)('picket_attendance', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    strikeFundId: (0, pg_core_1.uuid)('strike_fund_id').notNull().references(() => exports.strikeFunds.id, { onDelete: 'cascade' }),
    memberId: (0, pg_core_1.uuid)('member_id').notNull(),
    checkInTime: (0, pg_core_1.timestamp)('check_in_time', { withTimezone: true }).notNull(),
    checkOutTime: (0, pg_core_1.timestamp)('check_out_time', { withTimezone: true }),
    // Location tracking
    checkInLatitude: (0, pg_core_1.numeric)('check_in_latitude', { precision: 10, scale: 8 }),
    checkInLongitude: (0, pg_core_1.numeric)('check_in_longitude', { precision: 11, scale: 8 }),
    checkOutLatitude: (0, pg_core_1.numeric)('check_out_latitude', { precision: 10, scale: 8 }),
    checkOutLongitude: (0, pg_core_1.numeric)('check_out_longitude', { precision: 11, scale: 8 }),
    locationVerified: (0, pg_core_1.boolean)('location_verified').default(false),
    // Check-in methods
    checkInMethod: (0, pg_core_1.text)('check_in_method').notNull(),
    nfcTagUid: (0, pg_core_1.text)('nfc_tag_uid'),
    qrCodeData: (0, pg_core_1.text)('qr_code_data'),
    deviceId: (0, pg_core_1.text)('device_id'),
    // Duration tracking
    durationMinutes: (0, pg_core_1.numeric)('duration_minutes'),
    hoursWorked: (0, pg_core_1.numeric)('hours_worked', { precision: 4, scale: 2 }),
    // Approval
    coordinatorOverride: (0, pg_core_1.boolean)('coordinator_override').default(false),
    approved: (0, pg_core_1.boolean)('coordinator_override').default(false), // Alias
    overrideReason: (0, pg_core_1.text)('override_reason'),
    verifiedBy: (0, pg_core_1.text)('verified_by'),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('picket_attendance_tenant_idx').on(table.tenantId),
    fundIdx: (0, pg_core_1.index)('picket_attendance_fund_idx').on(table.strikeFundId),
    memberIdx: (0, pg_core_1.index)('picket_attendance_member_idx').on(table.memberId),
    dateIdx: (0, pg_core_1.index)('picket_attendance_date_idx').on(table.checkInTime),
    methodIdx: (0, pg_core_1.index)('picket_attendance_method_idx').on(table.checkInMethod),
}));
// Stipend Disbursements Table
exports.stipendDisbursements = (0, pg_core_1.pgTable)('stipend_disbursements', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    strikeFundId: (0, pg_core_1.uuid)('strike_fund_id').notNull().references(() => exports.strikeFunds.id, { onDelete: 'cascade' }),
    memberId: (0, pg_core_1.uuid)('member_id').notNull(),
    weekStartDate: (0, pg_core_1.date)('week_start_date').notNull(),
    weekEndDate: (0, pg_core_1.date)('week_end_date').notNull(),
    hoursWorked: (0, pg_core_1.numeric)('hours_worked', { precision: 6, scale: 2 }).notNull(),
    daysWorked: (0, pg_core_1.numeric)('days_worked', { precision: 3, scale: 0 }),
    baseStipendAmount: (0, pg_core_1.numeric)('base_stipend_amount', { precision: 10, scale: 2 }),
    bonusAmount: (0, pg_core_1.numeric)('bonus_amount', { precision: 10, scale: 2 }),
    amount: (0, pg_core_1.numeric)('total_amount', { precision: 10, scale: 2 }).notNull(),
    totalAmount: (0, pg_core_1.numeric)('total_amount', { precision: 10, scale: 2 }).notNull(), // Alias
    calculatedAmount: (0, pg_core_1.numeric)('total_amount', { precision: 10, scale: 2 }).notNull(), // Alias
    approvedAmount: (0, pg_core_1.numeric)('total_amount', { precision: 10, scale: 2 }).notNull(), // Alias
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, approved, paid, processing
    paymentDate: (0, pg_core_1.timestamp)('payment_date', { withTimezone: true }),
    paidAt: (0, pg_core_1.timestamp)('payment_date', { withTimezone: true }), // Alias
    disbursedAt: (0, pg_core_1.timestamp)('payment_date', { withTimezone: true }), // Alias
    paymentMethod: (0, pg_core_1.text)('payment_method'), // direct_deposit, check, cash, paypal
    paymentReference: (0, pg_core_1.text)('payment_reference'),
    approvedBy: (0, pg_core_1.text)('approved_by'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    notes: (0, pg_core_1.text)('notes'),
    approvalNotes: (0, pg_core_1.text)('notes'), // Alias
    transactionId: (0, pg_core_1.uuid)('transaction_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('stipend_disbursements_tenant_idx').on(table.tenantId),
    fundIdx: (0, pg_core_1.index)('stipend_disbursements_fund_idx').on(table.strikeFundId),
    memberIdx: (0, pg_core_1.index)('stipend_disbursements_member_idx').on(table.memberId),
    weekIdx: (0, pg_core_1.index)('stipend_disbursements_week_idx').on(table.weekStartDate, table.weekEndDate),
    statusIdx: (0, pg_core_1.index)('stipend_disbursements_status_idx').on(table.status),
}));
// Donations Table
exports.donationStatusEnum = (0, pg_core_1.pgEnum)('donation_status', [
    'pending',
    'completed',
    'failed',
    'refunded'
]);
exports.donations = (0, pg_core_1.pgTable)('donations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    strikeFundId: (0, pg_core_1.uuid)('strike_fund_id').notNull().references(() => exports.strikeFunds.id, { onDelete: 'cascade' }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)('currency').notNull().default('usd'),
    donorName: (0, pg_core_1.text)('donor_name'),
    donorEmail: (0, pg_core_1.text)('donor_email'),
    isAnonymous: (0, pg_core_1.boolean)('is_anonymous').default(false),
    message: (0, pg_core_1.text)('message'),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    stripePaymentIntentId: (0, pg_core_1.text)('stripe_payment_intent_id'),
    paymentMethod: (0, pg_core_1.text)('payment_method'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('donations_tenant_idx').on(table.tenantId),
    fundIdx: (0, pg_core_1.index)('donations_fund_idx').on(table.strikeFundId),
    statusIdx: (0, pg_core_1.index)('donations_status_idx').on(table.status),
    stripeIdx: (0, pg_core_1.index)('donations_stripe_idx').on(table.stripePaymentIntentId),
}));
// ============================================================================
// NOTIFICATION SYSTEM TABLES (Week 9-10)
// ============================================================================
exports.notificationStatusEnum = (0, pg_core_1.pgEnum)('notification_status', [
    'pending',
    'sent',
    'failed',
    'partial'
]);
exports.notificationChannelEnum = (0, pg_core_1.pgEnum)('notification_channel', [
    'email',
    'sms',
    'push',
    'in_app'
]);
exports.notificationTypeEnum = (0, pg_core_1.pgEnum)('notification_type', [
    'payment_confirmation',
    'payment_failed',
    'payment_reminder',
    'donation_received',
    'stipend_approved',
    'stipend_disbursed',
    'low_balance_alert',
    'arrears_warning',
    'strike_announcement',
    'picket_reminder'
]);
// Notification Queue Table
exports.notificationQueue = (0, pg_core_1.pgTable)('notification_queue', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    userId: (0, pg_core_1.uuid)('user_id').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    channels: (0, pg_core_1.text)('channels').array().notNull(),
    priority: (0, pg_core_1.text)('priority').notNull().default('normal'),
    data: (0, pg_core_1.text)('data').notNull(), // JSON string
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    scheduledFor: (0, pg_core_1.timestamp)('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    attempts: (0, pg_core_1.numeric)('attempts', { precision: 2, scale: 0 }).notNull().default('0'),
    lastAttemptAt: (0, pg_core_1.timestamp)('last_attempt_at', { withTimezone: true }),
    error: (0, pg_core_1.text)('error'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('notification_queue_tenant_idx').on(table.tenantId),
    userIdx: (0, pg_core_1.index)('notification_queue_user_idx').on(table.userId),
    statusIdx: (0, pg_core_1.index)('notification_queue_status_idx').on(table.status),
    scheduledIdx: (0, pg_core_1.index)('notification_queue_scheduled_idx').on(table.scheduledFor),
}));
// Notification Templates Table
exports.notificationTemplates = (0, pg_core_1.pgTable)('notification_templates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    channel: (0, pg_core_1.text)('channel').notNull(),
    subject: (0, pg_core_1.text)('subject'),
    body: (0, pg_core_1.text)('body').notNull(),
    variables: (0, pg_core_1.text)('variables'), // JSON array of variable names
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    tenantIdx: (0, pg_core_1.index)('notification_templates_tenant_idx').on(table.tenantId),
    typeChannelIdx: (0, pg_core_1.uniqueIndex)('notification_templates_type_channel_idx').on(table.tenantId, table.type, table.channel),
}));
// User Notification Preferences Table
exports.userNotificationPreferences = (0, pg_core_1.pgTable)('user_notification_preferences', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    userId: (0, pg_core_1.uuid)('user_id').notNull(),
    preferences: (0, pg_core_1.text)('preferences').notNull(), // JSON object
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    tenantUserIdx: (0, pg_core_1.uniqueIndex)('user_notification_preferences_tenant_user_idx').on(table.tenantId, table.userId),
}));
// Notification Log Table (for delivery tracking)
exports.notificationLog = (0, pg_core_1.pgTable)('notification_log', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    notificationId: (0, pg_core_1.uuid)('notification_id').notNull(),
    channel: (0, pg_core_1.text)('channel').notNull(),
    status: (0, pg_core_1.text)('status').notNull(), // 'delivered', 'failed', 'bounced'
    error: (0, pg_core_1.text)('error'),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    notificationIdx: (0, pg_core_1.index)('notification_log_notification_idx').on(table.notificationId),
    statusIdx: (0, pg_core_1.index)('notification_log_status_idx').on(table.status),
}));
// Relations
exports.duesRulesRelations = (0, drizzle_orm_1.relations)(exports.duesRules, ({ many }) => ({
    assignments: many(exports.memberDuesAssignments),
}));
exports.memberDuesAssignmentsRelations = (0, drizzle_orm_1.relations)(exports.memberDuesAssignments, ({ one, many }) => ({
    rule: one(exports.duesRules, {
        fields: [exports.memberDuesAssignments.ruleId],
        references: [exports.duesRules.id],
    }),
    transactions: many(exports.duesTransactions),
}));
exports.duesTransactionsRelations = (0, drizzle_orm_1.relations)(exports.duesTransactions, ({ one }) => ({
    assignment: one(exports.memberDuesAssignments, {
        fields: [exports.duesTransactions.assignmentId],
        references: [exports.memberDuesAssignments.id],
    }),
}));
//# sourceMappingURL=schema.js.map