/**
 * QuickBooks Online Connector
 * 
 * Implementation of ERPConnector interface for QuickBooks Online.
 * Uses QuickBooks Online API v3.
 */

import { Decimal } from 'decimal.js';
import {
  ERPConnector,
  ERPConnectorConfig,
  ERPSystemInfo,
  ERPCapabilities,
} from '../connector-interface';
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
  AccountType,
  SyncStatus,
  SyncDirection,
} from '../types';

/**
 * QuickBooks Online Connector Implementation
 */
export class QuickBooksOnlineConnector implements ERPConnector {
  private config: ERPConnectorConfig;
  private accessToken?: string;
  private realmId?: string;
  private baseUrl: string;
  private connected: boolean = false;

  constructor(config: ERPConnectorConfig) {
    this.config = config;
    this.accessToken = config.credentials.accessToken;
    this.realmId = config.credentials.realmId;
    this.baseUrl = config.credentials.environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com/v3'
      : 'https://quickbooks.api.intuit.com/v3';
  }

  // ============================================================================
  // CONNECTION & AUTHENTICATION
  // ============================================================================

  async connect(): Promise<void> {
    if (!this.accessToken || !this.realmId) {
      throw new Error('QuickBooks credentials not configured');
    }

    // Test the connection
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to QuickBooks Online');
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/companyinfo/' + this.realmId);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async refreshAuth(): Promise<void> {
    if (!this.config.credentials.refreshToken) {
      throw new Error('Refresh token not available');
    }

    // Call QuickBooks OAuth2 token refresh endpoint
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${this.config.credentials.clientId}:${this.config.credentials.clientSecret}`
        ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.credentials.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh QuickBooks access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.config.credentials.accessToken = data.access_token;
    this.config.credentials.refreshToken = data.refresh_token;
  }

  // ============================================================================
  // CHART OF ACCOUNTS
  // ============================================================================

  async importChartOfAccounts(): Promise<ChartOfAccount[]> {
    const response = await this.makeRequest('GET', '/query', {
      query: 'SELECT * FROM Account MAXRESULTS 1000',
    });

    const accounts = response.QueryResponse?.Account || [];
    return accounts.map((qbAccount: any) => this.mapQBAccountToChartOfAccount(qbAccount));
  }

  async getAccount(accountId: string): Promise<ChartOfAccount> {
    const response = await this.makeRequest('GET', `/account/${accountId}`);
    return this.mapQBAccountToChartOfAccount(response.Account);
  }

  async createAccount(account: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const qbAccount = this.mapChartOfAccountToQB(account);
    const response = await this.makeRequest('POST', '/account', qbAccount);
    return this.mapQBAccountToChartOfAccount(response.Account);
  }

  async updateAccount(accountId: string, account: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const existing = await this.getAccount(accountId);
    const qbAccount = {
      ...this.mapChartOfAccountToQB(account),
      Id: accountId,
      SyncToken: existing.metadata?.syncToken,
    };
    const response = await this.makeRequest('POST', '/account', qbAccount);
    return this.mapQBAccountToChartOfAccount(response.Account);
  }

  // ============================================================================
  // JOURNAL ENTRIES
  // ============================================================================

  async exportJournalEntries(dateRange?: DateRange): Promise<JournalEntry[]> {
    let query = 'SELECT * FROM JournalEntry';
    if (dateRange) {
      query += ` WHERE TxnDate >= '${this.formatDate(dateRange.startDate)}' AND TxnDate <= '${this.formatDate(dateRange.endDate)}'`;
    }
    query += ' MAXRESULTS 1000';

    const response = await this.makeRequest('GET', '/query', { query });
    const entries = response.QueryResponse?.JournalEntry || [];
    return entries.map((qbEntry: any) => this.mapQBJournalEntryToJournalEntry(qbEntry));
  }

  async importJournalEntries(dateRange: DateRange): Promise<JournalEntry[]> {
    return this.exportJournalEntries(dateRange);
  }

  async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'externalId'>): Promise<JournalEntry> {
    const qbEntry = this.mapJournalEntryToQB(entry);
    const response = await this.makeRequest('POST', '/journalentry', qbEntry);
    return this.mapQBJournalEntryToJournalEntry(response.JournalEntry);
  }

  async getJournalEntry(entryId: string): Promise<JournalEntry> {
    const response = await this.makeRequest('GET', `/journalentry/${entryId}`);
    return this.mapQBJournalEntryToJournalEntry(response.JournalEntry);
  }

  async reverseJournalEntry(entryId: string, reversalDate: Date, memo?: string): Promise<JournalEntry> {
    const originalEntry = await this.getJournalEntry(entryId);
    
    // Create reversing entry
    const reversingEntry: Omit<JournalEntry, 'id' | 'externalId'> = {
      entryNumber: `REV-${originalEntry.entryNumber}`,
      entryDate: reversalDate,
      postingDate: reversalDate,
      description: memo || `Reversal of ${originalEntry.entryNumber}`,
      reference: originalEntry.id,
      currency: originalEntry.currency,
      totalDebit: originalEntry.totalCredit,
      totalCredit: originalEntry.totalDebit,
      isPosted: false,
      isReversed: false,
      lines: originalEntry.lines.map(line => ({
        ...line,
        debitAmount: line.creditAmount,
        creditAmount: line.debitAmount,
      })),
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.createJournalEntry(reversingEntry);
  }

  // ============================================================================
  // INVOICES
  // ============================================================================

  async exportInvoices(dateRange?: DateRange, pagination?: PaginationParams): Promise<PaginatedResponse<Invoice>> {
    const limit = pagination?.limit || 100;
    const page = pagination?.page || 1;
    const startPosition = (page - 1) * limit + 1;

    let query = 'SELECT * FROM Invoice';
    if (dateRange) {
      query += ` WHERE TxnDate >= '${this.formatDate(dateRange.startDate)}' AND TxnDate <= '${this.formatDate(dateRange.endDate)}'`;
    }
    query += ` MAXRESULTS ${limit} STARTPOSITION ${startPosition}`;

    const response = await this.makeRequest('GET', '/query', { query });
    const invoices = response.QueryResponse?.Invoice || [];
    const total = response.QueryResponse?.totalCount || invoices.length;

    return {
      data: invoices.map((qbInvoice: any) => this.mapQBInvoiceToInvoice(qbInvoice)),
      total,
      page,
      limit,
      hasMore: (page * limit) < total,
    };
  }

  async importInvoices(dateRange: DateRange, pagination?: PaginationParams): Promise<PaginatedResponse<Invoice>> {
    return this.exportInvoices(dateRange, pagination);
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'externalId'>): Promise<Invoice> {
    const qbInvoice = this.mapInvoiceToQB(invoice);
    const response = await this.makeRequest('POST', '/invoice', qbInvoice);
    return this.mapQBInvoiceToInvoice(response.Invoice);
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await this.makeRequest('GET', `/invoice/${invoiceId}`);
    return this.mapQBInvoiceToInvoice(response.Invoice);
  }

  async updateInvoice(invoiceId: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const existing = await this.getInvoice(invoiceId);
    const qbInvoice = {
      ...this.mapInvoiceToQB({ ...existing, ...invoice }),
      Id: invoiceId,
      SyncToken: existing.metadata?.syncToken,
    };
    const response = await this.makeRequest('POST', '/invoice', qbInvoice);
    return this.mapQBInvoiceToInvoice(response.Invoice);
  }

  async voidInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    const existing = await this.getInvoice(invoiceId);
    const response = await this.makeRequest('POST', '/invoice', {
      Id: invoiceId,
      SyncToken: existing.metadata?.syncToken,
      sparse: true,
      void: true,
    });
    return this.mapQBInvoiceToInvoice(response.Invoice);
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  async syncPayments(dateRange?: DateRange): Promise<SyncJob> {
    const jobId = `sync-payments-${Date.now()}`;
    const startedAt = new Date();

    try {
      let query = 'SELECT * FROM Payment';
      if (dateRange) {
        query += ` WHERE TxnDate >= '${this.formatDate(dateRange.startDate)}' AND TxnDate <= '${this.formatDate(dateRange.endDate)}'`;
      }
      query += ' MAXRESULTS 1000';

      const response = await this.makeRequest('GET', '/query', { query });
      const payments = response.QueryResponse?.Payment || [];

      return {
        id: jobId,
        erpSystem: 'quickbooks_online' as any,
        entityType: 'payment',
        direction: SyncDirection.PULL,
        status: SyncStatus.SUCCESS,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: payments.length,
        recordsSucceeded: payments.length,
        recordsFailed: 0,
      };
    } catch (error) {
      return {
        id: jobId,
        erpSystem: 'quickbooks_online' as any,
        entityType: 'payment',
        direction: SyncDirection.PULL,
        status: SyncStatus.FAILED,
        startedAt,
        completedAt: new Date(),
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        errors: [{
          recordId: 'unknown',
          recordType: 'payment',
          errorCode: 'SYNC_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        }],
      };
    }
  }

  async importPayments(dateRange: DateRange, pagination?: PaginationParams): Promise<PaginatedResponse<Payment>> {
    const limit = pagination?.limit || 100;
    const page = pagination?.page || 1;
    const startPosition = (page - 1) * limit + 1;

    let query = `SELECT * FROM Payment WHERE TxnDate >= '${this.formatDate(dateRange.startDate)}' AND TxnDate <= '${this.formatDate(dateRange.endDate)}' MAXRESULTS ${limit} STARTPOSITION ${startPosition}`;

    const response = await this.makeRequest('GET', '/query', { query });
    const payments = response.QueryResponse?.Payment || [];
    const total = response.QueryResponse?.totalCount || payments.length;

    return {
      data: payments.map((qbPayment: any) => this.mapQBPaymentToPayment(qbPayment)),
      total,
      page,
      limit,
      hasMore: (page * limit) < total,
    };
  }

  async createPayment(payment: Omit<Payment, 'id' | 'externalId'>): Promise<Payment> {
    const qbPayment = this.mapPaymentToQB(payment);
    const response = await this.makeRequest('POST', '/payment', qbPayment);
    return this.mapQBPaymentToPayment(response.Payment);
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.makeRequest('GET', `/payment/${paymentId}`);
    return this.mapQBPaymentToPayment(response.Payment);
  }

  async voidPayment(paymentId: string, reason?: string): Promise<Payment> {
    const existing = await this.getPayment(paymentId);
    const response = await this.makeRequest('POST', '/payment', {
      Id: paymentId,
      SyncToken: existing.metadata?.syncToken,
      sparse: true,
      void: true,
    });
    return this.mapQBPaymentToPayment(response.Payment);
  }

  // ============================================================================
  // FINANCIAL STATEMENTS
  // ============================================================================

  async getBalanceSheet(asOfDate: Date): Promise<BalanceSheet> {
    const response = await this.makeRequest('GET', '/reports/BalanceSheet', {
      date_macro: `${this.formatDate(asOfDate)}`,
    });

    return this.mapQBReportToBalanceSheet(response, asOfDate);
  }

  async getIncomeStatement(dateRange: DateRange): Promise<IncomeStatement> {
    const response = await this.makeRequest('GET', '/reports/ProfitAndLoss', {
      start_date: this.formatDate(dateRange.startDate),
      end_date: this.formatDate(dateRange.endDate),
    });

    return this.mapQBReportToIncomeStatement(response, dateRange);
  }

  async getCashFlowStatement(dateRange: DateRange): Promise<CashFlowStatement> {
    const response = await this.makeRequest('GET', '/reports/CashFlow', {
      start_date: this.formatDate(dateRange.startDate),
      end_date: this.formatDate(dateRange.endDate),
    });

    return this.mapQBReportToCashFlow(response, dateRange);
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  async getAgedReceivablesReport(asOfDate: Date): Promise<AgedReceivablesReport> {
    const response = await this.makeRequest('GET', '/reports/AgedReceivables', {
      report_date: this.formatDate(asOfDate),
    });

    return this.mapQBReportToAgedReceivables(response, asOfDate);
  }

  async getBudgetVarianceReport(dateRange: DateRange): Promise<BudgetVarianceReport> {
    // QuickBooks Online doesn't have a direct budget variance report API
    // This would require fetching budget data and actual data separately
    throw new Error('Budget variance report not yet implemented for QuickBooks Online');
  }

  // ============================================================================
  // BANKING
  // ============================================================================

  async importBankAccounts(): Promise<BankAccount[]> {
    const response = await this.makeRequest('GET', '/query', {
      query: "SELECT * FROM Account WHERE AccountType IN ('Bank', 'Credit Card') MAXRESULTS 1000",
    });

    const accounts = response.QueryResponse?.Account || [];
    return accounts.map((qbAccount: any) => this.mapQBAccountToBankAccount(qbAccount));
  }

  async importBankTransactions(bankAccountId: string, dateRange: DateRange): Promise<BankTransaction[]> {
    // This requires QuickBooks Bank Feeds to be enabled
    // For now, return empty array - would need to implement CDC (Change Data Capture) API
    return [];
  }

  // ============================================================================
  // CURRENCY
  // ============================================================================

  async getExchangeRates(baseCurrency: string, targetCurrencies: string[]): Promise<CurrencyExchangeRate[]> {
    const response = await this.makeRequest('GET', '/query', {
      query: 'SELECT * FROM ExchangeRate MAXRESULTS 1000',
    });

    const rates = response.QueryResponse?.ExchangeRate || [];
    return rates
      .filter((rate: any) => 
        rate.SourceCurrencyCode === baseCurrency &&
        targetCurrencies.includes(rate.TargetCurrencyCode)
      )
      .map((rate: any) => ({
        id: rate.Id,
        baseCurrency: rate.SourceCurrencyCode,
        targetCurrency: rate.TargetCurrencyCode,
        rate: new Decimal(rate.Rate),
        effectiveDate: new Date(rate.AsOfDate),
        source: 'quickbooks_online',
        createdAt: new Date(rate.MetaData.CreateTime),
      }));
  }

  async updateExchangeRates(rates: Omit<CurrencyExchangeRate, 'id'>[]): Promise<void> {
    for (const rate of rates) {
      await this.makeRequest('POST', '/exchangerate', {
        SourceCurrencyCode: rate.baseCurrency,
        TargetCurrencyCode: rate.targetCurrency,
        Rate: rate.rate.toString(),
        AsOfDate: this.formatDate(rate.effectiveDate),
      });
    }
  }

  // ============================================================================
  // SYNC & UTILITIES
  // ============================================================================

  async getSyncJobStatus(jobId: string): Promise<SyncJob> {
    // In a real implementation, this would query a sync job database
    throw new Error('getSyncJobStatus not yet implemented');
  }

  async validateJournalEntry(entry: Omit<JournalEntry, 'id' | 'externalId'>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate balanced entry
    if (!entry.totalDebit.equals(entry.totalCredit)) {
      errors.push('Journal entry is not balanced. Debits must equal credits.');
    }

    // Validate all lines have valid accounts
    for (const line of entry.lines) {
      if (!line.accountId) {
        errors.push(`Line ${line.lineNumber}: Missing account ID`);
      }
    }

    // Validate date
    if (entry.entryDate > new Date()) {
      errors.push('Entry date cannot be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getSystemInfo(): Promise<ERPSystemInfo> {
    const companyInfo = await this.makeRequest('GET', `/companyinfo/${this.realmId}`);
    const company = companyInfo.CompanyInfo;

    return {
      systemName: 'QuickBooks Online',
      version: 'v3',
      baseCurrency: company.Currency || 'CAD',
      fiscalYearStart: new Date(company.FiscalYearStartMonth ? `${new Date().getFullYear()}-${company.FiscalYearStartMonth}-01` : `${new Date().getFullYear()}-01-01`),
      decimalPlaces: 2,
      dateFormat: 'YYYY-MM-DD',
      capabilities: {
        supportsMultiCurrency: true,
        supportsMultiEntity: false,
        supportsDepartments: true,
        supportsLocations: true,
        supportsProjects: false,
        supportsClasses: true,
        supportsInventory: true,
        supportsPayroll: true,
        supportsFixedAssets: true,
        supportsBudgets: true,
        supportsAutomatedBankFeeds: true,
        maxJournalEntryLines: 1000,
        apiRateLimit: {
          requestsPerMinute: 500,
          requestsPerDay: 5000,
        },
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async makeRequest(method: string, endpoint: string, params?: any): Promise<any> {
    if (!this.connected && method !== 'GET') {
      await this.connect();
    }

    const url = new URL(`${this.baseUrl}/company/${this.realmId}${endpoint}`);
    if (method === 'GET' && params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(params) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`QuickBooks API error: ${error.Fault?.Error?.[0]?.Message || response.statusText}`);
    }

    return response.json();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private mapQBAccountToChartOfAccount(qbAccount: any): ChartOfAccount {
    return {
      id: qbAccount.Id,
      externalId: qbAccount.Id,
      accountNumber: qbAccount.AcctNum || '',
      accountName: qbAccount.Name,
      accountType: this.mapQBAccountType(qbAccount.AccountType),
      parentAccountId: qbAccount.ParentRef?.value,
      isActive: qbAccount.Active,
      isHeader: qbAccount.AccountSubType === 'Header',
      currency: qbAccount.CurrencyRef?.value || 'CAD',
      balance: new Decimal(qbAccount.CurrentBalance || 0),
      balanceDate: new Date(),
      description: qbAccount.Description,
      metadata: {
        syncToken: qbAccount.SyncToken,
        accountSubType: qbAccount.AccountSubType,
      },
      createdAt: new Date(qbAccount.MetaData.CreateTime),
      updatedAt: new Date(qbAccount.MetaData.LastUpdatedTime),
      syncedAt: new Date(),
    };
  }

  private mapChartOfAccountToQB(account: Partial<ChartOfAccount>): any {
    return {
      Name: account.accountName,
      AcctNum: account.accountNumber,
      AccountType: this.mapAccountTypeToQB(account.accountType!),
      Active: account.isActive,
      Description: account.description,
      ParentRef: account.parentAccountId ? { value: account.parentAccountId } : undefined,
    };
  }

  private mapQBAccountType(qbType: string): AccountType {
    const mapping: Record<string, AccountType> = {
      'Bank': AccountType.ASSET,
      'Other Current Asset': AccountType.ASSET,
      'Fixed Asset': AccountType.ASSET,
      'Other Asset': AccountType.ASSET,
      'Accounts Receivable': AccountType.ASSET,
      'Accounts Payable': AccountType.LIABILITY,
      'Credit Card': AccountType.LIABILITY,
      'Long Term Liability': AccountType.LIABILITY,
      'Other Current Liability': AccountType.LIABILITY,
      'Equity': AccountType.EQUITY,
      'Income': AccountType.REVENUE,
      'Other Income': AccountType.REVENUE,
      'Expense': AccountType.EXPENSE,
      'Other Expense': AccountType.EXPENSE,
      'Cost of Goods Sold': AccountType.EXPENSE,
    };
    return mapping[qbType] || AccountType.ASSET;
  }

  private mapAccountTypeToQB(type: AccountType): string {
    const mapping: Record<AccountType, string> = {
      [AccountType.ASSET]: 'Other Current Asset',
      [AccountType.LIABILITY]: 'Other Current Liability',
      [AccountType.EQUITY]: 'Equity',
      [AccountType.REVENUE]: 'Income',
      [AccountType.EXPENSE]: 'Expense',
      [AccountType.CONTRA_ASSET]: 'Other Current Asset',
      [AccountType.CONTRA_LIABILITY]: 'Other Current Liability',
    };
    return mapping[type];
  }

  private mapQBJournalEntryToJournalEntry(qbEntry: any): JournalEntry {
    const lines = qbEntry.Line.map((line: any, index: number) => ({
      id: line.Id,
      lineNumber: index + 1,
      accountId: line.JournalEntryLineDetail.AccountRef.value,
      accountNumber: line.JournalEntryLineDetail.AccountRef.name,
      accountName: line.JournalEntryLineDetail.AccountRef.name,
      debitAmount: new Decimal(line.JournalEntryLineDetail.PostingType === 'Debit' ? line.Amount : 0),
      creditAmount: new Decimal(line.JournalEntryLineDetail.PostingType === 'Credit' ? line.Amount : 0),
      description: line.Description,
      departmentId: line.JournalEntryLineDetail.DepartmentRef?.value,
    }));

    return {
      id: qbEntry.Id,
      externalId: qbEntry.Id,
      entryNumber: qbEntry.DocNumber || qbEntry.Id,
      entryDate: new Date(qbEntry.TxnDate),
      postingDate: new Date(qbEntry.TxnDate),
      description: qbEntry.PrivateNote || '',
      currency: qbEntry.CurrencyRef?.value || 'CAD',
      totalDebit: lines.reduce((sum: Decimal, l: any) => sum.plus(l.debitAmount), new Decimal(0)),
      totalCredit: lines.reduce((sum: Decimal, l: any) => sum.plus(l.creditAmount), new Decimal(0)),
      isPosted: true,
      isReversed: false,
      lines,
      createdBy: 'quickbooks',
      metadata: {
        syncToken: qbEntry.SyncToken,
      },
      createdAt: new Date(qbEntry.MetaData.CreateTime),
      updatedAt: new Date(qbEntry.MetaData.LastUpdatedTime),
      syncedAt: new Date(),
    };
  }

  private mapJournalEntryToQB(entry: Omit<JournalEntry, 'id' | 'externalId'>): any {
    return {
      TxnDate: this.formatDate(entry.entryDate),
      PrivateNote: entry.description,
      Line: entry.lines.map(line => ({
        Amount: (line.debitAmount.greaterThan(0) ? line.debitAmount : line.creditAmount).toString(),
        DetailType: 'JournalEntryLineDetail',
        JournalEntryLineDetail: {
          PostingType: line.debitAmount.greaterThan(0) ? 'Debit' : 'Credit',
          AccountRef: {
            value: line.accountId,
          },
        },
        Description: line.description,
      })),
    };
  }

  private mapQBInvoiceToInvoice(qbInvoice: any): Invoice {
    // Implementation similar to other mapping methods
    // Shortened for brevity
    throw new Error('mapQBInvoiceToInvoice not fully implemented');
  }

  private mapInvoiceToQB(invoice: Partial<Invoice>): any {
    throw new Error('mapInvoiceToQB not fully implemented');
  }

  private mapQBPaymentToPayment(qbPayment: any): Payment {
    throw new Error('mapQBPaymentToPayment not fully implemented');
  }

  private mapPaymentToQB(payment: Omit<Payment, 'id' | 'externalId'>): any {
    throw new Error('mapPaymentToQB not fully implemented');
  }

  private mapQBAccountToBankAccount(qbAccount: any): BankAccount {
    throw new Error('mapQBAccountToBankAccount not fully implemented');
  }

  private mapQBReportToBalanceSheet(response: any, asOfDate: Date): BalanceSheet {
    throw new Error('mapQBReportToBalanceSheet not fully implemented');
  }

  private mapQBReportToIncomeStatement(response: any, dateRange: DateRange): IncomeStatement {
    throw new Error('mapQBReportToIncomeStatement not fully implemented');
  }

  private mapQBReportToCashFlow(response: any, dateRange: DateRange): CashFlowStatement {
    throw new Error('mapQBReportToCashFlow not fully implemented');
  }

  private mapQBReportToAgedReceivables(response: any, asOfDate: Date): AgedReceivablesReport {
    throw new Error('mapQBReportToAgedReceivables not fully implemented');
  }
}
