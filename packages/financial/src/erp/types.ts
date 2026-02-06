/**
 * ERP Integration Types
 * 
 * Core types and interfaces for ERP system integration.
 * Supports QuickBooks, Sage, Xero, SAP, Dynamics, NetSuite, and custom systems.
 */

import { Decimal } from 'decimal.js';

// ============================================================================
// CORE ERP TYPES
// ============================================================================

export enum ERPSystem {
  QUICKBOOKS_ONLINE = 'quickbooks_online',
  SAGE_INTACCT = 'sage_intacct',
  XERO = 'xero',
  SAP_BUSINESS_ONE = 'sap_business_one',
  MICROSOFT_DYNAMICS = 'microsoft_dynamics',
  ORACLE_NETSUITE = 'oracle_netsuite',
  CUSTOM = 'custom',
}

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
  CONTRA_ASSET = 'contra_asset',
  CONTRA_LIABILITY = 'contra_liability',
}

export enum TransactionType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  CREDIT_NOTE = 'credit_note',
  JOURNAL_ENTRY = 'journal_entry',
  BILL = 'bill',
  BILL_PAYMENT = 'bill_payment',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
}

export enum SyncDirection {
  PUSH = 'push',        // Union Eyes -> ERP
  PULL = 'pull',        // ERP -> Union Eyes
  BIDIRECTIONAL = 'bidirectional',
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export interface ChartOfAccount {
  id: string;
  externalId: string;        // ID in external ERP system
  accountNumber: string;      // Account code/number
  accountName: string;
  accountType: AccountType;
  parentAccountId?: string;
  isActive: boolean;
  isHeader: boolean;          // Parent account with sub-accounts
  currency: string;           // ISO 4217 currency code
  balance: Decimal;
  balanceDate: Date;
  description?: string;
  taxClassification?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export interface ChartOfAccountsMapping {
  unionEyesAccount: string;   // Internal account identifier
  erpAccount: string;         // External ERP account ID
  erpAccountNumber: string;   // External account number
  accountType: AccountType;
  description: string;
  autoSync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export interface JournalEntry {
  id: string;
  externalId?: string;
  entryNumber: string;
  entryDate: Date;
  postingDate: Date;
  description: string;
  reference?: string;         // Invoice number, payment reference, etc.
  currency: string;
  totalDebit: Decimal;
  totalCredit: Decimal;
  isPosted: boolean;
  isReversed: boolean;
  reversalEntryId?: string;
  lines: JournalEntryLine[];
  attachments?: string[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export interface JournalEntryLine {
  id: string;
  lineNumber: number;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debitAmount: Decimal;
  creditAmount: Decimal;
  description?: string;
  departmentId?: string;
  locationId?: string;
  projectId?: string;
  memberId?: string;          // Union-specific: link to member
  bargainingUnitId?: string;  // Union-specific: link to bargaining unit
  metadata?: Record<string, any>;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  externalId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  currency: string;
  subtotal: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
  amountPaid: Decimal;
  amountDue: Decimal;
  status: InvoiceStatus;
  terms?: string;
  memo?: string;
  lines: InvoiceLine[];
  payments?: Payment[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
}

export interface InvoiceLine {
  id: string;
  lineNumber: number;
  itemId?: string;
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  amount: Decimal;
  taxAmount: Decimal;
  accountId: string;
  departmentId?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  id: string;
  externalId?: string;
  paymentNumber: string;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  amount: Decimal;
  currency: string;
  customerId: string;
  customerName: string;
  reference?: string;
  bankAccount?: string;
  checkNumber?: string;
  depositToAccount: string;
  unappliedAmount: Decimal;
  applications: PaymentApplication[];
  status: PaymentStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export enum PaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  EFT = 'eft',
  PAD = 'pad',               // Pre-Authorized Debit
  PAYROLL_DEDUCTION = 'payroll_deduction',
  STRIPE = 'stripe',
  OTHER = 'other',
}

export enum PaymentStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  DEPOSITED = 'deposited',
  VOID = 'void',
  BOUNCED = 'bounced',       // NSF / returned payment
}

export interface PaymentApplication {
  invoiceId: string;
  invoiceNumber: string;
  amountApplied: Decimal;
  appliedDate: Date;
}

// ============================================================================
// FINANCIAL STATEMENTS
// ============================================================================

export interface BalanceSheet {
  asOfDate: Date;
  currency: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: Decimal;
  totalLiabilities: Decimal;
  totalEquity: Decimal;
  metadata?: Record<string, any>;
  generatedAt: Date;
}

export interface BalanceSheetSection {
  accounts: BalanceSheetAccount[];
  subtotal: Decimal;
}

export interface BalanceSheetAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  balance: Decimal;
  percentOfTotal: number;
  subAccounts?: BalanceSheetAccount[];
}

export interface IncomeStatement {
  startDate: Date;
  endDate: Date;
  currency: string;
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  totalRevenue: Decimal;
  totalExpenses: Decimal;
  netIncome: Decimal;
  grossProfit?: Decimal;      // Revenue - Cost of Goods Sold
  operatingIncome?: Decimal;  // Gross Profit - Operating Expenses
  metadata?: Record<string, any>;
  generatedAt: Date;
}

export interface IncomeStatementSection {
  accounts: IncomeStatementAccount[];
  subtotal: Decimal;
}

export interface IncomeStatementAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  amount: Decimal;
  percentOfRevenue: number;
  subAccounts?: IncomeStatementAccount[];
}

export interface CashFlowStatement {
  startDate: Date;
  endDate: Date;
  currency: string;
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: Decimal;
  beginningCash: Decimal;
  endingCash: Decimal;
  metadata?: Record<string, any>;
  generatedAt: Date;
}

export interface CashFlowSection {
  items: CashFlowItem[];
  subtotal: Decimal;
}

export interface CashFlowItem {
  description: string;
  amount: Decimal;
  accountId?: string;
}

// ============================================================================
// REPORTS
// ============================================================================

export interface AgedReceivablesReport {
  asOfDate: Date;
  currency: string;
  customers: AgedReceivable[];
  totalCurrent: Decimal;
  total1to30: Decimal;
  total31to60: Decimal;
  total61to90: Decimal;
  totalOver90: Decimal;
  totalOutstanding: Decimal;
  generatedAt: Date;
}

export interface AgedReceivable {
  customerId: string;
  customerName: string;
  current: Decimal;
  days1to30: Decimal;
  days31to60: Decimal;
  days61to90: Decimal;
  daysOver90: Decimal;
  total: Decimal;
  invoices: AgedInvoice[];
}

export interface AgedInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  daysOverdue: number;
  amount: Decimal;
}

export interface BudgetVarianceReport {
  startDate: Date;
  endDate: Date;
  currency: string;
  accounts: BudgetVariance[];
  totalBudget: Decimal;
  totalActual: Decimal;
  totalVariance: Decimal;
  variancePercent: number;
  generatedAt: Date;
}

export interface BudgetVariance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  budgetAmount: Decimal;
  actualAmount: Decimal;
  variance: Decimal;
  variancePercent: number;
  isFavorable: boolean;
}

// ============================================================================
// SYNC & RECONCILIATION
// ============================================================================

export interface SyncJob {
  id: string;
  erpSystem: ERPSystem;
  entityType: string;         // 'invoice', 'payment', 'journal_entry', etc.
  direction: SyncDirection;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors?: SyncError[];
  metadata?: Record<string, any>;
}

export interface SyncError {
  recordId: string;
  recordType: string;
  errorCode: string;
  errorMessage: string;
  details?: any;
  timestamp: Date;
}

export interface ReconciliationMatch {
  unionEyesTransactionId: string;
  erpTransactionId: string;
  matchType: 'exact' | 'fuzzy' | 'manual';
  matchScore: number;         // 0-100
  matchedAt: Date;
  matchedBy?: string;         // User ID for manual matches
  isConfirmed: boolean;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;           // Canada-specific
  postalCode: string;
  country: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  changes?: AuditChange[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SYNC = 'sync',
  APPROVE = 'approve',
  REJECT = 'reject',
  VOID = 'void',
  REVERSE = 'reverse',
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

// ============================================================================
// MULTI-CURRENCY
// ============================================================================

export interface CurrencyExchangeRate {
  id: string;
  baseCurrency: string;       // ISO 4217
  targetCurrency: string;     // ISO 4217
  rate: Decimal;
  effectiveDate: Date;
  source: string;             // 'BOC', 'manual', 'API', etc.
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CurrencyRevaluation {
  id: string;
  revaluationDate: Date;
  accountId: string;
  accountNumber: string;
  baseCurrency: string;
  foreignCurrency: string;
  exchangeRate: Decimal;
  originalAmount: Decimal;
  revaluedAmount: Decimal;
  gainLoss: Decimal;
  journalEntryId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// TREASURY
// ============================================================================

export interface BankAccount {
  id: string;
  externalId?: string;
  bankName: string;
  accountNumber: string;      // Last 4 digits only for security
  accountType: 'checking' | 'savings' | 'credit_card';
  currency: string;
  currentBalance: Decimal;
  availableBalance: Decimal;
  lastSyncDate?: Date;
  isActive: boolean;
  glAccountId: string;        // Link to chart of accounts
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  transactionDate: Date;
  postingDate: Date;
  description: string;
  amount: Decimal;
  type: 'debit' | 'credit';
  balance: Decimal;
  reference?: string;
  payee?: string;
  category?: string;
  isReconciled: boolean;
  reconciledAt?: Date;
  matchedTransactionId?: string;
  metadata?: Record<string, any>;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  statementDate: Date;
  statementBalance: Decimal;
  glBalance: Decimal;
  difference: Decimal;
  status: 'in_progress' | 'completed' | 'approved';
  reconciledBy?: string;
  reconciledAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  adjustments: BankReconciliationAdjustment[];
  metadata?: Record<string, any>;
}

export interface BankReconciliationAdjustment {
  id: string;
  description: string;
  amount: Decimal;
  type: 'bank_charge' | 'interest' | 'error_correction' | 'other';
  journalEntryId?: string;
  createdAt: Date;
}
