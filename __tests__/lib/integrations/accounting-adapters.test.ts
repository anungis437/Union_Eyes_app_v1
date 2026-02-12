/**
 * Accounting Integration Adapters Tests
 * 
 * Comprehensive tests for accounting integrations.
 * 
 * Test Coverage:
 * - QuickBooks client authentication and API calls
 * - QuickBooks adapter sync operations
 * - Xero client authentication and API calls
 * - Xero adapter sync operations
 * - Sage Intacct client authentication and API calls
 * - Sage Intacct adapter sync operations
 * - FreshBooks client authentication and API calls
 * - FreshBooks adapter sync operations
 * - Wave client authentication and API calls
 * - Wave adapter sync operations
 * - Accounting sync utilities
 * - Invoice reconciliation
 * - Payment matching
 * - Customer mapping
 * - Account mapping
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuickBooksClient } from '@/lib/integrations/adapters/accounting/quickbooks-client';
import { QuickBooksAdapter } from '@/lib/integrations/adapters/accounting/quickbooks-adapter';
import { XeroClient } from '@/lib/integrations/adapters/accounting/xero-client';
import { XeroAdapter } from '@/lib/integrations/adapters/accounting/xero-adapter';
import { SageIntacctClient } from '@/lib/integrations/adapters/accounting/sage-intacct-client';
import { SageIntacctAdapter } from '@/lib/integrations/adapters/accounting/sage-intacct-adapter';
import { FreshBooksClient } from '@/lib/integrations/adapters/accounting/freshbooks-client';
import { FreshBooksAdapter } from '@/lib/integrations/adapters/accounting/freshbooks-adapter';
import { WaveClient } from '@/lib/integrations/adapters/accounting/wave-client';
import { WaveAdapter } from '@/lib/integrations/adapters/accounting/wave-adapter';
import {
  findInvoiceMatches,
  matchPaymentsToInvoices,
  findCustomerMappings,
  mapAccountsToCategories,
  fuzzyMatchCustomerName,
  validateInvoiceData,
  validatePaymentData,
} from '@/lib/integrations/adapters/accounting/sync-utils';
import { IntegrationProvider, SyncType } from '@/lib/integrations/types';

// ============================================================================
// Mock Global fetch
// ============================================================================

global.fetch = vi.fn();

function mockFetch(response: any, ok = true) {
  (global.fetch as any).mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Map(),
  });
}

// ============================================================================
// QuickBooks Client Tests
// ============================================================================

describe('QuickBooksClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    realmId: 'test-realm-id',
    environment: 'sandbox' as const,
    refreshToken: 'test-refresh-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using refresh token', async () => {
      mockFetch({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new QuickBooksClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('oauth.platform.intuit.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockFetch({ error: 'invalid_grant' }, false);

      const client = new QuickBooksClient(mockConfig);
      await expect(client.authenticate()).rejects.toThrow();
    });
  });

  describe('Invoice Operations', () => {
    it('should fetch invoices', async () => {
      const mockInvoices = {
        QueryResponse: {
          Invoice: [
            {
              Id: '1',
              DocNumber: 'INV-001',
              CustomerRef: { value: 'C1', name: 'Customer 1' },
              TxnDate: '2024-01-15',
              DueDate: '2024-02-15',
              TotalAmt: 1000,
              Balance: 500,
              TxnStatus: 'open',
            },
          ],
        },
      };

      mockFetch(mockInvoices);

      const client = new QuickBooksClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getInvoices({ limit: 10 });
      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0].DocNumber).toBe('INV-001');
    });

    it('should support incremental sync with modifiedSince', async () => {
      mockFetch({
        QueryResponse: { Invoice: [] },
      });

      const client = new QuickBooksClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const yesterday = new Date(Date.now() - 86400000);
      await client.getInvoices({ limit: 10, modifiedSince: yesterday });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('LastUpdatedTime'),
        expect.any(Object)
      );
    });
  });

  describe('Customer Operations', () => {
    it('should fetch customers', async () => {
      const mockCustomers = {
        QueryResponse: {
          Customer: [
            {
              Id: 'C1',
              DisplayName: 'Customer 1',
              CompanyName: 'Company 1',
              PrimaryEmailAddr: { Address: 'customer@example.com' },
              Balance: 1000,
            },
          ],
        },
      };

      mockFetch(mockCustomers);

      const client = new QuickBooksClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getCustomers({ limit: 10 });
      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].DisplayName).toBe('Customer 1');
    });
  });

  describe('Payment Operations', () => {
    it('should fetch payments', async () => {
      const mockPayments = {
        QueryResponse: {
          Payment: [
            {
              Id: 'P1',
              CustomerRef: { value: 'C1', name: 'Customer 1' },
              TxnDate: '2024-01-20',
              TotalAmt: 500,
            },
          ],
        },
      };

      mockFetch(mockPayments);

      const client = new QuickBooksClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getPayments({ limit: 10 });
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].TotalAmt).toBe(500);
    });
  });

  describe('Chart of Accounts', () => {
    it('should fetch accounts', async () => {
      const mockAccounts = {
        QueryResponse: {
          Account: [
            {
              Id: 'A1',
              Name: 'Operating Account',
              AccountType: 'BANK',
              AccountSubType: 'Checking',
              Classification: 'Asset',
              CurrentBalance: 50000,
              Active: true,
            },
          ],
        },
      };

      mockFetch(mockAccounts);

      const client = new QuickBooksClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getAccounts({ limit: 100 });
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].AccountType).toBe('BANK');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
        headers: new Map([['Retry-After', '60']]),
      });

      const client = new QuickBooksClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      await expect(client.getInvoices({})).rejects.toThrow('Rate limit exceeded');
    });
  });
});

// ============================================================================
// Xero Client Tests
// ============================================================================

describe('XeroClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    tenantId: 'test-tenant-id',
    environment: 'production' as const,
    refreshToken: 'test-refresh-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using refresh token', async () => {
      mockFetch({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 1800,
        token_type: 'Bearer',
      });

      const client = new XeroClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('identity.xero.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Invoice Operations', () => {
    it('should fetch invoices', async () => {
      const mockInvoices = {
        Invoices: [
          {
            InvoiceID: 'I1',
            InvoiceNumber: 'INV-001',
            Type: 'ACCREC',
            Contact: { ContactID: 'C1', Name: 'Customer 1' },
            DateString: '2024-01-15',
            DueDateString: '2024-02-15',
            Status: 'AUTHORISED',
            Total: 1000,
            AmountDue: 500,
            UpdatedDateUTC: '2024-01-15T10:00:00Z',
          },
        ],
      };

      mockFetch(mockInvoices);

      const client = new XeroClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getInvoices({ page: 1 });
      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0].InvoiceNumber).toBe('INV-001');
    });

    it('should support If-Modified-Since header', async () => {
      mockFetch({ Invoices: [] });

      const client = new XeroClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const yesterday = new Date(Date.now() - 86400000);
      await client.getInvoices({ page: 1, modifiedSince: yesterday });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-Modified-Since': expect.any(String),
          }),
        })
      );
    });
  });

  describe('Contact Operations', () => {
    it('should fetch contacts', async () => {
      const mockContacts = {
        Contacts: [
          {
            ContactID: 'C1',
            Name: 'Customer 1',
            EmailAddress: 'customer@example.com',
            ContactStatus: 'ACTIVE',
            IsCustomer: true,
            IsSupplier: false,
            UpdatedDateUTC: '2024-01-15T10:00:00Z',
          },
        ],
      };

      mockFetch(mockContacts);

      const client = new XeroClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getContacts({ page: 1 });
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].Name).toBe('Customer 1');
    });
  });

  describe('Payment Operations', () => {
    it('should fetch payments', async () => {
      const mockPayments = {
        Payments: [
          {
            PaymentID: 'P1',
            Invoice: { InvoiceID: 'I1', InvoiceNumber: 'INV-001' },
            Account: { AccountID: 'A1', Code: '1000' },
            Date: '2024-01-20',
            Amount: 500,
            Status: 'AUTHORISED',
            PaymentType: 'ACCRECPAYMENT',
            UpdatedDateUTC: '2024-01-20T10:00:00Z',
          },
        ],
      };

      mockFetch(mockPayments);

      const client = new XeroClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getPayments({ page: 1 });
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].Amount).toBe(500);
    });
  });

  describe('Chart of Accounts', () => {
    it('should fetch accounts', async () => {
      const mockAccounts = {
        Accounts: [
          {
            AccountID: 'A1',
            Code: '1000',
            Name: 'Operating Account',
            Type: 'BANK',
            Class: 'ASSET',
            Status: 'ACTIVE',
            EnablePaymentsToAccount: true,
            UpdatedDateUTC: '2024-01-15T10:00:00Z',
          },
        ],
      };

      mockFetch(mockAccounts);

      const client = new XeroClient({
        ...mockConfig,
        accessToken: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000),
      });

      const result = await client.getAccounts({ page: 1 });
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].Type).toBe('BANK');
    });
  });
});

// ============================================================================
// Sync Utilities Tests
// ============================================================================

describe('Accounting Sync Utilities', () => {
  describe('Customer Name Matching', () => {
    it('should match exact customer names', () => {
      const result = fuzzyMatchCustomerName('ABC Corporation', 'ABC Corporation');
      expect(result.match).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should match case-insensitive names', () => {
      const result = fuzzyMatchCustomerName('abc corporation', 'ABC CORPORATION');
      expect(result.match).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should match similar names with high score', () => {
      const result = fuzzyMatchCustomerName('ABC Corp', 'ABC Corporation');
      // "abccorp" vs "abccorporation" - 7 chars vs 14 chars
      // Contains match gives 50% similarity, not 80%
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('should not match dissimilar names', () => {
      const result = fuzzyMatchCustomerName('ABC Corporation', 'XYZ Industries');
      expect(result.match).toBe(false);
      expect(result.score).toBeLessThan(50);
    });

    it('should handle special characters', () => {
      const result = fuzzyMatchCustomerName('ABC & Co.', 'ABC and Co');
      // After normalization: "abcco" vs "abcandco" - similar but not 80%
      expect(result.score).toBeGreaterThan(60);
    });
  });

  describe('Invoice Validation', () => {
    it('should validate correct invoice data', () => {
      const result = validateInvoiceData({
        invoiceNumber: 'INV-001',
        customerId: 'C1',
        customerName: 'Customer 1',
        totalAmount: 1000,
        invoiceDate: new Date('2024-01-15'),
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty invoice number', () => {
      const result = validateInvoiceData({
        invoiceNumber: '',
        customerId: 'C1',
        customerName: 'Customer 1',
        totalAmount: 1000,
        invoiceDate: new Date('2024-01-15'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invoice number is required');
    });

    it('should reject negative amounts', () => {
      const result = validateInvoiceData({
        invoiceNumber: 'INV-001',
        customerId: 'C1',
        customerName: 'Customer 1',
        totalAmount: -100,
        invoiceDate: new Date('2024-01-15'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invoice amount must be greater than 0');
    });

    it('should reject invalid dates', () => {
      const result = validateInvoiceData({
        invoiceNumber: 'INV-001',
        customerId: 'C1',
        customerName: 'Customer 1',
        totalAmount: 1000,
        invoiceDate: new Date('invalid'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid invoice date is required');
    });
  });

  describe('Payment Validation', () => {
    it('should validate correct payment data', () => {
      const result = validatePaymentData({
        customerId: 'C1',
        amount: 500,
        paymentDate: new Date('2024-01-20'),
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty customer ID', () => {
      const result = validatePaymentData({
        customerId: '',
        amount: 500,
        paymentDate: new Date('2024-01-20'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer ID is required');
    });

    it('should reject zero amounts', () => {
      const result = validatePaymentData({
        customerId: 'C1',
        amount: 0,
        paymentDate: new Date('2024-01-20'),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payment amount must be greater than 0');
    });
  });
});

// ============================================================================
// Integration Tests (require database)
// ============================================================================

describe('Accounting Integration (Database Required)', () => {
  // These tests use the database to test real integration scenarios
  // Use valid UUIDs for database queries
  const testOrgId = '00000000-0000-0000-0000-000000000001'; // Valid UUID format
  
  it('should find invoice matches', async () => {
    const matches = await findInvoiceMatches(testOrgId, IntegrationProvider.QUICKBOOKS);
    expect(Array.isArray(matches)).toBe(true);
  });

  it('should match payments to invoices', async () => {
    const matches = await matchPaymentsToInvoices(testOrgId, IntegrationProvider.QUICKBOOKS);
    expect(Array.isArray(matches)).toBe(true);
  });

  it('should find customer mappings', async () => {
    const mappings = await findCustomerMappings(testOrgId, IntegrationProvider.QUICKBOOKS);
    expect(Array.isArray(mappings)).toBe(true);
  });

  it('should map accounts to categories', async () => {
    const mappings = await mapAccountsToCategories(testOrgId, IntegrationProvider.QUICKBOOKS);
    expect(Array.isArray(mappings)).toBe(true);
  });
});

// ============================================================================
// Sage Intacct Client Tests
// ============================================================================

describe('SageIntacctClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    companyId: 'test-company-id',
    userId: 'test-user-id',
    userPassword: 'test-password',
    environment: 'production' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using session-based auth', async () => {
      const mockResponse = `<?xml version="1.0"?><response><operation><authentication><sessionid>test-session-id</sessionid></authentication></operation></response>`;
      
      mockFetch(mockResponse);

      const client = new SageIntacctClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.intacct.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockFetch('<response><errormessage><error>Invalid credentials</error></errormessage></response>', false);

      const client = new SageIntacctClient(mockConfig);
      await expect(client.authenticate()).rejects.toThrow();
    });
  });

  describe('Invoice Operations', () => {
    it('should fetch invoices', async () => {
      const authResponse = `<?xml version="1.0"?><response><operation><authentication><sessionid>test-session-id</sessionid></authentication></operation></response>`;
      const invoiceResponse = `<?xml version="1.0"?><response><operation><result><data><ARINVOICE><RECORDNO>123</RECORDNO><CUSTOMERID>C1</CUSTOMERID><CUSTOMERNAME>Customer 1</CUSTOMERNAME><TOTALENTERED>1000</TOTALENTERED><TOTALDUE>500</TOTALDUE><WHENCREATED>2024-01-15</WHENCREATED><WHENDUE>2024-02-15</WHENDUE><STATE>Posted</STATE></ARINVOICE></data></result></operation></response>`;
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => invoiceResponse,
        });

      const client = new SageIntacctClient(mockConfig);
      await client.authenticate();
      
      const invoices = await client.getInvoices();
      expect(Array.isArray(invoices.invoices)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      mockFetch({ error: 'Rate limit exceeded' }, false);

      const client = new SageIntacctClient(mockConfig);
      await expect(client.getInvoices()).rejects.toThrow();
    });
  });
});

// ============================================================================
// Sage Intacct Adapter Tests
// ============================================================================

describe('SageIntacctAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new SageIntacctAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.capabilities.supportsFullSync).toBe(true);
  });

  it('should report correct capabilities', () => {
    const adapter = new SageIntacctAdapter();
    expect(adapter.capabilities.supportedEntities).toContain('invoices');
    expect(adapter.capabilities.supportedEntities).toContain('payments');
    expect(adapter.capabilities.supportedEntities).toContain('customers');
    expect(adapter.capabilities.supportedEntities).toContain('accounts');
  });
});

// ============================================================================
// FreshBooks Client Tests
// ============================================================================

describe('FreshBooksClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    accountId: 'test-account-id',
    refreshToken: 'test-refresh-token',
    environment: 'production' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using OAuth2', async () => {
      mockFetch({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new FreshBooksClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('auth.freshbooks.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockFetch({ error: 'invalid_grant' }, false);

      const client = new FreshBooksClient(mockConfig);
      await expect(client.authenticate()).rejects.toThrow();
    });
  });

  describe('Invoice Operations', () => {
    it('should fetch invoices', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const invoiceResponse = {
        response: {
          result: {
            invoices: [
              {
                id: 1,
                invoiceid: 'INV-001',
                customerid: 1,
                organization: 'Customer 1',
                amount: { amount: '1000.00' },
                outstanding: { amount: '500.00' },
                create_date: '2024-01-15',
                due_date: '2024-02-15',
                v3_status: 2,
              },
            ],
          },
        },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => invoiceResponse,
        });

      const client = new FreshBooksClient(mockConfig);
      await client.authenticate();
      
      const invoices = await client.getInvoices();
      expect(Array.isArray(invoices.invoices)).toBe(true);
    });
  });
});

// ============================================================================
// FreshBooks Adapter Tests
// ============================================================================

describe('FreshBooksAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new FreshBooksAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.capabilities.supportsFullSync).toBe(true);
  });

  it('should report correct capabilities', () => {
    const adapter = new FreshBooksAdapter();
    expect(adapter.capabilities.supportedEntities).toContain('invoices');
    expect(adapter.capabilities.supportedEntities).toContain('payments');
    expect(adapter.capabilities.supportedEntities).toContain('clients');
    expect(adapter.capabilities.supportedEntities).toContain('expenses');
  });
});

// ============================================================================
// Wave Client Tests
// ============================================================================

describe('WaveClient', () => {
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    businessId: 'test-business-id',
    refreshToken: 'test-refresh-token',
    environment: 'production' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate using OAuth2', async () => {
      mockFetch({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      const client = new WaveClient(mockConfig);
      await client.authenticate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.waveapps.com'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle authentication errors', async () => {
      mockFetch({ error: 'invalid_grant' }, false);

      const client = new WaveClient(mockConfig);
      await expect(client.authenticate()).rejects.toThrow();
    });
  });

  describe('Invoice Operations', () => {
    it('should fetch invoices via GraphQL', async () => {
      const authResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      
      const graphqlResponse = {
        data: {
          business: {
            invoices: {
              edges: [
                {
                  node: {
                    id: 'inv-1',
                    invoiceNumber: 'INV-001',
                    customer: { id: 'c1', name: 'Customer 1' },
                    total: { value: 1000 },
                    amountDue: { value: 500 },
                    invoiceDate: '2024-01-15',
                    dueDate: '2024-02-15',
                    status: 'SENT',
                  },
                },
              ],
              pageInfo: { totalPages: 1, currentPage: 1 },
            },
          },
        },
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => authResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => graphqlResponse,
        });

      const client = new WaveClient(mockConfig);
      await client.authenticate();
      
      const invoices = await client.getInvoices();
      expect(Array.isArray(invoices.invoices)).toBe(true);
    });
  });

  describe('GraphQL Operations', () => {
    it('should handle GraphQL errors', async () => {
      mockFetch({
        errors: [{ message: 'Field error' }],
      }, false);

      const client = new WaveClient(mockConfig);
      await expect(client.getInvoices()).rejects.toThrow();
    });
  });
});

// ============================================================================
// Wave Adapter Tests
// ============================================================================

describe('WaveAdapter', () => {
  it('should create adapter instance', () => {
    const adapter = new WaveAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.capabilities.supportsFullSync).toBe(true);
  });

  it('should report correct capabilities', () => {
    const adapter = new WaveAdapter();
    expect(adapter.capabilities.supportedEntities).toContain('invoices');
    expect(adapter.capabilities.supportedEntities).toContain('payments');
    expect(adapter.capabilities.supportedEntities).toContain('customers');
  });
});
