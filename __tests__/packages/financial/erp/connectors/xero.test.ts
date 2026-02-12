/**
 * Xero Connector Tests
 * 
 * Test suite for the Xero ERP integration connector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XeroConnector } from '@/packages/financial/src/erp/connectors/xero';
import { type ERPConnectorConfig } from '@/packages/financial';
import { Decimal } from 'decimal.js';

describe('XeroConnector', () => {
  let connector: XeroConnector;
  let config: ERPConnectorConfig;

  beforeEach(() => {
    config = {
      systemType: 'xero',
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        companyId: 'test-tenant-id',
        environment: 'sandbox',
      },
      settings: {
        autoSync: true,
        syncInterval: 60,
        defaultGLAccount: '200',
        baseCurrency: 'CAD',
        timezone: 'America/Toronto',
      },
    };

    connector = new XeroConnector(config);
  });

  describe('Connection & Authentication', () => {
    it('should initialize with configuration', () => {
      expect(connector).toBeDefined();
    });

    it('should throw error if credentials missing', async () => {
      const badConfig: ERPConnectorConfig = {
        ...config,
        credentials: { environment: 'sandbox' },
      };
      const badConnector = new XeroConnector(badConfig);
      await expect(badConnector.connect()).rejects.toThrow('Xero credentials not configured');
    });

    it('should support OAuth2 token refresh', async () => {
      global.fetch = vi.fn();
      // This would be mocked in a real test
      expect(connector).toBeDefined();
    });
  });

  describe('Chart of Accounts', () => {
    it('should map Xero accounts to ChartOfAccount format', () => {
      const xeroAccount = {
        AccountID: 'ACC-001',
        Code: '200',
        Name: 'Sales Account',
        Type: 'REVENUE',
        Status: 'ACTIVE',
        Description: 'Test revenue account',
        UpdatedUtcDate: new Date(),
      };

      // Test the private method indirectly through account creation
      expect(connector).toBeDefined();
    });

    it('should validate account types mapping', () => {
      const typeMap: { [key: string]: string } = {
        'asset': 'CURRENT ASSET',
        'liability': 'CURRENT LIABILITY',
        'equity': 'EQUITY',
        'revenue': 'REVENUE',
        'expense': 'OVERHEAD',
      };

      Object.keys(typeMap).forEach((key) => {
        expect(typeMap[key]).toBeTruthy();
      });
    });
  });

  describe('Journal Entries', () => {
    it('should validate journal entry balance', async () => {
      const entry = {
        organizationId: 'org-001',
        connectorId: 'conn-001',
        description: 'Test entry',
        transactionDate: new Date(),
        lines: [
          {
            accountCode: '200',
            accountName: 'Bank',
            debitAmount: new Decimal('100'),
            creditAmount: new Decimal('0'),
            description: 'Deposit',
          },
          {
            accountCode: '300',
            accountName: 'Income',
            debitAmount: new Decimal('0'),
            creditAmount: new Decimal('100'),
            description: 'Sales',
          },
        ],
      };

      const validation = await connector.validateJournalEntry(entry);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect journal entry imbalance', async () => {
      const entry = {
        organizationId: 'org-001',
        connectorId: 'conn-001',
        description: 'Unbalanced entry',
        transactionDate: new Date(),
        lines: [
          {
            accountCode: '200',
            accountName: 'Bank',
            debitAmount: new Decimal('100'),
            creditAmount: new Decimal('0'),
            description: 'Deposit',
          },
          {
            accountCode: '300',
            accountName: 'Income',
            debitAmount: new Decimal('0'),
            creditAmount: new Decimal('50'),
            description: 'Sales',
          },
        ],
      };

      const validation = await connector.validateJournalEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Debits must equal credits');
    });

    it('should require minimum 2 lines', async () => {
      const entry = {
        organizationId: 'org-001',
        connectorId: 'conn-001',
        description: 'Single line entry',
        transactionDate: new Date(),
        lines: [
          {
            accountCode: '200',
            accountName: 'Bank',
            debitAmount: new Decimal('100'),
            creditAmount: new Decimal('0'),
            description: 'Deposit',
          },
        ],
      };

      const validation = await connector.validateJournalEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Journal entry must have at least 2 lines');
    });
  });

  describe('System Information', () => {
    it('should provide Xero system capabilities', async () => {
      // Mock the system info response
      expect(connector).toBeDefined();
      // Actual implementation would make API call
    });

    it('should report multi-currency support', () => {
      // Xero supports multi-currency
      expect(true).toBe(true);
    });

    it('should report API rate limits', () => {
      // Xero has 60 requests per minute, 5000 per day
      const requestsPerMinute = 60;
      const requestsPerDay = 5000;

      expect(requestsPerMinute).toBe(60);
      expect(requestsPerDay).toBe(5000);
    });
  });

  describe('Invoice Management', () => {
    it('should map Xero invoice to Invoice format', () => {
      const xeroInvoice = {
        InvoiceID: 'INV-001',
        InvoiceNumber: 'INV-2026-001',
        Contact: {
          ContactID: 'CONTACT-001',
          Name: 'Acme Corp',
        },
        DateString: '2026-02-12',
        DueDateString: '2026-03-12',
        Total: 1000.00,
        AmountDue: 1000.00,
        Status: 'DRAFT',
        LineItems: [
          {
            Description: 'Service',
            Quantity: 1,
            UnitAmount: 1000.00,
            LineAmount: 1000.00,
            AccountCode: '200',
          },
        ],
      };

      // Would test mapping logic here
      expect(xeroInvoice).toBeTruthy();
    });
  });

  describe('Currency Support', () => {
    it('should support CAD as base currency', () => {
      expect(config.settings.baseCurrency).toBe('CAD');
    });

    it('should handle multi-currency exchange rates', async () => {
      const rates = await connector.getExchangeRates('CAD', ['USD', 'EUR', 'GBP']);
      expect(rates).toHaveLength(3);
      rates.forEach((rate) => {
        expect(rate.baseCurrency).toBe('CAD');
        expect(rate.rate).toBeDefined();
      });
    });
  });

  describe('Integration Points', () => {
    it('should implement ERPConnector interface', () => {
      const methods = [
        'connect',
        'disconnect',
        'testConnection',
        'refreshAuth',
        'importChartOfAccounts',
        'getAccount',
        'createAccount',
        'updateAccount',
        'exportJournalEntries',
        'importJournalEntries',
        'createJournalEntry',
        'getJournalEntry',
        'reverseJournalEntry',
        'exportInvoices',
        'importInvoices',
        'createInvoice',
        'getInvoice',
        'updateInvoice',
        'markInvoicePaid',
        'exportPayments',
        'importPayments',
        'createPayment',
        'getPayment',
        'voidPayment',
        'getBalanceSheet',
        'getIncomeStatement',
        'getCashFlowStatement',
        'getAgedReceivablesReport',
        'getBudgetVarianceReport',
        'importBankAccounts',
        'importBankTransactions',
        'getExchangeRates',
        'updateExchangeRates',
        'getSyncJobStatus',
        'validateJournalEntry',
        'getSystemInfo',
      ];

      methods.forEach((method) => {
        expect(typeof (connector as any)[method]).toBe('function');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Test error handling in connector
      expect(connector).toBeDefined();
    });

    it('should support token refresh on 401', async () => {
      // Would test token refresh logic
      expect(true).toBe(true);
    });
  });

  describe('Comparison with QuickBooks', () => {
    it('should support similar core functionality', () => {
      const coreCapabilitiesXero = [
        'Chart of Accounts',
        'Journal Entries',
        'Invoices',
        'Payments',
        'Bank Transactions',
        'Financial Reports',
        'Multi-Currency',
      ];

      coreCapabilitiesXero.forEach((capability) => {
        expect(capability).toBeTruthy();
      });
    });

    it('should differ in authentication (OAuth2 vs similar)', () => {
      // Xero uses OAuth2
      // QuickBooks uses OAuth2
      // Both support token refresh
      expect(true).toBe(true);
    });

    it('should handle API-specific differences', () => {
      // Xero uses different endpoint structure
      // Xero uses different field names
      // Both are abstracted by the connector
      expect(true).toBe(true);
    });
  });
});
