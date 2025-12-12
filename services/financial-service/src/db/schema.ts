import { pgTable, uuid, text, timestamp, date, boolean, numeric, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums matching database enums
export const calculationTypeEnum = pgEnum('calculation_type', [
  'percentage',
  'flat_rate',
  'hourly',
  'tiered',
  'formula'
]);

export const billingFrequencyEnum = pgEnum('billing_frequency', [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annually'
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'payment',
  'adjustment',
  'refund',
  'write_off'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
]);

export const remittanceStatusEnum = pgEnum('remittance_processing_status', [
  'uploaded',
  'processing',
  'matched',
  'discrepancy',
  'completed'
]);

export const arrearsStatusEnum = pgEnum('arrears_status', [
  'active',
  'payment_plan',
  'suspended',
  'legal_action',
  'resolved',
  'written_off'
]);

export const paymentMethodTypeEnum = pgEnum('payment_method_type', [
  'card',
  'bank_account',
  'ach'
]);

// Dues Rules Table
export const duesRules = pgTable('dues_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  ruleName: text('rule_name').notNull(),
  ruleCode: text('rule_code').notNull(),
  description: text('description'),
  calculationType: calculationTypeEnum('calculation_type').notNull(),
  
  // Percentage-based fields
  percentageRate: numeric('percentage_rate', { precision: 5, scale: 2 }),
  baseField: text('base_field'), // 'gross_wages', 'base_salary', 'hourly_rate'
  
  // Flat rate fields
  flatAmount: numeric('flat_amount', { precision: 10, scale: 2 }),
  
  // Hourly-based fields
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  hoursPerPeriod: numeric('hours_per_period', { precision: 10, scale: 0 }),
  
  // Tiered structure
  tierStructure: jsonb('tier_structure'), // Array of {minAmount, maxAmount, rate, flatAmount}
  
  // Custom formula
  customFormula: text('custom_formula'),
  
  // Billing configuration
  billingFrequency: billingFrequencyEnum('billing_frequency').notNull().default('monthly'),
  
  // Effective dates
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  
  // Metadata
  isActive: boolean('is_active').default(true),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('dues_rules_tenant_idx').on(table.tenantId),
  codeIdx: uniqueIndex('dues_rules_code_idx').on(table.tenantId, table.ruleCode),
  activeIdx: index('dues_rules_active_idx').on(table.tenantId, table.isActive),
}));

// Member Dues Assignments Table
export const memberDuesAssignments = pgTable('member_dues_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  ruleId: uuid('rule_id').notNull().references(() => duesRules.id),
  
  // Override fields
  overrideAmount: numeric('override_amount', { precision: 10, scale: 2 }),
  overrideReason: text('override_reason'),
  
  // Status
  isActive: boolean('is_active').default(true),
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('member_dues_assignments_tenant_idx').on(table.tenantId),
  memberIdx: index('member_dues_assignments_member_idx').on(table.memberId),
  ruleIdx: index('member_dues_assignments_rule_idx').on(table.ruleId),
  activeIdx: index('member_dues_assignments_active_idx').on(table.tenantId, table.isActive),
}));

// Alias for backward compatibility
export const duesAssignments = memberDuesAssignments;

// Dues Transactions Table
export const duesTransactions = pgTable('dues_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  assignmentId: uuid('assignment_id').references(() => memberDuesAssignments.id),
  ruleId: uuid('rule_id'),
  
  // Transaction details
  transactionType: text('transaction_type').notNull(),
  
  // Amount fields
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  lateFeeAmount: numeric('late_fee_amount', { precision: 10, scale: 2 }).default('0.00'),
  processingFee: numeric('processing_fee', { precision: 10, scale: 2 }).default('0.00'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }),
  balance: numeric('balance', { precision: 10, scale: 2 }).default('0.00'),
  
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  dueDate: date('due_date').notNull(),
  
  // Payment information
  status: text('status').notNull().default('pending'),
  paymentDate: timestamp('payment_date', { withTimezone: true }),
  paidDate: timestamp('paid_date', { withTimezone: true }),
  paymentMethod: text('payment_method'),
  paymentReference: text('payment_reference'),
  
  // Integration fields
  remittanceId: uuid('remittance_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  
  notes: text('notes'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('dues_transactions_tenant_idx').on(table.tenantId),
  memberIdx: index('dues_transactions_member_idx').on(table.memberId),
  statusIdx: index('dues_transactions_status_idx').on(table.status),
  dueDateIdx: index('dues_transactions_due_date_idx').on(table.dueDate),
  periodIdx: index('dues_transactions_period_idx').on(table.periodStart, table.periodEnd),
}));

// PAC Contributions Table
export const pacContributions = pgTable('pac_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  
  // Contribution details
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  contributionDate: date('contribution_date').notNull().defaultNow(),
  electionCycle: text('election_cycle').notNull(), // e.g., "2024 General"
  committeeName: text('committee_name').notNull(), // PAC name
  
  // FEC compliance fields
  fecCompliant: boolean('fec_compliant').default(true),
  contributorEmployer: text('contributor_employer'),
  contributorOccupation: text('contributor_occupation'),
  contributorAddress: text('contributor_address'),
  contributorCity: text('contributor_city'),
  contributorState: text('contributor_state'),
  contributorZip: text('contributor_zip'),
  
  // Opt-in tracking
  optInDate: date('opt_in_date'),
  optOutDate: date('opt_out_date'),
  isRecurring: boolean('is_recurring').default(false),
  recurringAmount: numeric('recurring_amount', { precision: 10, scale: 2 }),
  recurringFrequency: text('recurring_frequency'), // monthly, quarterly, annually
  
  // Payment tracking
  paymentMethod: text('payment_method'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paymentReference: text('payment_reference'),
  status: text('status').notNull().default('completed'), // pending, completed, failed, refunded
  
  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('pac_contributions_tenant_idx').on(table.tenantId),
  memberIdx: index('pac_contributions_member_idx').on(table.memberId),
  cycleIdx: index('pac_contributions_cycle_idx').on(table.electionCycle),
  dateIdx: index('pac_contributions_date_idx').on(table.contributionDate),
}));

// PAC Opt-ins Table
export const pacOptIns = pgTable('pac_opt_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  
  // Opt-in details
  optInDate: date('opt_in_date').notNull().defaultNow(),
  optOutDate: date('opt_out_date'),
  isActive: boolean('is_active').default(true),
  
  // Recurring contribution settings
  recurringAmount: numeric('recurring_amount', { precision: 10, scale: 2 }),
  recurringFrequency: text('recurring_frequency'), // monthly, quarterly, annually
  nextContributionDate: date('next_contribution_date'),
  
  // Compliance
  disclosureAccepted: boolean('disclosure_accepted').default(true),
  disclosureDate: timestamp('disclosure_acceptance_date', { withTimezone: true }),
  
  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('pac_opt_ins_tenant_idx').on(table.tenantId),
  memberIdx: uniqueIndex('pac_opt_ins_member_idx').on(table.tenantId, table.memberId),
  activeIdx: index('pac_opt_ins_active_idx').on(table.tenantId, table.isActive),
}));

// Per Capita Invoices Table
export const perCapitaInvoices = pgTable('per_capita_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  parentUnionId: uuid('parent_union_id'), // Reference to parent union organization
  
  // Invoice details
  invoiceNumber: text('invoice_number').notNull().unique(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  
  // Calculation details
  memberCount: numeric('member_count', { precision: 10, scale: 0 }).notNull(),
  perCapitaRate: numeric('per_capita_rate', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  
  // Payment tracking
  paymentStatus: text('payment_status').notNull().default('sent'), // sent, paid, overdue, disputed
  dueDate: date('due_date').notNull(),
  paidDate: date('paid_date'),
  paymentReference: text('payment_reference'),
  paymentMethod: text('payment_method'),
  
  // Additional details
  notes: text('notes'),
  metadata: jsonb('metadata'),
  
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('per_capita_invoices_tenant_idx').on(table.tenantId),
  parentUnionIdx: index('per_capita_invoices_parent_union_idx').on(table.parentUnionId),
  statusIdx: index('per_capita_invoices_status_idx').on(table.paymentStatus),
  periodIdx: index('per_capita_invoices_period_idx').on(table.periodStart, table.periodEnd),
  invoiceNumberIdx: uniqueIndex('per_capita_invoices_number_idx').on(table.invoiceNumber),
}));

// Employer Remittances Table
export const employerRemittances = pgTable('employer_remittances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employerName: text('employer_name').notNull(),
  employerId: text('employer_id'),
  
  // Remittance details
  batchNumber: text('batch_number').notNull(),
  remittanceDate: date('remittance_date').notNull(),
  
  // Period fields (database uses remittance_period_start/end)
  remittancePeriodStart: date('remittance_period_start').notNull(),
  remittancePeriodEnd: date('remittance_period_end').notNull(),
  periodStart: date('remittance_period_start').notNull(), // Alias
  periodEnd: date('remittance_period_end').notNull(), // Alias
  billingPeriodStart: date('remittance_period_start').notNull(), // Alias for old code
  billingPeriodEnd: date('remittance_period_end').notNull(), // Alias for old code
  
  // Amounts
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  remittedAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(), // Alias
  matchedAmount: numeric('matched_amount', { precision: 12, scale: 2 }).default('0'),
  unmatchedAmount: numeric('unmatched_amount', { precision: 12, scale: 2 }).default('0'),
  varianceAmount: numeric('variance_amount', { precision: 12, scale: 2 }).default('0'),
  totalVariance: numeric('variance_amount', { precision: 12, scale: 2 }).default('0'), // Alias
  
  // Member counts (database uses member_count)
  memberCount: numeric('member_count', { precision: 10, scale: 0 }).notNull(),
  totalMembers: numeric('member_count', { precision: 10, scale: 0 }).notNull(), // Alias
  expectedMemberCount: numeric('expected_member_count', { precision: 6, scale: 0 }),
  actualMemberCount: numeric('actual_member_count', { precision: 6, scale: 0 }),
  matchedTransactions: numeric('matched_transactions', { precision: 10, scale: 0 }).default('0'),
  
  // File tracking
  fileUrl: text('file_url'),
  fileHash: text('file_hash'),
  uploadedFile: text('file_url'), // Alias
  reconciliationReport: text('reconciliation_report'),
  
  // Status fields
  status: text('status').notNull().default('pending'),
  processingStatus: text('status').notNull().default('pending'), // Alias for backward compatibility
  reconciliationStatus: text('reconciliation_status'),
  reconciliationDate: timestamp('reconciliation_date', { withTimezone: true }),
  reconciledAt: timestamp('reconciliation_date', { withTimezone: true }), // Alias
  reconciledBy: text('reconciled_by'),
  varianceReason: text('variance_reason'),
  
  // Metadata
  uploadedBy: uuid('uploaded_by'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('employer_remittances_tenant_idx').on(table.tenantId),
  employerIdx: index('employer_remittances_employer_idx').on(table.employerId),
  batchIdx: uniqueIndex('employer_remittances_batch_idx').on(table.tenantId, table.batchNumber),
  statusIdx: index('employer_remittances_status_idx').on(table.status),
  periodIdx: index('employer_remittances_period_idx').on(table.remittancePeriodStart, table.remittancePeriodEnd),
}));

// Arrears status enum for actual database status values
export const arrearsStatusDbEnum = pgEnum('arrears_status_db', [
  'open',
  'payment_plan',
  'collections',
  'legal',
  'resolved',
  'written_off'
]);

// Arrears Cases Table
export const arrearsCases = pgTable('arrears_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  
  // Arrears details
  caseNumber: text('case_number').notNull(),
  totalOwed: numeric('total_owed', { precision: 10, scale: 2 }).notNull(),
  remainingBalance: numeric('remaining_balance', { precision: 10, scale: 2 }),
  oldestDebtDate: date('oldest_debt_date'),
  daysOverdue: numeric('days_overdue', { precision: 5, scale: 0 }),
  transactionIds: jsonb('transaction_ids').default('[]'),
  
  // Status
  status: text('status').notNull().default('open'),
  
  // Payment plan
  paymentPlanId: uuid('payment_plan_id'),
  paymentPlanAmount: numeric('payment_plan_amount', { precision: 10, scale: 2 }),
  paymentPlanFrequency: text('payment_plan_frequency'),
  paymentPlanActive: boolean('payment_plan_active').default(false),
  paymentPlanStartDate: date('payment_plan_start_date'),
  installmentAmount: numeric('installment_amount', { precision: 10, scale: 2 }),
  numberOfInstallments: numeric('number_of_installments', { precision: 3, scale: 0 }),
  paymentSchedule: jsonb('payment_schedule').default('[]'),
  
  // Communications
  lastContactDate: timestamp('last_contact_date'),
  lastContactMethod: text('last_contact_method'),
  nextFollowupDate: date('next_followup_date'),
  contactHistory: jsonb('contact_history').default('[]'),
  
  // Escalation
  escalationLevel: numeric('escalation_level', { precision: 1, scale: 0 }).default('0'),
  escalationHistory: jsonb('escalation_history').default('[]'),
  
  // Resolution
  resolutionDate: timestamp('resolution_date'),
  resolutionType: text('resolution_type'),
  resolutionNotes: text('resolution_notes'),
  
  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata').default('{}'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('arrears_tenant').on(table.tenantId),
  memberIdx: index('arrears_member').on(table.memberId),
  statusIdx: index('arrears_status').on(table.tenantId, table.status),
  caseIdx: uniqueIndex('arrears_case_number').on(table.caseNumber),
}));

// Billing Templates Table
export const billingTemplates = pgTable('billing_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  
  // Template details
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // invoice, reminder, statement, notice, letter
  
  // Template content
  templateHtml: text('template_html').notNull(),
  templateText: text('template_text').notNull(), // Plain text fallback
  subject: text('subject'), // Email subject line
  
  // Variables
  variables: jsonb('variables').default('[]'), // Array of variable names used in template
  
  // Status
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  
  // Metadata
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('billing_templates_tenant_idx').on(table.tenantId),
  categoryIdx: index('billing_templates_category_idx').on(table.category),
  defaultIdx: index('billing_templates_default_idx').on(table.tenantId, table.isDefault),
}));

// ============================================================================
// STRIKE FUND & PICKET ATTENDANCE
// ============================================================================

export const checkInMethodEnum = pgEnum('check_in_method', [
  'nfc',
  'qr_code',
  'gps',
  'manual'
]);

// Strike Funds Table (matches actual database schema)
export const strikeFunds = pgTable('strike_funds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  fundName: text('fund_name').notNull(),
  fundCode: text('fund_code').notNull(),
  description: text('description'),
  fundType: text('fund_type').notNull(),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  targetAmount: numeric('target_amount', { precision: 12, scale: 2 }),
  minimumThreshold: numeric('minimum_threshold', { precision: 12, scale: 2 }),
  contributionRate: numeric('contribution_rate', { precision: 10, scale: 2 }),
  contributionFrequency: text('contribution_frequency'),
  strikeStatus: text('strike_status').notNull().default('inactive'),
  strikeStartDate: date('strike_start_date'),
  strikeEndDate: date('strike_end_date'),
  weeklyStipendAmount: numeric('weekly_stipend_amount', { precision: 10, scale: 2 }),
  dailyPicketBonus: numeric('daily_picket_bonus', { precision: 8, scale: 2 }),
  minimumAttendanceHours: numeric('minimum_attendance_hours', { precision: 4, scale: 2 }).default('4.0'),
  minimumHoursPerWeek: numeric('minimum_attendance_hours', { precision: 4, scale: 2 }).default('4.0'), // Alias
  estimatedBurnRate: numeric('estimated_burn_rate', { precision: 10, scale: 2 }),
  estimatedDurationWeeks: numeric('estimated_duration_weeks', { precision: 10, scale: 0 }),
  fundDepletionDate: date('fund_depletion_date'),
  lastPredictionUpdate: timestamp('last_prediction_update', { withTimezone: true }),
  acceptsPublicDonations: boolean('accepts_public_donations').default(false),
  donationPageUrl: text('donation_page_url'),
  fundraisingGoal: numeric('fundraising_goal', { precision: 12, scale: 2 }),
  status: text('status').default('active'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  organizationId: uuid('organization_id'),
}, (table) => ({
  tenantIdx: index('strike_funds_tenant_idx').on(table.tenantId),
  statusIdx: index('strike_funds_status_idx').on(table.tenantId, table.strikeStatus),
  organizationIdIdx: index('strike_funds_organization_id').on(table.organizationId),
}));

// Organization Members Table (represents union members)
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('active'),
  department: text('department'),
  position: text('position'),
  hireDate: timestamp('hire_date', { withTimezone: true }),
  membershipNumber: text('membership_number'),
  seniority: numeric('seniority', { precision: 10, scale: 0 }).default('0'),
  unionJoinDate: timestamp('union_join_date', { withTimezone: true }),
  preferredContactMethod: text('preferred_contact_method'),
  metadata: text('metadata'),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantIdx: index('org_members_tenant_idx').on(table.tenantId),
  userIdx: index('org_members_user_idx').on(table.userId),
}));

// Alias for convenience - many parts of code reference 'members'
export const members = organizationMembers;

// Simple Arrears Table (legacy/simpler version)
export const arrears = pgTable('arrears', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  totalOwed: numeric('total_owed', { precision: 10, scale: 2 }).notNull().default('0.00'),
  oldestDebtDate: date('oldest_debt_date'),
  monthsOverdue: numeric('months_overdue', { precision: 10, scale: 0 }).default('0'),
  arrearsStatus: text('arrears_status').notNull().default('active'),
  status: text('arrears_status').notNull().default('active'), // Alias for code compatibility
  notificationStage: text('notification_stage').default('none'),
  transactionId: uuid('transaction_id'),
  paymentPlanActive: boolean('payment_plan_active').default(false),
  paymentPlanAmount: numeric('payment_plan_amount', { precision: 10, scale: 2 }),
  paymentPlanFrequency: text('payment_plan_frequency'),
  paymentPlanStartDate: date('payment_plan_start_date'),
  paymentPlanEndDate: date('payment_plan_end_date'),
  suspensionEffectiveDate: date('suspension_effective_date'),
  suspensionReason: text('suspension_reason'),
  collectionAgency: text('collection_agency'),
  legalActionDate: date('legal_action_date'),
  legalReference: text('legal_reference'),
  notes: text('notes'),
  lastContactDate: date('last_contact_date'),
  nextFollowUpDate: date('next_follow_up_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('arrears_tenant_idx').on(table.tenantId),
  memberIdx: index('arrears_member_idx').on(table.memberId),
  statusIdx: index('arrears_status_idx').on(table.arrearsStatus),
}));

// Picket Attendance Table
export const picketAttendance = pgTable('picket_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  strikeFundId: uuid('strike_fund_id').notNull().references(() => strikeFunds.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull(),
  
  checkInTime: timestamp('check_in_time', { withTimezone: true }).notNull(),
  checkOutTime: timestamp('check_out_time', { withTimezone: true }),
  
  // Location tracking
  checkInLatitude: numeric('check_in_latitude', { precision: 10, scale: 8 }),
  checkInLongitude: numeric('check_in_longitude', { precision: 11, scale: 8 }),
  checkOutLatitude: numeric('check_out_latitude', { precision: 10, scale: 8 }),
  checkOutLongitude: numeric('check_out_longitude', { precision: 11, scale: 8 }),
  locationVerified: boolean('location_verified').default(false),
  
  // Check-in methods
  checkInMethod: text('check_in_method').notNull(),
  nfcTagUid: text('nfc_tag_uid'),
  qrCodeData: text('qr_code_data'),
  deviceId: text('device_id'),
  
  // Duration tracking
  durationMinutes: numeric('duration_minutes'),
  hoursWorked: numeric('hours_worked', { precision: 4, scale: 2 }),
  
  // Approval
  coordinatorOverride: boolean('coordinator_override').default(false),
  approved: boolean('coordinator_override').default(false), // Alias
  overrideReason: text('override_reason'),
  verifiedBy: text('verified_by'),
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('picket_attendance_tenant_idx').on(table.tenantId),
  fundIdx: index('picket_attendance_fund_idx').on(table.strikeFundId),
  memberIdx: index('picket_attendance_member_idx').on(table.memberId),
  dateIdx: index('picket_attendance_date_idx').on(table.checkInTime),
  methodIdx: index('picket_attendance_method_idx').on(table.checkInMethod),
}));

// Stipend Disbursements Table
export const stipendDisbursements = pgTable('stipend_disbursements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  strikeFundId: uuid('strike_fund_id').notNull().references(() => strikeFunds.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull(),
  
  weekStartDate: date('week_start_date').notNull(),
  weekEndDate: date('week_end_date').notNull(),
  
  hoursWorked: numeric('hours_worked', { precision: 6, scale: 2 }).notNull(),
  daysWorked: numeric('days_worked', { precision: 3, scale: 0 }),
  baseStipendAmount: numeric('base_stipend_amount', { precision: 10, scale: 2 }),
  bonusAmount: numeric('bonus_amount', { precision: 10, scale: 2 }),
  amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(), // Alias
  calculatedAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(), // Alias
  approvedAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(), // Alias
  
  status: text('status').notNull().default('pending'), // pending, approved, paid, processing
  paymentDate: timestamp('payment_date', { withTimezone: true }),
  paidAt: timestamp('payment_date', { withTimezone: true }), // Alias
  disbursedAt: timestamp('payment_date', { withTimezone: true }), // Alias
  paymentMethod: text('payment_method'), // direct_deposit, check, cash, paypal
  paymentReference: text('payment_reference'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  
  notes: text('notes'),
  approvalNotes: text('notes'), // Alias
  
  transactionId: uuid('transaction_id'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('stipend_disbursements_tenant_idx').on(table.tenantId),
  fundIdx: index('stipend_disbursements_fund_idx').on(table.strikeFundId),
  memberIdx: index('stipend_disbursements_member_idx').on(table.memberId),
  weekIdx: index('stipend_disbursements_week_idx').on(table.weekStartDate, table.weekEndDate),
  statusIdx: index('stipend_disbursements_status_idx').on(table.status),
}));

// Donations Table
export const donationStatusEnum = pgEnum('donation_status', [
  'pending',
  'completed',
  'failed',
  'refunded'
]);

export const donations = pgTable('donations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  strikeFundId: uuid('strike_fund_id').notNull().references(() => strikeFunds.id, { onDelete: 'cascade' }),
  
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('usd'),
  
  donorName: text('donor_name'),
  donorEmail: text('donor_email'),
  isAnonymous: boolean('is_anonymous').default(false),
  message: text('message'),
  
  status: text('status').notNull().default('pending'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paymentMethod: text('payment_method'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('donations_tenant_idx').on(table.tenantId),
  fundIdx: index('donations_fund_idx').on(table.strikeFundId),
  statusIdx: index('donations_status_idx').on(table.status),
  stripeIdx: index('donations_stripe_idx').on(table.stripePaymentIntentId),
}));

// ============================================================================
// NOTIFICATION SYSTEM TABLES (Week 9-10)
// ============================================================================

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'partial'
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'sms',
  'push',
  'in_app'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
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
export const notificationQueue = pgTable('notification_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  type: text('type').notNull(),
  channels: text('channels').array().notNull(),
  priority: text('priority').notNull().default('normal'),
  
  data: text('data').notNull(), // JSON string
  status: text('status').notNull().default('pending'),
  
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  
  attempts: numeric('attempts', { precision: 2, scale: 0 }).notNull().default('0'),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  error: text('error'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('notification_queue_tenant_idx').on(table.tenantId),
  userIdx: index('notification_queue_user_idx').on(table.userId),
  statusIdx: index('notification_queue_status_idx').on(table.status),
  scheduledIdx: index('notification_queue_scheduled_idx').on(table.scheduledFor),
}));

// Notification Templates Table
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  
  type: text('type').notNull(),
  channel: text('channel').notNull(),
  
  subject: text('subject'),
  body: text('body').notNull(),
  variables: text('variables'), // JSON array of variable names
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('notification_templates_tenant_idx').on(table.tenantId),
  typeChannelIdx: uniqueIndex('notification_templates_type_channel_idx').on(table.tenantId, table.type, table.channel),
}));

// User Notification Preferences Table
export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  preferences: text('preferences').notNull(), // JSON object
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantUserIdx: uniqueIndex('user_notification_preferences_tenant_user_idx').on(table.tenantId, table.userId),
}));

// AutoPay Settings Table
export const autopaySettings = pgTable('autopay_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  
  enabled: boolean('enabled').default(false).notNull(),
  paymentMethodId: text('payment_method_id'), // Stripe payment method ID
  
  // Processing details
  lastChargeDate: date('last_charge_date'),
  lastChargeAmount: numeric('last_charge_amount', { precision: 10, scale: 2 }),
  lastChargeStatus: paymentStatusEnum('last_charge_status'),
  
  failureCount: numeric('failure_count', { precision: 3, scale: 0 }).default('0'),
  lastFailureDate: date('last_failure_date'),
  lastFailureReason: text('last_failure_reason'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantMemberIdx: uniqueIndex('autopay_settings_tenant_member_idx').on(table.tenantId, table.memberId),
  enabledIdx: index('autopay_settings_enabled_idx').on(table.enabled),
}));

// Payment Methods Table
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  memberId: uuid('member_id').notNull(),
  
  // Stripe details
  stripePaymentMethodId: text('stripe_payment_method_id').notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  
  // Payment method details
  type: paymentMethodTypeEnum('type').notNull(),
  last4: text('last4'),
  brand: text('brand'), // For cards: visa, mastercard, etc.
  expiryMonth: text('expiry_month'),
  expiryYear: text('expiry_year'),
  bankName: text('bank_name'), // For bank accounts
  
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantMemberIdx: index('payment_methods_tenant_member_idx').on(table.tenantId, table.memberId),
  stripePaymentMethodIdx: uniqueIndex('payment_methods_stripe_pm_idx').on(table.stripePaymentMethodId),
  defaultIdx: index('payment_methods_default_idx').on(table.isDefault),
}));

// Notification Log Table (for delivery tracking)
export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull(),
  
  channel: text('channel').notNull(),
  status: text('status').notNull(), // 'delivered', 'failed', 'bounced'
  error: text('error'),
  
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  notificationIdx: index('notification_log_notification_idx').on(table.notificationId),
  statusIdx: index('notification_log_status_idx').on(table.status),
}));

// Relations
export const duesRulesRelations = relations(duesRules, ({ many }) => ({
  assignments: many(memberDuesAssignments),
}));

export const memberDuesAssignmentsRelations = relations(memberDuesAssignments, ({ one, many }) => ({
  rule: one(duesRules, {
    fields: [memberDuesAssignments.ruleId],
    references: [duesRules.id],
  }),
  transactions: many(duesTransactions),
}));

export const duesTransactionsRelations = relations(duesTransactions, ({ one }) => ({
  assignment: one(memberDuesAssignments, {
    fields: [duesTransactions.assignmentId],
    references: [memberDuesAssignments.id],
  }),
}));

export const pacContributionsRelations = relations(pacContributions, ({ one }) => ({
  member: one(members, {
    fields: [pacContributions.memberId],
    references: [members.id],
  }),
}));

export const pacOptInsRelations = relations(pacOptIns, ({ one }) => ({
  member: one(members, {
    fields: [pacOptIns.memberId],
    references: [members.id],
  }),
}));

// Type exports
export type DuesRule = typeof duesRules.$inferSelect;
export type NewDuesRule = typeof duesRules.$inferInsert;
export type MemberDuesAssignment = typeof memberDuesAssignments.$inferSelect;
export type NewMemberDuesAssignment = typeof memberDuesAssignments.$inferInsert;
export type DuesTransaction = typeof duesTransactions.$inferSelect;
export type NewDuesTransaction = typeof duesTransactions.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
