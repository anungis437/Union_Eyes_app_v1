/**
 * Xero Connector
 * 
 * Implementation of ERPConnector interface for Xero.
 * Uses Xero API v2.0 with OAuth2.
 */

import { Decimal } from 'decimal.js';
import { logger } from '@/lib/logger';
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
  ERPSystem,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types';

/**
 * Xero Connector Implementation
 */
export class XeroConnector implements ERPConnector {
  private config: ERPConnectorConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private tenantId?: string;
  private baseUrl: string = 'https://api.xero.com/api.xro/2.0';
  private connected: boolean = false;

  constructor(config: ERPConnectorConfig) {
    this.config = config;
    this.accessToken = config.credentials.accessToken;
    this.refreshToken = config.credentials.refreshToken;
    this.tenantId = config.credentials.companyId; // Xero tenant ID
  }

  // ============================================================================
  // CONNECTION & AUTHENTICATION
  // ============================================================================

  async connect(): Promise<void> {
    if (!this.accessToken || !this.tenantId) {
      throw new Error('Xero credentials not configured');
    }

    // Test the connection
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Xero');
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/Organisations');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async refreshAuth(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('Refresh token not available');
    }

    const tokenUrl = 'https://identity.xero.com/connect/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.credentials.clientId || '',
        client_secret: this.config.credentials.clientSecret || '',
        refresh_token: this.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Xero token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
  }

  // ============================================================================
  // CHART OF ACCOUNTS
  // ============================================================================

  async importChartOfAccounts(): Promise<ChartOfAccount[]> {
    const response = await this.makeRequest('GET', '/Accounts');

    const accounts = response.Accounts || [];
    return accounts.map((xeroAccount: any) =>
      this.mapXeroAccountToChartOfAccount(xeroAccount)
    );
  }

  async getAccount(accountId: string): Promise<ChartOfAccount> {
    const response = await this.makeRequest('GET', `/Accounts/${accountId}`);
    return this.mapXeroAccountToChartOfAccount(response.Accounts[0]);
  }

  async createAccount(account: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const xeroAccount = this.mapChartOfAccountToXero(account);
    const response = await this.makeRequest('PUT', '/Accounts', { Accounts: [xeroAccount] });
    return this.mapXeroAccountToChartOfAccount(response.Accounts[0]);
  }

  async updateAccount(
    accountId: string,
    account: Partial<ChartOfAccount>
  ): Promise<ChartOfAccount> {
    const xeroAccount = this.mapChartOfAccountToXero(account, accountId);
    const response = await this.makeRequest('POST', `/Accounts/${accountId}`, xeroAccount);
    return this.mapXeroAccountToChartOfAccount(response.Accounts[0]);
  }

  // ============================================================================
  // JOURNAL ENTRIES
  // ============================================================================

  async exportJournalEntries(dateRange?: DateRange): Promise<JournalEntry[]> {
    let path = '/ManualJournals';
    if (dateRange) {
      const whereConditions = [];
      if (dateRange.startDate) {
        whereConditions.push(
          `Date>=DateTime(${dateRange.startDate.getFullYear()},${
            dateRange.startDate.getMonth() + 1
          },${dateRange.startDate.getDate()})`
        );
      }
      if (dateRange.endDate) {
        whereConditions.push(
          `Date<=DateTime(${dateRange.endDate.getFullYear()},${
            dateRange.endDate.getMonth() + 1
          },${dateRange.endDate.getDate()})`
        );
      }
      if (whereConditions.length > 0) {
        path += `?where=${whereConditions.join('&&')}`;
      }
    }

    const response = await this.makeRequest('GET', path);
    const entries = response.ManualJournals || [];

    return entries.map((entry: any) => this.mapXeroJournalEntryToChartOfAccount(entry));
  }

  async importJournalEntries(dateRange: DateRange): Promise<JournalEntry[]> {
    return this.exportJournalEntries(dateRange);
  }

  async createJournalEntry(
    entry: Omit<JournalEntry, 'id' | 'externalId'>
  ): Promise<JournalEntry> {
    const xeroEntry = this.mapJournalEntryToXero(entry);
    const response = await this.makeRequest('PUT', '/ManualJournals', {
      ManualJournals: [xeroEntry],
    });

    return this.mapXeroJournalEntryToChartOfAccount(response.ManualJournals[0]);
  }

  async getJournalEntry(entryId: string): Promise<JournalEntry> {
    const response = await this.makeRequest('GET', `/ManualJournals/${entryId}`);
    return this.mapXeroJournalEntryToChartOfAccount(response.ManualJournals[0]);
  }

  async reverseJournalEntry(
    entryId: string,
    reversalDate: Date,
    memo?: string
  ): Promise<JournalEntry> {
    const original = await this.getJournalEntry(entryId);

    const reversalEntry: Omit<JournalEntry, 'id' | 'externalId'> = {
      entryNumber: `REV-${original.entryNumber}`,
      entryDate: reversalDate,
      postingDate: reversalDate,
      description: `Reversal of ${original.description}. ${memo || ''}`,
      reference: original.reference,
      currency: original.currency,
      totalDebit: original.totalCredit,
      totalCredit: original.totalDebit,
      isPosted: false,
      isReversed: false,
      reversalEntryId: original.id,
      lines: original.lines.map((line) => ({
        ...line,
        debitAmount: line.creditAmount,
        creditAmount: line.debitAmount,
      })),
      attachments: [],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.createJournalEntry(reversalEntry);
  }

  async voidInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    // Xero voids invoices by updating their status
    const invoice = await this.getInvoice(invoiceId);
    const response = await this.makeRequest('POST', `/Invoices/${invoiceId}`, {
      Status: 'VOIDED',
    });
    return this.mapXeroInvoiceToChartOfAccount(response.Invoices[0]);
  }

  async syncPayments(dateRange?: DateRange): Promise<SyncJob> {
    const startTime = new Date();
    const jobId = `sync-payments-${Date.now()}`;
    
    try {
      const payments = await this.importPayments(
        dateRange || { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() }
      );
      
      return {
        id: jobId,
        erpSystem: ERPSystem.XERO,
        entityType: 'payment',
        direction: SyncDirection.PULL,
        status: SyncStatus.SUCCESS,
        startedAt: startTime,
        completedAt: new Date(),
        recordsProcessed: payments.data.length,
        recordsSucceeded: payments.data.length,
        recordsFailed: 0,
      };
    } catch (error) {
      return {
        id: jobId,
        erpSystem: ERPSystem.XERO,
        entityType: 'payment',
        direction: SyncDirection.PULL,
        status: SyncStatus.FAILED,
        startedAt: startTime,
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

  // ============================================================================
  // INVOICES
  // ============================================================================

  async exportInvoices(
    dateRange?: DateRange,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Invoice>> {
    let path = '/Invoices';
    const filters = [];

    if (dateRange?.startDate) {
      filters.push(
        `InvoiceDate>=DateTime(${dateRange.startDate.getFullYear()},${
          dateRange.startDate.getMonth() + 1
        },${dateRange.startDate.getDate()})`
      );
    }
    if (dateRange?.endDate) {
      filters.push(
        `InvoiceDate<=DateTime(${dateRange.endDate.getFullYear()},${
          dateRange.endDate.getMonth() + 1
        },${dateRange.endDate.getDate()})`
      );
    }

    if (filters.length > 0) {
      path += `?where=${filters.join('&&')}`;
    }

    path += `${filters.length ? '&' : '?'}order=InvoiceNumber DESC&page=${pagination?.page || 1}`;

    const response = await this.makeRequest('GET', path);
    const invoices = response.Invoices || [];

    return {
      data: invoices.map((invoice: any) => this.mapXeroInvoiceToChartOfAccount(invoice)),
      total: invoices.length,
      page: pagination?.page || 1,
      limit: pagination?.limit || 100,
      hasMore: false,
    };
  }

  async importInvoices(
    dateRange: DateRange,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Invoice>> {
    return this.exportInvoices(dateRange, pagination);
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'externalId'>): Promise<Invoice> {
    const xeroInvoice = this.mapInvoiceToXero(invoice);
    const response = await this.makeRequest('PUT', '/Invoices', { Invoices: [xeroInvoice] });
    return this.mapXeroInvoiceToChartOfAccount(response.Invoices[0]);
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await this.makeRequest('GET', `/Invoices/${invoiceId}`);
    return this.mapXeroInvoiceToChartOfAccount(response.Invoices[0]);
  }

  async updateInvoice(invoiceId: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const xeroInvoice = this.mapInvoiceToXero(invoice, invoiceId);
    const response = await this.makeRequest('POST', `/Invoices/${invoiceId}`, xeroInvoice);
    return this.mapXeroInvoiceToChartOfAccount(response.Invoices[0]);
  }

  async markInvoicePaid(invoiceId: string, paymentAmount: Decimal): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    const payment = {
      Account: {
        Code: invoice.customerName, // Placeholder - would need real account mapping
      },
      Amount: paymentAmount.toNumber(),
      Date: new Date(),
      Invoice: {
        InvoiceID: invoiceId,
      },
    };

    await this.makeRequest('PUT', '/Payments', { Payments: [payment] });
    return this.getInvoice(invoiceId);
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  async exportPayments(
    dateRange?: DateRange,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Payment>> {
    let path = '/Payments';

    const page = pagination?.page || 1;
    path += `?page=${page}`;

    const response = await this.makeRequest('GET', path);
    const payments = response.Payments || [];

    return {
      data: payments.map((payment: any) => this.mapXeroPaymentToChartOfAccount(payment)),
      total: payments.length,
      page,
      limit: pagination?.limit || 100,
      hasMore: false,
    };
  }

  async importPayments(
    dateRange: DateRange,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Payment>> {
    return this.exportPayments(dateRange, pagination);
  }

  async createPayment(payment: Omit<Payment, 'id' | 'externalId'>): Promise<Payment> {
    const xeroPayment = this.mapPaymentToXero(payment);
    const response = await this.makeRequest('PUT', '/Payments', { Payments: [xeroPayment] });
    return this.mapXeroPaymentToChartOfAccount(response.Payments[0]);
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.makeRequest('GET', `/Payments/${paymentId}`);
    return this.mapXeroPaymentToChartOfAccount(response.Payments[0]);
  }

  async voidPayment(paymentId: string, reason?: string): Promise<Payment> {
    // Xero doesn't have direct void - need to reverse with negative amount
    const payment = await this.getPayment(paymentId);

    const reversal = {
      Account: payment.bankAccount,
      Amount: -payment.amount.toNumber(),
      Reference: `Void - ${reason || ''}`,
    };

    await this.makeRequest('PUT', '/Payments', { Payments: [reversal] });
    return this.getPayment(paymentId);
  }

  // ============================================================================
  // FINANCIAL STATEMENTS
  // ============================================================================

  async getBalanceSheet(asOfDate: Date): Promise<BalanceSheet> {
    // Xero doesn't have a direct balance sheet endpoint
    // We need to calculate it from chart of accounts with balances
    const accounts = await this.importChartOfAccounts();

    const assets = accounts.filter((a) => a.accountType === AccountType.ASSET);
    const liabilities = accounts.filter((a) => a.accountType === AccountType.LIABILITY);
    const equity = accounts.filter((a) => a.accountType === AccountType.EQUITY);

    const assetAccounts = assets.map((a) => ({
      accountId: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      balance: a.balance || new Decimal(0),
      percentOfTotal: 0,
    }));

    const liabilityAccounts = liabilities.map((a) => ({
      accountId: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      balance: a.balance || new Decimal(0),
      percentOfTotal: 0,
    }));

    const equityAccounts = equity.map((a) => ({
      accountId: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      balance: a.balance || new Decimal(0),
      percentOfTotal: 0,
    }));

    const totalAssets = assetAccounts.reduce((sum, a) => sum.plus(a.balance), new Decimal(0));
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum.plus(a.balance), new Decimal(0));
    const totalEquity = equityAccounts.reduce((sum, a) => sum.plus(a.balance), new Decimal(0));

    return {
      asOfDate,
      currency: 'CAD',
      assets: {
        accounts: assetAccounts,
        subtotal: totalAssets,
      },
      liabilities: {
        accounts: liabilityAccounts,
        subtotal: totalLiabilities,
      },
      equity: {
        accounts: equityAccounts,
        subtotal: totalEquity,
      },
      totalAssets,
      totalLiabilities,
      totalEquity,
      generatedAt: new Date(),
    };
  }

  async getIncomeStatement(dateRange: DateRange): Promise<IncomeStatement> {
    const accounts = await this.importChartOfAccounts();

    const revenues = accounts.filter((a) => a.accountType === AccountType.REVENUE);
    const expenses = accounts.filter((a) => a.accountType === AccountType.EXPENSE);

    const revenueAccounts = revenues.map((a) => ({
      accountId: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      amount: a.balance || new Decimal(0),
      percentOfRevenue: 0,
    }));

    const expenseAccounts = expenses.map((a) => ({
      accountId: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      amount: a.balance || new Decimal(0),
      percentOfRevenue: 0,
    }));

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
    const netIncome = totalRevenue.minus(totalExpenses);

    return {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      currency: 'CAD',
      revenue: {
        accounts: revenueAccounts,
        subtotal: totalRevenue,
      },
      expenses: {
        accounts: expenseAccounts,
        subtotal: totalExpenses,
      },
      totalRevenue,
      totalExpenses,
      netIncome,
      generatedAt: new Date(),
    };
  }

  async getCashFlowStatement(dateRange: DateRange): Promise<CashFlowStatement> {
    // Simplified - would need transaction analysis for real cash flow
    const operating = {
      items: [
        { description: 'Operating activities', amount: new Decimal(0) },
      ],
      subtotal: new Decimal(0),
    };

    const investing = {
      items: [
        { description: 'Investing activities', amount: new Decimal(0) },
      ],
      subtotal: new Decimal(0),
    };

    const financing = {
      items: [
        { description: 'Financing activities', amount: new Decimal(0) },
      ],
      subtotal: new Decimal(0),
    };

    return {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      currency: 'CAD',
      operatingActivities: operating,
      investingActivities: investing,
      financingActivities: financing,
      netCashFlow: new Decimal(0),
      beginningCash: new Decimal(0),
      endingCash: new Decimal(0),
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  async getAgedReceivablesReport(asOfDate: Date): Promise<AgedReceivablesReport> {
    const response = await this.makeRequest('GET', '/Reports/AgeingPayablesByContact?date=' + asOfDate.toISOString().split('T')[0]);

    return {
      asOfDate,
      currency: 'CAD',
      customers: [],
      totalCurrent: new Decimal(0),
      total1to30: new Decimal(0),
      total31to60: new Decimal(0),
      total61to90: new Decimal(0),
      totalOver90: new Decimal(0),
      totalOutstanding: new Decimal(0),
      generatedAt: new Date(),
    };
  }

  async getBudgetVarianceReport(dateRange: DateRange): Promise<BudgetVarianceReport> {
    return {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      currency: 'CAD',
      accounts: [],
      totalBudget: new Decimal(0),
      totalActual: new Decimal(0),
      totalVariance: new Decimal(0),
      variancePercent: 0,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // BANKING
  // ============================================================================

  async importBankAccounts(): Promise<BankAccount[]> {
    const response = await this.makeRequest('GET', '/Accounts?where=Type=="BANK"');
    const accounts = response.Accounts || [];

    return accounts.map((account: any) => ({
      id: account.AccountID,
      externalId: account.AccountID,
      bankName: account.Description || '',
      accountNumber: account.Code,
      accountType: 'checking' as const,
      currency: 'CAD',
      currentBalance: new Decimal(account.UpdatedUtcDate ? 0 : 0), // Xero doesn't provide balance in list
      availableBalance: new Decimal(0),
      isActive: true,
      glAccountId: account.AccountID,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async importBankTransactions(
    bankAccountId: string,
    dateRange: DateRange
  ): Promise<BankTransaction[]> {
    let path = `/BankTransactions?where=Status=="AUTHORISED"`;

    if (dateRange.startDate) {
      path += `&&DateString>="${dateRange.startDate.toISOString().split('T')[0]}"`;
    }
    if (dateRange.endDate) {
      path += `&&DateString<="${dateRange.endDate.toISOString().split('T')[0]}"`;
    }

    const response = await this.makeRequest('GET', path);
    const transactions = response.BankTransactions || [];

    return transactions
      .filter((t: any) => t.LineItems?.some((li: any) => li.AccountCode === bankAccountId))
      .map((transaction: any) => {
        const quantity = new Decimal(transaction.LineItems[0]?.Quantity || 0);
        return {
          id: transaction.BankTransactionID,
          bankAccountId,
          transactionDate: new Date(transaction.DateString),
          postingDate: new Date(transaction.DateString),
          description: transaction.LineItems[0]?.Description || '',
          amount: quantity.abs(),
          type: (quantity.greaterThan(0) ? 'credit' : 'debit') as 'credit' | 'debit',
          balance: new Decimal(0),
          reference: transaction.Reference || '',
          isReconciled: false,
        };
      });
  }

  // ============================================================================
  // CURRENCY
  // ============================================================================

  async getExchangeRates(
    baseCurrency: string,
    targetCurrencies: string[]
  ): Promise<CurrencyExchangeRate[]> {
    // Xero doesn't have exchange rate API - would need external service
    return targetCurrencies.map((currency) => ({
      id: `${baseCurrency}-${currency}`,
      baseCurrency,
      targetCurrency: currency,
      rate: new Decimal(1),
      effectiveDate: new Date(),
      source: 'manual',
      createdAt: new Date(),
    }));
  }

  async updateExchangeRates(rates: Omit<CurrencyExchangeRate, 'id'>[]): Promise<void> {
    // Xero doesn't support exchange rate updates via API
    logger.warn('Xero does not support exchange rate updates via API');
  }

  // ============================================================================
  // SYNC & UTILITIES
  // ============================================================================

  async getSyncJobStatus(jobId: string): Promise<SyncJob> {
    // Simplified - would need actual job tracking
    return {
      id: jobId,
      erpSystem: ERPSystem.XERO,
      entityType: 'journal_entries',
      direction: SyncDirection.PULL,
      status: SyncStatus.SUCCESS,
      startedAt: new Date(),
      completedAt: new Date(),
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    };
  }

  async validateJournalEntry(
    entry: Omit<JournalEntry, 'id' | 'externalId'>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check that debits equal credits
    const totalDebits = entry.lines.reduce((sum, line) => sum.plus(line.debitAmount), new Decimal(0));
    const totalCredits = entry.lines.reduce((sum, line) => sum.plus(line.creditAmount), new Decimal(0));

    if (!totalDebits.equals(totalCredits)) {
      errors.push('Debits must equal credits');
    }

    // Check minimum 2 lines
    if (entry.lines.length < 2) {
      errors.push('Journal entry must have at least 2 lines');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getSystemInfo(): Promise<ERPSystemInfo> {
    const response = await this.makeRequest('GET', '/Organisations');
    const org = response.Organisations[0];

    return {
      systemName: 'Xero',
      version: '2.0',
      baseCurrency: org.BaseCurrency || 'CAD',
      fiscalYearStart: new Date(org.FinancialYearEndDay, org.FinancialYearEndMonth - 1, 1),
      decimalPlaces: 2,
      dateFormat: 'YYYY-MM-DD',
      capabilities: {
        supportsMultiCurrency: true,
        supportsMultiEntity: true,
        supportsDepartments: false,
        supportsLocations: false,
        supportsProjects: false,
        supportsClasses: true,
        supportsInventory: true,
        supportsPayroll: false,
        supportsFixedAssets: true,
        supportsBudgets: false,
        supportsAutomatedBankFeeds: true,
        maxJournalEntryLines: 100,
        apiRateLimit: {
          requestsPerMinute: 60,
          requestsPerDay: 5000,
        },
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async makeRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Xero');
    }

    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Xero-tenant-id': this.tenantId || '',
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
      await this.refreshAuth();
      return this.makeRequest(method, path, body);
    }

    if (!response.ok) {
      throw new Error(`Xero API error: ${response.statusText}`);
    }

    return response.json();
  }

  private mapXeroAccountToChartOfAccount(xeroAccount: any): ChartOfAccount {
    const typeMap: { [key: string]: AccountType } = {
      'BANK': AccountType.ASSET,
      'CURRENT ASSET': AccountType.ASSET,
      'FIXED ASSET': AccountType.ASSET,
      'CURRENT LIABILITY': AccountType.LIABILITY,
      'LONG-TERM LIABILITY': AccountType.LIABILITY,
      'EQUITY': AccountType.EQUITY,
      'REVENUE': AccountType.REVENUE,
      'OVERHEAD': AccountType.EXPENSE,
      'COGS': AccountType.EXPENSE,
      'DEPRECIATION': AccountType.EXPENSE,
    };

    return {
      id: xeroAccount.AccountID,
      externalId: xeroAccount.AccountID,
      accountNumber: xeroAccount.Code,
      accountName: xeroAccount.Name,
      accountType: typeMap[xeroAccount.Type] || AccountType.ASSET,
      isActive: xeroAccount.Status === 'ACTIVE',
      isHeader: false,
      currency: 'CAD',
      balance: new Decimal(xeroAccount.UpdatedUtcDate ? 0 : 0),
      balanceDate: new Date(xeroAccount.UpdatedUtcDate || Date.now()),
      description: xeroAccount.Description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapChartOfAccountToXero(account: Partial<ChartOfAccount>, id?: string): any {
    const typeMap: Record<AccountType, string> = {
      [AccountType.ASSET]: 'CURRENT ASSET',
      [AccountType.LIABILITY]: 'CURRENT LIABILITY',
      [AccountType.EQUITY]: 'EQUITY',
      [AccountType.REVENUE]: 'REVENUE',
      [AccountType.EXPENSE]: 'OVERHEAD',
      [AccountType.CONTRA_ASSET]: 'CURRENT ASSET',
      [AccountType.CONTRA_LIABILITY]: 'CURRENT LIABILITY',
    };

    return {
      Code: account.accountNumber,
      Name: account.accountName,
      Type: typeMap[account.accountType || AccountType.ASSET],
      Description: account.description,
      ...(id && { AccountID: id }),
    };
  }

  private mapXeroJournalEntryToChartOfAccount(entry: any): JournalEntry {
    const lines = entry.LineItems?.map((line: any, index: number) => ({
      id: `${entry.ManualJournalID}-${index}`,
      lineNumber: index + 1,
      accountId: line.AccountCode,
      accountNumber: line.AccountCode,
      accountName: line.Description || '',
      debitAmount: new Decimal(line.LineAmount > 0 ? line.LineAmount : 0),
      creditAmount: new Decimal(line.LineAmount < 0 ? Math.abs(line.LineAmount) : 0),
      description: line.Description,
    })) || [];

    const totalDebit = lines.reduce((sum: Decimal, line: any) => sum.plus(line.debitAmount), new Decimal(0));
    const totalCredit = lines.reduce((sum: Decimal, line: any) => sum.plus(line.creditAmount), new Decimal(0));

    return {
      id: entry.ManualJournalID,
      externalId: entry.ManualJournalID,
      entryNumber: entry.ManualJournalID,
      entryDate: new Date(entry.Date),
      postingDate: new Date(entry.Date),
      description: entry.Narrative || '',
      currency: 'CAD',
      totalDebit,
      totalCredit,
      isPosted: true,
      isReversed: false,
      lines,
      createdBy: 'xero',
      createdAt: new Date(entry.UpdatedDateUTC || Date.now()),
      updatedAt: new Date(entry.UpdatedDateUTC || Date.now()),
    };
  }

  private mapJournalEntryToXero(entry: Omit<JournalEntry, 'id' | 'externalId'>): any {
    return {
      Narrative: entry.description,
      Date: entry.entryDate.toISOString().split('T')[0],
      LineItems: entry.lines.map((line) => ({
        AccountCode: line.accountId,
        Description: line.description,
        LineAmount: line.debitAmount.gt(0) ? line.debitAmount.toNumber() : -line.creditAmount.toNumber(),
        Tracking: [],
      })),
    };
  }

  private mapXeroInvoiceToChartOfAccount(invoice: any): Invoice {
    const lines = invoice.LineItems?.map((line: any, index: number) => ({
      id: `${invoice.InvoiceID}-${index}`,
      lineNumber: index + 1,
      description: line.Description || '',
      quantity: new Decimal(line.Quantity || 1),
      unitPrice: new Decimal(line.UnitAmount || 0),
      amount: new Decimal(line.LineAmount || 0),
      taxAmount: new Decimal(line.TaxAmount || 0),
      accountId: line.AccountCode,
    })) || [];

    const statusMap: Record<string, InvoiceStatus> = {
      'DRAFT': InvoiceStatus.DRAFT,
      'SUBMITTED': InvoiceStatus.SENT,
      'AUTHORISED': InvoiceStatus.PENDING,
      'PAID': InvoiceStatus.PAID,
      'VOIDED': InvoiceStatus.VOID,
    };

    return {
      id: invoice.InvoiceID,
      externalId: invoice.InvoiceID,
      invoiceNumber: invoice.InvoiceNumber || '',
      invoiceDate: new Date(invoice.DateString),
      dueDate: new Date(invoice.DueDateString),
      customerId: invoice.Contact?.ContactID || '',
      customerName: invoice.Contact?.Name || '',
      currency: invoice.CurrencyCode || 'CAD',
      subtotal: new Decimal(invoice.SubTotal || 0),
      taxAmount: new Decimal(invoice.TotalTax || 0),
      totalAmount: new Decimal(invoice.Total || 0),
      amountPaid: new Decimal(invoice.AmountPaid || 0),
      amountDue: new Decimal(invoice.AmountDue || 0),
      status: statusMap[invoice.Status] || InvoiceStatus.DRAFT,
      lines,
      createdAt: new Date(invoice.UpdatedDateUTC || Date.now()),
      updatedAt: new Date(invoice.UpdatedDateUTC || Date.now()),
    };
  }

  private mapInvoiceToXero(invoice: Partial<Invoice>, id?: string): any {
    return {
      Type: 'ACCREC',
      Contact: {
        Name: invoice.customerName,
      },
      InvoiceNumber: invoice.invoiceNumber,
      DateString: invoice.invoiceDate?.toISOString().split('T')[0],
      DueDateString: invoice.dueDate?.toISOString().split('T')[0],
      LineItems: invoice.lines?.map((line) => ({
        Description: line.description,
        Quantity: line.quantity?.toNumber(),
        UnitAmount: line.unitPrice?.toNumber(),
        AccountCode: line.accountId,
      })) || [],
      ...(id && { InvoiceID: id }),
    };
  }

  private mapXeroPaymentToChartOfAccount(payment: any): Payment {
    return {
      id: payment.PaymentID,
      externalId: payment.PaymentID,
      paymentNumber: payment.PaymentID,
      paymentDate: new Date(payment.DateString),
      paymentMethod: PaymentMethod.OTHER,
      amount: new Decimal(payment.Amount || 0),
      currency: payment.CurrencyCode || 'CAD',
      customerId: payment.Invoice?.Contact?.ContactID || '',
      customerName: payment.Invoice?.Contact?.Name || '',
      reference: payment.Reference || '',
      bankAccount: payment.Account?.AccountID || '',
      depositToAccount: payment.Account?.AccountID || '',
      unappliedAmount: new Decimal(0),
      applications: payment.Invoice ? [{
        invoiceId: payment.Invoice.InvoiceID,
        invoiceNumber: payment.Invoice.InvoiceNumber || '',
        amountApplied: new Decimal(payment.Amount || 0),
        appliedDate: new Date(payment.DateString),
      }] : [],
      status: PaymentStatus.CLEARED,
      createdAt: new Date(payment.UpdatedDateUTC || Date.now()),
      updatedAt: new Date(payment.UpdatedDateUTC || Date.now()),
    };
  }

  private mapPaymentToXero(payment: Omit<Payment, 'id' | 'externalId'>): any {
    const firstApplication = payment.applications?.[0];
    return {
      Account: {
        Code: payment.bankAccount,
      },
      Amount: payment.amount.toNumber(),
      DateString: payment.paymentDate.toISOString().split('T')[0],
      Reference: payment.reference,
      ...(firstApplication && { Invoice: { InvoiceID: firstApplication.invoiceId } }),
    };
  }
}
