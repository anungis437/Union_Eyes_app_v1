/**
 * ERP Connector Interface
 * 
 * Defines the contract that all ERP system connectors must implement.
 * This abstraction allows Union Eyes to integrate with multiple ERP systems
 * using a consistent interface.
 */

import {
  ChartOfAccount,
  JournalEntry,
  Invoice,
  Payment,
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  AgedReceivablesReport,
  BudgetVarianceReport,
  SyncJob,
  DateRange,
  PaginationParams,
  PaginatedResponse,
  BankAccount,
  BankTransaction,
  CurrencyExchangeRate,
} from './types';

/**
 * Base ERP Connector Interface
 * 
 * All ERP connectors must implement this interface to ensure consistent
 * integration across different ERP systems.
 */
export interface ERPConnector {
  // ============================================================================
  // CONNECTION & AUTHENTICATION
  // ============================================================================
  
  /**
   * Establish connection to the ERP system
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the ERP system
   */
  disconnect(): Promise<void>;
  
  /**
   * Test the connection to the ERP system
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Refresh authentication tokens
   */
  refreshAuth(): Promise<void>;

  // ============================================================================
  // CHART OF ACCOUNTS
  // ============================================================================
  
  /**
   * Import the complete chart of accounts from the ERP system
   */
  importChartOfAccounts(): Promise<ChartOfAccount[]>;
  
  /**
   * Get a specific account by ID
   */
  getAccount(accountId: string): Promise<ChartOfAccount>;
  
  /**
   * Create a new account in the ERP system
   */
  createAccount(account: Partial<ChartOfAccount>): Promise<ChartOfAccount>;
  
  /**
   * Update an existing account
   */
  updateAccount(accountId: string, account: Partial<ChartOfAccount>): Promise<ChartOfAccount>;

  // ============================================================================
  // JOURNAL ENTRIES
  // ============================================================================
  
  /**
   * Export journal entries to the ERP system
   * @param dateRange - Optional date range to filter entries
   */
  exportJournalEntries(dateRange?: DateRange): Promise<JournalEntry[]>;
  
  /**
   * Import journal entries from the ERP system
   */
  importJournalEntries(dateRange: DateRange): Promise<JournalEntry[]>;
  
  /**
   * Create a journal entry in the ERP system
   */
  createJournalEntry(entry: Omit<JournalEntry, 'id' | 'externalId'>): Promise<JournalEntry>;
  
  /**
   * Get a specific journal entry by ID
   */
  getJournalEntry(entryId: string): Promise<JournalEntry>;
  
  /**
   * Void/reverse a journal entry
   */
  reverseJournalEntry(entryId: string, reversalDate: Date, memo?: string): Promise<JournalEntry>;

  // ============================================================================
  // INVOICES
  // ============================================================================
  
  /**
   * Export invoices to the ERP system
   */
  exportInvoices(dateRange?: DateRange, pagination?: PaginationParams): Promise<PaginatedResponse<Invoice>>;
  
  /**
   * Import invoices from the ERP system
   */
  importInvoices(dateRange: DateRange, pagination?: PaginationParams): Promise<PaginatedResponse<Invoice>>;
  
  /**
   * Create an invoice in the ERP system
   */
  createInvoice(invoice: Omit<Invoice, 'id' | 'externalId'>): Promise<Invoice>;
  
  /**
   * Get a specific invoice by ID
   */
  getInvoice(invoiceId: string): Promise<Invoice>;
  
  /**
   * Update an existing invoice
   */
  updateInvoice(invoiceId: string, invoice: Partial<Invoice>): Promise<Invoice>;
  
  /**
   * Void an invoice
   */
  voidInvoice(invoiceId: string, reason?: string): Promise<Invoice>;

  // ============================================================================
  // PAYMENTS
  // ============================================================================
  
  /**
   * Sync payment records between Union Eyes and ERP
   */
  syncPayments(dateRange?: DateRange): Promise<SyncJob>;
  
  /**
   * Import payments from the ERP system
   */
  importPayments(dateRange: DateRange, pagination?: PaginationParams): Promise<PaginatedResponse<Payment>>;
  
  /**
   * Create a payment in the ERP system
   */
  createPayment(payment: Omit<Payment, 'id' | 'externalId'>): Promise<Payment>;
  
  /**
   * Get a specific payment by ID
   */
  getPayment(paymentId: string): Promise<Payment>;
  
  /**
   * Void a payment
   */
  voidPayment(paymentId: string, reason?: string): Promise<Payment>;

  // ============================================================================
  // FINANCIAL STATEMENTS
  // ============================================================================
  
  /**
   * Generate a balance sheet
   */
  getBalanceSheet(asOfDate: Date): Promise<BalanceSheet>;
  
  /**
   * Generate an income statement (profit & loss)
   */
  getIncomeStatement(dateRange: DateRange): Promise<IncomeStatement>;
  
  /**
   * Generate a cash flow statement
   */
  getCashFlowStatement(dateRange: DateRange): Promise<CashFlowStatement>;

  // ============================================================================
  // REPORTS
  // ============================================================================
  
  /**
   * Generate an aged receivables report
   */
  getAgedReceivablesReport(asOfDate: Date): Promise<AgedReceivablesReport>;
  
  /**
   * Generate a budget vs actual variance report
   */
  getBudgetVarianceReport(dateRange: DateRange): Promise<BudgetVarianceReport>;

  // ============================================================================
  // BANKING
  // ============================================================================
  
  /**
   * Import bank accounts from the ERP system
   */
  importBankAccounts(): Promise<BankAccount[]>;
  
  /**
   * Import bank transactions for reconciliation
   */
  importBankTransactions(bankAccountId: string, dateRange: DateRange): Promise<BankTransaction[]>;

  // ============================================================================
  // CURRENCY
  // ============================================================================
  
  /**
   * Get current exchange rates from the ERP system
   */
  getExchangeRates(baseCurrency: string, targetCurrencies: string[]): Promise<CurrencyExchangeRate[]>;
  
  /**
   * Update exchange rates in the ERP system
   */
  updateExchangeRates(rates: Omit<CurrencyExchangeRate, 'id'>[]): Promise<void>;

  // ============================================================================
  // SYNC & UTILITIES
  // ============================================================================
  
  /**
   * Get the status of a sync job
   */
  getSyncJobStatus(jobId: string): Promise<SyncJob>;
  
  /**
   * Validate journal entry before posting (dry run)
   */
  validateJournalEntry(entry: Omit<JournalEntry, 'id' | 'externalId'>): Promise<{ isValid: boolean; errors: string[] }>;
  
  /**
   * Get ERP system metadata and capabilities
   */
  getSystemInfo(): Promise<ERPSystemInfo>;
}

/**
 * ERP System Information
 */
export interface ERPSystemInfo {
  systemName: string;
  version: string;
  capabilities: ERPCapabilities;
  baseCurrency: string;
  fiscalYearStart: Date;
  decimalPlaces: number;
  dateFormat: string;
  metadata?: Record<string, any>;
}

/**
 * ERP System Capabilities
 */
export interface ERPCapabilities {
  supportsMultiCurrency: boolean;
  supportsMultiEntity: boolean;
  supportsDepartments: boolean;
  supportsLocations: boolean;
  supportsProjects: boolean;
  supportsClasses: boolean;
  supportsInventory: boolean;
  supportsPayroll: boolean;
  supportsFixedAssets: boolean;
  supportsBudgets: boolean;
  supportsAutomatedBankFeeds: boolean;
  maxJournalEntryLines: number;
  apiRateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

/**
 * ERP Connector Configuration
 */
export interface ERPConnectorConfig {
  systemType: string;           // 'quickbooks_online', 'sage_intacct', etc.
  connectionString?: string;
  credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    realmId?: string;           // QuickBooks-specific
    companyId?: string;
    apiKey?: string;
    apiSecret?: string;
    environment?: 'sandbox' | 'production';
  };
  settings: {
    autoSync: boolean;
    syncInterval?: number;      // Minutes
    defaultGLAccount: string;   // Default GL account for unmatched transactions
    baseCurrency: string;
    timezone: string;
    webhookUrl?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Factory function type for creating ERP connectors
 */
export type ERPConnectorFactory = (config: ERPConnectorConfig) => ERPConnector;

/**
 * ERP Connector Registry
 * 
 * Maintains a registry of available ERP connectors
 */
export class ERPConnectorRegistry {
  private static connectors: Map<string, ERPConnectorFactory> = new Map();

  /**
   * Register a new ERP connector
   */
  static register(systemType: string, factory: ERPConnectorFactory): void {
    this.connectors.set(systemType, factory);
  }

  /**
   * Create a connector instance
   */
  static create(config: ERPConnectorConfig): ERPConnector {
    const factory = this.connectors.get(config.systemType);
    if (!factory) {
      throw new Error(`ERP connector not found for system type: ${config.systemType}`);
    }
    return factory(config);
  }

  /**
   * Get all registered connector types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Check if a connector is registered
   */
  static isRegistered(systemType: string): boolean {
    return this.connectors.has(systemType);
  }
}
