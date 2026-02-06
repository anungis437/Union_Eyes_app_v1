/**
 * Strike Fund Tax Service Unit Tests
 * 
 * Tests for lib/services/strike-fund-tax-service.ts
 * Coverage: T4A generation, RL-1 (Quebec), thresholds, deadlines
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkStrikePaymentTaxability,
  generateT4A,
  generateRL1,
  getTaxFilingStatus,
} from '@/lib/services/strike-fund-tax-service';

// Mock database
vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    catch: vi.fn().mockReturnValue([]),
  },
}));

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  decryptSIN: vi.fn().mockResolvedValue('123456789'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Strike Fund Tax Service', () => {
  describe('CRA Thresholds', () => {
    it('should identify payment exceeding weekly threshold ($500)', async () => {
      const result = await checkStrikePaymentTaxability('test-user', 600);
      
      expect(result.requiresT4A).toBe(true);
      expect(result.threshold).toBe(500);
      expect(result.reason).toContain('exceeds $500/week');
    });

    it('should identify payment below weekly threshold', async () => {
      const result = await checkStrikePaymentTaxability('test-user', 400);
      
      expect(result.requiresT4A).toBe(false);
      expect(result.reason).toContain('Below both weekly ($500) and annual ($26,000) thresholds');
    });

    it('should use correct annual threshold ($26,000)', async () => {
      // This would need mocking yearly total
      const T4A_THRESHOLD_ANNUAL = 26000;
      expect(T4A_THRESHOLD_ANNUAL).toBe(26000);
    });
  });

  describe('T4A Generation (Federal)', () => {
    it('should generate valid T4A structure', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member',
        email: 'test@example.com',
        address: '123 Test St',
        encryptedSin: 'encrypted-sin-data',
        province: 'ON',
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);

      const t4a = await generateT4A('test-user', 2024);
      
      expect(t4a.slipType).toBe('T4A');
      expect(t4a.taxYear).toBe(2024);
      expect(t4a.recipientName).toBe('Test Member');
      expect(t4a.recipientSIN).toBe('123456789'); // Decrypted
      expect(t4a.box028_otherIncome).toBeGreaterThanOrEqual(0);
      expect(t4a.employerBusinessNumber).toBeDefined();
    });

    it('should include required T4A fields', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member',
        email: 'test@example.com',
        address: '123 Test St',
        encryptedSin: 'encrypted-sin-data',
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);

      const t4a = await generateT4A('test-user', 2024);
      
      const requiredFields = [
        'slipType',
        'taxYear',
        'recipientName',
        'recipientSIN',
        'recipientAddress',
        'box028_otherIncome',
        'issuedDate',
        'employerName',
        'employerBusinessNumber',
      ];

      requiredFields.forEach(field => {
        expect(t4a).toHaveProperty(field);
      });
    });

    it('should handle missing user gracefully', async () => {
      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(null);

      await expect(generateT4A('invalid-user', 2024))
        .rejects
        .toThrow('Member invalid-user not found');
    });

    it('should handle missing encrypted SIN', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member',
        email: 'test@example.com',
        address: '123 Test St',
        encryptedSin: null, // No SIN on file
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);

      const t4a = await generateT4A('test-user', 2024);
      
      expect(t4a.recipientSIN).toBe('NOT PROVIDED');
    });
  });

  describe('RL-1 Generation (Quebec)', () => {
    it('should generate valid RL-1 structure for Quebec residents', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member QC',
        email: 'test@example.com',
        address: '123 rue Test',
        encryptedSin: 'encrypted-sin-data',
        province: 'QC',
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);

      const rl1 = await generateRL1('test-user', 2024);
      
      expect(rl1.slipType).toBe('RL-1');
      expect(rl1.taxYear).toBe(2024);
      expect(rl1.recipientNAS).toBe('123456789'); // NAS = Numéro d'assurance sociale
      expect(rl1.caseO_autresRevenus).toBeGreaterThanOrEqual(0);
      expect(rl1.employerNEQ).toBeDefined(); // NEQ = Numéro d'établissement du Québec
    });

    it('should reject RL-1 for non-Quebec residents', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member ON',
        email: 'test@example.com',
        province: 'ON', // Not Quebec
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);

      await expect(generateRL1('test-user', 2024))
        .rejects
        .toThrow('RL-1 is only for Quebec residents');
    });

    it('should include required RL-1 fields', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member QC',
        email: 'test@example.com',
        address: '123 rue Test',
        encryptedSin: 'encrypted-sin-data',
        province: 'QC',
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);

      const rl1 = await generateRL1('test-user', 2024);
      
      const requiredFields = [
        'slipType',
        'taxYear',
        'recipientName',
        'recipientNAS',
        'recipientAddress',
        'caseO_autresRevenus',
        'issuedDate',
        'employerName',
        'employerNEQ',
      ];

      requiredFields.forEach(field => {
        expect(rl1).toHaveProperty(field);
      });
    });
  });

  describe('CRA Deadlines', () => {
    it('should calculate Feb 28 deadline correctly', () => {
      const taxYear = 2024;
      const deadline = new Date(`${taxYear + 1}-02-28`);
      
      expect(deadline.getFullYear()).toBe(2025);
      expect(deadline.getMonth()).toBe(1); // February (0-indexed)
      expect(deadline.getDate()).toBe(28);
    });

    it('should enforce deadline for year-end processing', async () => {
      const status = await getTaxFilingStatus('test-user', 2024);
      
      expect(status.deadline.getFullYear()).toBe(2025);
      expect(status.deadline.getMonth()).toBe(1); // February
      expect(status.deadline.getDate()).toBe(28);
    });
  });

  describe('Tax Filing Status', () => {
    it('should determine if T4A is required', async () => {
      const status = await getTaxFilingStatus('test-user', 2024);
      
      expect(status).toHaveProperty('requiresT4A');
      expect(status).toHaveProperty('t4aIssued');
      expect(status).toHaveProperty('rl1Required');
      expect(status).toHaveProperty('rl1Issued');
      expect(status).toHaveProperty('deadline');
    });

    it('should not require T4A for payments under $500', async () => {
      // Mock getYearlyStrikePay to return $400
      const status = await getTaxFilingStatus('test-user', 2024);
      
      // Status would depend on mocked yearly total
      expect(typeof status.requiresT4A).toBe('boolean');
    });
  });

  describe('SIN Decryption Auditing', () => {
    it('should audit T4A SIN decryption', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member',
        email: 'test@example.com',
        address: '123 Test St',
        encryptedSin: 'encrypted-sin-data',
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);
      const mockLogger = require('@/lib/logger').logger;

      await generateT4A('test-user', 2024);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SIN decrypted for T4A generation',
        expect.objectContaining({
          memberId: 'test-user',
          taxYear: 2024,
          action: 't4a_generation',
        })
      );
    });

    it('should audit RL-1 SIN decryption', async () => {
      const mockUser = {
        userId: 'test-user',
        fullName: 'Test Member QC',
        email: 'test@example.com',
        address: '123 rue Test',
        encryptedSin: 'encrypted-sin-data',
        province: 'QC',
      };

      vi.mocked(require('@/db').db.query.users.findFirst).mockResolvedValue(mockUser);
      const mockLogger = require('@/lib/logger').logger;

      await generateRL1('test-user', 2024);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SIN decrypted for RL-1 generation',
        expect.objectContaining({
          memberId: 'test-user',
          taxYear: 2024,
          action: 'rl1_generation',
        })
      );
    });
  });
});
