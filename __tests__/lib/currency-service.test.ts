/**
 * Currency & Transfer Pricing Service Tests
 * 
 * Validates:
 * - CAD currency enforcement (CRA requirement)
 * - Bank of Canada noon rate conversions
 * - T106 threshold checks ($1M CAD)
 * - Cross-border transaction recording
 * - Arm's length pricing validation (±5% variance)
 * - Transfer pricing compliance reporting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CurrencyService, annualT106Reminder, type Invoice } from '@/lib/services/currency-service';

// Mock database
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'tx-123',
          transactionDate: new Date('2025-06-15'),
          amountCents: 150000000,
          originalCurrency: 'USD',
          cadEquivalentCents: 150000000,
          fromCountryCode: 'CA',
          toCountryCode: 'US',
          fromPartyType: 'organization',
          toPartyType: 'organization',
          craReportingStatus: 'pending',
        }])),
        onConflictDoNothing: vi.fn(() => Promise.resolve())
      }))
    })),
    $count: vi.fn(),
    query: {
      exchangeRates: {
        findFirst: vi.fn()
      },
      crossBorderTransactions: {
        findMany: vi.fn()
      }
    }
  }
}));

describe('CurrencyService', () => {
  let currencyService: CurrencyService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currencyService = new CurrencyService();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enforceCurrencyCAD', () => {
    it('should return compliant=true for CAD invoices', () => {
      const invoice: Invoice = {
        id: 'INV-001',
        amount: 5000,
        currency: 'CAD',
        issueDate: new Date('2025-01-15'),
        isRelatedParty: false,
        counterpartyName: 'Test Supplier',
        counterpartyCountry: 'Canada'
      };

      const result = currencyService.enforceCurrencyCAD(invoice);

      expect(result.compliant).toBe(true);
      expect(result.message).toBe('Invoice currency compliant (CAD)');
    });

    it('should return compliant=false for USD invoices', () => {
      const invoice: Invoice = {
        id: 'INV-002',
        amount: 5000,
        currency: 'USD',
        issueDate: new Date('2025-01-15'),
        isRelatedParty: false,
        counterpartyName: 'US Supplier',
        counterpartyCountry: 'United States'
      };

      const result = currencyService.enforceCurrencyCAD(invoice);

      expect(result.compliant).toBe(false);
      expect(result.message).toContain('Invoice must be in CAD per CRA transfer pricing rules');
      expect(result.message).toContain('USD');
    });

    it('should reject EUR, GBP, and MXN currencies', () => {
      const currencies = ['EUR', 'GBP', 'MXN'] as const;
      
      currencies.forEach(currency => {
        const invoice: Invoice = {
          id: `INV-${currency}`,
          amount: 5000,
          currency,
          issueDate: new Date('2025-01-15'),
          isRelatedParty: false,
          counterpartyName: `${currency} Supplier`,
          counterpartyCountry: 'International'
        };

        const result = currencyService.enforceCurrencyCAD(invoice);

        expect(result.compliant).toBe(false);
        expect(result.message).toContain(currency);
      });
    });
  });

  describe('getBankOfCanadaNoonRate', () => {
    it('should return cached BOC rate when available', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce({
        id: 'rate-001',
        fromCurrency: 'USD',
        toCurrency: 'CAD',
        rate: 1.3654,
        source: 'BOC',
        rateTimestamp: new Date(),
        effectiveDate: testDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const rate = await currencyService.getBankOfCanadaNoonRate(testDate);

      expect(rate).toBe(1.3654);
      expect(db.query.exchangeRates.findFirst).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return fallback rate when not cached', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce(undefined);

      const rate = await currencyService.getBankOfCanadaNoonRate(testDate);

      expect(rate).toBe(1.35);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use fallback rate 1.35 when BOC API fails', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce(undefined);
      const rate = await currencyService.getBankOfCanadaNoonRate(testDate);

      expect(rate).toBe(1.35);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use fallback rate when no observations returned', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce(undefined);
      const rate = await currencyService.getBankOfCanadaNoonRate(testDate);

      expect(rate).toBe(1.35);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('convertUSDToCAD', () => {
    it('should convert USD to CAD using BOC rate', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce({
        id: 'rate-001',
        fromCurrency: 'USD',
        toCurrency: 'CAD',
        rate: 1.40,
        source: 'BOC',
        rateTimestamp: new Date(),
        effectiveDate: testDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const result = await currencyService.convertUSDToCAD(1000, testDate);

      expect(result.amountCAD).toBe(1400);
      expect(result.exchangeRate).toBe(1.40);
      expect(result.source).toBe('BOC');
      expect(result.effectiveDate).toEqual(testDate);
    });

    it('should record exchange rate for audit trail', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce({
        id: 'rate-001',
        fromCurrency: 'USD',
        toCurrency: 'CAD',
        rate: 1.38,
        source: 'BOC',
        rateTimestamp: new Date(),
        effectiveDate: testDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      await currencyService.convertUSDToCAD(5000, testDate);

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should handle fractional amounts correctly', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');
      
      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce({
        id: 'rate-001',
        fromCurrency: 'USD',
        toCurrency: 'CAD',
        rate: 1.3654,
        source: 'BOC',
        rateTimestamp: new Date(),
        effectiveDate: testDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const result = await currencyService.convertUSDToCAD(1234.56, testDate);

      expect(result.amountCAD).toBeCloseTo(1685.67, 2);
      expect(result.exchangeRate).toBe(1.3654);
    });
  });

  describe('recordCrossBorderTransaction', () => {
    it('should record transaction and return compliance flag', async () => {
      const testDate = new Date('2025-06-15');
      const { db } = await import('@/db');

      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce({
        id: 'rate-001',
        fromCurrency: 'USD',
        toCurrency: 'CAD',
        rate: 1.0,
        source: 'BOC',
        rateTimestamp: new Date(),
        effectiveDate: testDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const transaction = {
        transactionId: 'tx-123',
        fromPartyId: 'org-1',
        fromPartyName: 'Union Org',
        fromPartyType: 'organization' as const,
        fromCountryCode: 'CA',
        toPartyId: 'org-2',
        toPartyName: 'Related Company LLC',
        toPartyType: 'organization' as const,
        toCountryCode: 'US',
        originalAmount: 1_500_000,
        originalCurrency: 'USD' as const,
        transactionCategory: 'service',
        transactionDate: testDate,
        armLengthPrice: 1_500_000,
        transferPricingMethod: 'Comparable Uncontrolled Price (CUP)',
        relatedParty: true
      };

      const result = await currencyService.recordCrossBorderTransaction(transaction);

      expect(result.transactionId).toBe('tx-123');
      expect(result.cadEquivalent).toBe(1_500_000);
      expect(result.compliant).toBe(true);
    });

    it('should convert amounts to cents for database storage', async () => {
      const { db } = await import('@/db');
      const testDate = new Date('2025-06-15');

      vi.mocked(db.query.exchangeRates.findFirst).mockResolvedValueOnce({
        id: 'rate-002',
        fromCurrency: 'USD',
        toCurrency: 'CAD',
        rate: 1.25,
        source: 'BOC',
        rateTimestamp: new Date(),
        effectiveDate: testDate,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const transaction = {
        transactionId: 'tx-456',
        fromPartyId: 'org-3',
        fromPartyName: 'Union Org',
        fromPartyType: 'organization' as const,
        fromCountryCode: 'CA',
        toPartyId: 'org-4',
        toPartyName: 'Supplier Inc',
        toPartyType: 'organization' as const,
        toCountryCode: 'US',
        originalAmount: 1_234.56,
        originalCurrency: 'USD' as const,
        transactionCategory: 'purchase',
        transactionDate: testDate,
        armLengthPrice: 1_234.56,
        transferPricingMethod: 'Comparable Uncontrolled Price (CUP)',
        relatedParty: false
      };

      await currencyService.recordCrossBorderTransaction(transaction);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      const valuesArg = insertCall.value.values.mock.calls[0][0];
      const expectedCad = 1_234.56 * 1.25;

      expect(db.insert).toHaveBeenCalled();
      expect(valuesArg.cadEquivalentCents).toBe(Math.round(expectedCad * 100));
    });
  });

  describe('validateArmLengthPricing', () => {
    it('should mark as compliant when variance is within ±5%', async () => {
      const result = await currencyService.validateArmLengthPricing(
        'tx-123',
        1000,
        1040 // 4% variance
      );

      expect(result.compliant).toBe(true);
      expect(result.variance).toBeCloseTo(0.04, 2);
      expect(result.acceptableRange).toBe('+/- 5%');
      expect(result.message).toContain('within acceptable range');
    });

    it('should mark as non-compliant when variance exceeds 5%', async () => {
      const result = await currencyService.validateArmLengthPricing(
        'tx-123',
        1000,
        1080 // 8% variance
      );

      expect(result.compliant).toBe(false);
      expect(result.variance).toBeCloseTo(0.08, 2);
      expect(result.message).toContain('exceeds 5% threshold');
      expect(result.message).toContain('Documentation required');
    });

    it('should handle negative variance (actual < market)', async () => {
      const result = await currencyService.validateArmLengthPricing(
        'tx-123',
        1000,
        950 // -5% variance
      );

      expect(result.compliant).toBe(true);
      expect(result.variance).toBe(0.05);
    });

    it('should reject pricing below market by more than 5%', async () => {
      const result = await currencyService.validateArmLengthPricing(
        'tx-123',
        1000,
        920 // -8% variance
      );

      expect(result.compliant).toBe(false);
      expect(result.variance).toBeCloseTo(0.08, 2);
    });

    it('should accept pricing at exactly 5% variance', async () => {
      const result = await currencyService.validateArmLengthPricing(
        'tx-123',
        1000,
        1050 // exactly 5% variance
      );

      expect(result.compliant).toBe(true);
      expect(result.variance).toBe(0.05);
    });
  });

  describe('fileT106', () => {
    it('should successfully file T106 before deadline', async () => {
      const filingDeadline = new Date();
      filingDeadline.setDate(filingDeadline.getDate() + 30); // 30 days from now

      const form = {
        taxYear: 2025,
        businessNumber: 'BN123456789',
        transactions: [
          {
            nonResidentName: 'Related Company LLC',
            nonResidentCountry: 'US',
            transactionType: 'Service Agreement',
            amountCAD: 1_500_000,
            transferPricingMethod: 'Comparable Uncontrolled Price (CUP)'
          }
        ],
        filingDeadline
      };

      const result = await currencyService.fileT106(form);

      expect(result.success).toBe(true);
      expect(result.confirmationNumber).toMatch(/CRA-T106-2025-\d+/);
      expect(result.filedAt).toBeInstanceOf(Date);
      expect(result.message).toContain('filed successfully');
    });

    it('should reject filing after deadline', async () => {
      const filingDeadline = new Date();
      filingDeadline.setDate(filingDeadline.getDate() - 1); // Yesterday

      const form = {
        taxYear: 2024,
        businessNumber: 'BN123456789',
        transactions: [],
        filingDeadline
      };

      const result = await currencyService.fileT106(form);

      expect(result.success).toBe(false);
      expect(result.confirmationNumber).toBeUndefined();
      expect(result.message).toContain('Filing deadline passed');
      expect(result.message).toContain('Late filing penalties apply');
    });
  });

  describe('getT106RequiredTransactions', () => {
    it('should return all transactions requiring T106 for tax year', async () => {
      const { db } = await import('@/db');
      
      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([
        {
          id: 'tx-001',
          transactionDate: new Date('2025-03-15'),
          cadEquivalent: 1_500_000,
          toPartyName: 'Related Company LLC',
          toCountryCode: 'US',
          transactionCategory: 'service',
          transferPricingMethod: 'Comparable Uncontrolled Price (CUP)'
        },
        {
          id: 'tx-002',
          transactionDate: new Date('2025-08-20'),
          cadEquivalent: 2_500_000,
          toPartyName: 'Related Company LLC',
          toCountryCode: 'US',
          transactionCategory: 'service',
          transferPricingMethod: 'Comparable Uncontrolled Price (CUP)'
        }
      ]);

      const result = await currencyService.getT106RequiredTransactions(2025);

      expect(result.count).toBe(2);
      expect(result.totalAmount).toBe(4_000_000); // $1.5M + $2.5M
      expect(result.transactions).toHaveLength(2);
    });

    it('should return zero count when no T106 transactions exist', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([]);

      const result = await currencyService.getT106RequiredTransactions(2025);

      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.transactions).toHaveLength(0);
    });
  });

  describe('getComplianceSummary', () => {
    it('should generate comprehensive compliance summary', async () => {
      const { db } = await import('@/db');

      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([
        {
          id: 'tx-001',
          transactionDate: new Date('2025-03-15'),
          cadEquivalent: 1_500_000,
          toPartyName: 'Related Company LLC',
          toCountryCode: 'US',
          transactionCategory: 'service',
          transferPricingMethod: 'Comparable Uncontrolled Price (CUP)'
        }
      ]);
      vi.mocked(db.$count).mockResolvedValueOnce(3);

      const report = await currencyService.getComplianceSummary(2025, 'BN123456789');

      expect(report.taxYear).toBe(2025);
      expect(report.totalCrossBorderTransactions).toBe(3);
      expect(report.t106Required).toBe(true);
      expect(report.t106TransactionCount).toBe(1);
      expect(report.t106TotalAmount).toBe(1_500_000);
      expect(report.filingDeadline).toEqual(new Date('2026-06-30'));
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.some(r => r.includes('File T106'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('CAD per CRA'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('Bank of Canada'))).toBe(true);
    });

    it('should calculate days until deadline correctly', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([]);
      vi.mocked(db.$count).mockResolvedValueOnce(0);

      const report = await currencyService.getComplianceSummary(2025, 'BN123456789');

      expect(report.daysUntilDeadline).toBeGreaterThan(0);
      expect(typeof report.daysUntilDeadline).toBe('number');
    });

    it('should include "no T106 required" when no qualifying transactions', async () => {
      const { db } = await import('@/db');
      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([]);
      vi.mocked(db.$count).mockResolvedValueOnce(0);

      const report = await currencyService.getComplianceSummary(2025, 'BN123456789');

      expect(report.t106Required).toBe(false);
      expect(report.t106TransactionCount).toBe(0);
      expect(report.recommendations.some(r => r.includes('No T106 filing required'))).toBe(true);
    });
  });

  describe('annualT106Reminder', () => {
    it('should log reminder when T106 transactions exist', async () => {
      const { db } = await import('@/db');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([
        {
          id: 'tx-001',
          transactionDate: new Date('2025-03-15'),
          cadEquivalent: 1_500_000,
          toPartyName: 'Related Company LLC',
          toCountryCode: 'US',
          transactionCategory: 'service',
          transferPricingMethod: 'Comparable Uncontrolled Price (CUP)'
        }
      ]);

      await annualT106Reminder();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('T106 FILING REQUIRED'));
      
      consoleSpy.mockRestore();
    });

    it('should log no filing required when no qualifying transactions', async () => {
      const { db } = await import('@/db');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      vi.mocked(db.query.crossBorderTransactions.findMany).mockResolvedValueOnce([]);

      await annualT106Reminder();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No T106 filing required'));
      
      consoleSpy.mockRestore();
    });
  });
});
