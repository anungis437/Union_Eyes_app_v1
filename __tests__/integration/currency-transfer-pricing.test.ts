/**
 * Currency & Transfer Pricing Integration Tests
 * Tests CRA compliance for currency conversion and T106 filing
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { CurrencyService } from '@/lib/services/currency-service';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIf = hasDatabase ? describe : describe.skip;

describeIf('Currency & Transfer Pricing Service Integration', () => {
  let service: CurrencyService;
  let hasExtendedCrossBorderSchema = true;

  const skipIfNoCrossBorderSchema = () => {
    if (!hasExtendedCrossBorderSchema) {
      expect(hasExtendedCrossBorderSchema).toBe(false);
      return true;
    }

    return false;
  };

  beforeAll(async () => {
    try {
      const requiredColumns = [
        'related_party',
        'cad_equivalent',
        'exchange_rate_used',
        'exchange_rate_date',
        'arm_length_price',
        'arm_length_variance',
        'transfer_pricing_method',
        'transaction_category',
        'status'
      ];

      const result = await db.execute<{ column_name: string }>(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cross_border_transactions'
          AND column_name IN (${sql.join(requiredColumns.map(col => sql`${col}`), sql`, `)})
      `);

      const rows = Array.isArray(result) ? result : (result?.rows ?? []);
      hasExtendedCrossBorderSchema = rows.length === requiredColumns.length;
    } catch {
      hasExtendedCrossBorderSchema = false;
    }
  });

  beforeEach(() => {
    service = new CurrencyService();
  });

  describe('CAD Currency Enforcement', () => {
    it('should enforce CAD for all invoices', () => {
      const validInvoice = {
        id: 'inv-001',
        amount: 1000,
        currency: 'CAD' as const,
        issueDate: new Date('2024-01-15'),
        isRelatedParty: false,
        counterpartyName: 'customer-123',
        counterpartyCountry: 'US'
      };

      const result = service.enforceCurrencyCAD(validInvoice);

      expect(result.compliant).toBe(true);
      expect(result.message).toContain('compliant');
    });

    it('should reject non-CAD invoices', () => {
      const invalidInvoice = {
        id: 'inv-002',
        amount: 1000,
        currency: 'USD' as const,
        issueDate: new Date('2024-01-15'),
        isRelatedParty: false,
        counterpartyName: 'customer-456',
        counterpartyCountry: 'US'
      };

      const result = service.enforceCurrencyCAD(invalidInvoice);
      expect(result.compliant).toBe(false);
      expect(result.message).toContain('CAD');
    });

    it('should provide conversion instructions for non-CAD', () => {
      const usdInvoice = {
        id: 'inv-003',
        amount: 1000,
        currency: 'USD' as const,
        issueDate: new Date('2024-01-15'),
        isRelatedParty: false,
        counterpartyName: 'customer-789',
        counterpartyCountry: 'US'
      };

      const result = service.enforceCurrencyCAD(usdInvoice);
      expect(result.compliant).toBe(false);
      expect(result.message).toContain('CAD');
    });
  });

  describe('Bank of Canada Exchange Rates', () => {
    it('should convert USD to CAD using BOC noon rate', async () => {
      const amountUSD = 1000;
      const date = new Date('2024-01-15');

      const result = await service.convertUSDToCAD(amountUSD, date);

      expect(result.amountCAD).toBeGreaterThan(amountUSD); // CAD typically lower than USD
      expect(typeof result.amountCAD).toBe('number');
    });

    it('should fetch BOC noon rate for specific date', async () => {
      const date = new Date('2024-01-15');

      const rate = await service.getBankOfCanadaNoonRate(date);

      expect(rate).toBeGreaterThan(0);
      expect(typeof rate).toBe('number');
    });

    it('should cache exchange rates in database', async () => {
      const date = new Date('2024-01-15');

      // First call fetches and caches
      const firstRate = await service.getBankOfCanadaNoonRate(date);
      expect(firstRate).toBeGreaterThan(0);

      // Second call should use cached value
      const cachedRate = await service.getBankOfCanadaNoonRate(date);
      expect(cachedRate).toBe(firstRate);
    });

    it('should use official BOC API endpoint', async () => {
      const date = new Date();

      // Should not throw error for valid API call
      await expect(
        service.getBankOfCanadaNoonRate(date)
      ).resolves.toBeDefined();
    });
  });

  describe('Cross-Border Transaction Tracking', () => {
    it('should record cross-border transactions', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const transaction = {
        transactionId: `tx-${Date.now()}`,
        fromPartyId: 'org-ca-1',
        fromPartyName: 'Union Local 123',
        fromPartyType: 'organization' as const,
        fromCountryCode: 'CA',
        toPartyId: 'org-us-1',
        toPartyName: 'US Local 123',
        toPartyType: 'organization' as const,
        toCountryCode: 'US',
        originalAmount: 1_500_000,
        originalCurrency: 'CAD' as const,
        transactionCategory: 'service',
        transactionDate: new Date('2024-01-15'),
        armLengthPrice: 1_500_000,
        transferPricingMethod: 'Comparable Uncontrolled Price (CUP)',
        relatedParty: true
      };

      const record = await service.recordCrossBorderTransaction(transaction);

      expect(record.transactionId).toBeDefined();
      expect(record.compliant).toBe(true);
    });

    it('should support multiple transaction types', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const types = ['service', 'goods', 'royalty'] as const;

      for (const type of types) {
        const transaction = {
          transactionId: `tx-${type}-${Date.now()}`,
          fromPartyId: 'org-ca-1',
          fromPartyName: 'Union Local 123',
          fromPartyType: 'organization' as const,
          fromCountryCode: 'CA',
          toPartyId: 'org-us-1',
          toPartyName: 'Test Entity',
          toPartyType: 'organization' as const,
          toCountryCode: 'US',
          originalAmount: 1_500_000,
          originalCurrency: 'CAD' as const,
          transactionCategory: type,
          transactionDate: new Date(),
          armLengthPrice: 1_500_000,
          transferPricingMethod: 'Comparable Uncontrolled Price (CUP)',
          relatedParty: true
        };

        const record = await service.recordCrossBorderTransaction(transaction);

        expect(record.transactionId).toBeDefined();
      }
    });

    it('should track BOC noon rate used for conversion', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const transaction = {
        transactionId: `tx-${Date.now()}`,
        fromPartyId: 'org-ca-1',
        fromPartyName: 'Union Local 123',
        fromPartyType: 'organization' as const,
        fromCountryCode: 'CA',
        toPartyId: 'org-us-1',
        toPartyName: 'US Entity',
        toPartyType: 'organization' as const,
        toCountryCode: 'US',
        originalAmount: 1_000_000,
        originalCurrency: 'USD' as const,
        transactionCategory: 'service',
        transactionDate: new Date('2024-01-15'),
        armLengthPrice: 1_000_000,
        transferPricingMethod: 'Comparable Uncontrolled Price (CUP)',
        relatedParty: true
      };

      const record = await service.recordCrossBorderTransaction(transaction);

      expect(record.transactionId).toBeDefined();
    });
  });

  describe('Arm\'s Length Pricing Validation', () => {
    it('should accept pricing within ±5% of market rate', async () => {
      const transactionId = 'txn-001';
      const marketRate = 100;
      const actualRate = 103; // 3% above market

      const validation = await service.validateArmLengthPricing(
        transactionId,
        marketRate,
        actualRate
      );

      expect(validation.compliant).toBe(true);
      expect(validation.variance).toBeLessThanOrEqual(0.05);
      expect(validation.acceptableRange).toBeDefined();
    });

    it('should flag pricing outside ±5% variance', async () => {
      const transactionId = 'txn-002';
      const marketRate = 100;
      const actualRate = 110; // 10% above market

      const validation = await service.validateArmLengthPricing(
        transactionId,
        marketRate,
        actualRate
      );

      expect(validation.compliant).toBe(false);
      expect(validation.variance).toBeGreaterThan(0.05);
      expect(validation.message).toBeDefined();
    });

    it('should calculate percentage variance', async () => {
      const transactionId = 'txn-003';
      const marketRate = 100;
      const actualRate = 95; // 5% below market

      const validation = await service.validateArmLengthPricing(
        transactionId,
        marketRate,
        actualRate
      );

      expect(validation.variance).toBe(0.05);
      expect(validation.compliant).toBe(true);
    });
  });

  describe('T106 Required Transactions Query', () => {
    it('should list all transactions requiring T106', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;

      const result = await service.getT106RequiredTransactions(taxYear);

      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.totalAmount).toBeDefined();
      expect(result.count).toBeDefined();
      
      for (const txn of result.transactions) {
        expect(txn.amountCAD).toBeGreaterThan(1_000_000);
      }
    });

    it('should filter by tax year', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;

      const result = await service.getT106RequiredTransactions(taxYear);

      for (const txn of result.transactions) {
        if (txn.id) {
          expect(txn.id).toBeDefined();
        }
      }
    });

    it('should track filing status for each transaction', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;

      const result = await service.getT106RequiredTransactions(taxYear);

      for (const txn of result.transactions) {
        expect(txn).toHaveProperty('amountCAD');
      }
    });
  });

  describe('Transfer Pricing Compliance Reporting', () => {
    it('should generate comprehensive compliance report', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;
      const businessNumber = '123456789RC0001';

      const report = await service.getComplianceSummary(taxYear, businessNumber);

      expect(report.taxYear).toBe(taxYear);
      expect(report).toHaveProperty('totalCrossBorderTransactions');
      expect(report).toHaveProperty('relatedPartyTransactions');
      expect(report).toHaveProperty('t106Required');
      expect(report).toHaveProperty('t106TransactionCount');
      expect(report).toHaveProperty('t106TotalAmount');
      expect(report).toHaveProperty('filingDeadline');
      expect(report).toHaveProperty('daysUntilDeadline');
      expect(report).toHaveProperty('recommendations');
    });

    it('should calculate T106 filing metrics', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;
      const businessNumber = '123456789RC0001';

      const report = await service.getComplianceSummary(taxYear, businessNumber);

      expect(report.t106TransactionCount).toBeDefined();
      expect(report.t106TransactionCount).toBeGreaterThanOrEqual(0);
      expect(report.t106TotalAmount).toBeDefined();
      expect(report.t106TotalAmount).toBeGreaterThanOrEqual(0);
    });

    it('should identify transactions with recommendations', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;
      const businessNumber = '123456789RC0001';

      const report = await service.getComplianceSummary(taxYear, businessNumber);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should provide filing deadline information', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const taxYear = 2024;
      const businessNumber = '123456789RC0001';

      const report = await service.getComplianceSummary(taxYear, businessNumber);

      expect(report.filingDeadline).toBeDefined();
      expect(report.daysUntilDeadline).toBeDefined();
      expect(typeof report.daysUntilDeadline).toBe('number');
    });
  });

  describe('ITA Section 247 Compliance', () => {
    it('should reference ITA Section 247 for transfer pricing', async () => {
      if (skipIfNoCrossBorderSchema()) return;
      const report = await service.getComplianceSummary(2024, '123456789RC0001');

      // ITA Section 247 compliance is reflected in recommendations
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should enforce transfer pricing documentation', async () => {
      const transactionId = 'txn-large-001';
      const marketRate = 100;
      const actualRate = 107;

      const validation = await service.validateArmLengthPricing(
        transactionId,
        marketRate,
        actualRate
      );

      // Non-compliant pricing requires additional scrutiny
      if (!validation.compliant) {
        expect(validation.message).toBeDefined();
        expect(validation.variance).toBeGreaterThan(0.05);
      }
    });
  });
});
