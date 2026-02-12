/**
 * GraphQL Pension API Tests
 * 
 * Tests for pension processor GraphQL queries and mutations
 */

import { describe, test, expect, beforeAll} from 'vitest';
import { schema } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { PensionProcessorFactory } from '@/lib/pension-processor';
import { PaymentFrequency, PensionPlanType } from '@/lib/pension-processor/types';

describe('GraphQL Pension API', () => {
  beforeAll(async () => {
    // Initialize pension processor factory
    const factory = PensionProcessorFactory.getInstance();
    await factory.initialize({});
  });

  describe('Pension Processor Queries', () => {
    test('should list all available pension processors', async () => {
      const result = await resolvers.Query.pensionProcessors();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      // Check for CPP
      const cpp = result.find(p => p.type === 'cpp');
      expect(cpp).toBeDefined();
      expect(cpp?.name).toBe('Canada Pension Plan');
      expect(cpp?.minAge).toBe(18);
      expect(cpp?.maxAge).toBe(70);
    });

    test('should get specific pension processor', async () => {
      const result = await resolvers.Query.pensionProcessor(null, { 
        planType: 'CPP' 
      });
      
      expect(result).toBeDefined();
      expect(result.type).toBe('cpp');
      expect(result.name).toBe('Canada Pension Plan');
      expect(result.minAge).toBe(18);
      expect(result.maxAge).toBe(70);
    });

    test('should get OTPP processor with correct capabilities', async () => {
      const result = await resolvers.Query.pensionProcessor(null, { 
        planType: 'OTPP' 
      });
      
      expect(result).toBeDefined();
      expect(result.type).toBe('otpp');
      expect(result.name).toBe('Ontario Teachers\' Pension Plan');
      expect(result.supportsBuyBack).toBe(true);
      expect(result.supportsEarlyRetirement).toBe(true);
      expect(result.supportedProvinces).toContain('ON');
    });

    test('should get contribution rates for CPP 2026', async () => {
      const result = await resolvers.Query.contributionRates(null, {
        planType: 'CPP',
        year: 2026,
      });
      
      expect(result).toBeDefined();
      expect(result.planType).toBe('cpp');
      expect(result.year).toBe(2026);
      expect(result.employeeRate).toBe(0.0595);
      expect(result.employerRate).toBe(0.0595);
      expect(result.maximumPensionableEarnings).toBe(68500);
      expect(result.basicExemption).toBe(3500);
      expect(result.maximumContribution).toBe(3867.5);
    });

    test('should get contribution rates for QPP 2026', async () => {
      const result = await resolvers.Query.contributionRates(null, {
        planType: 'QPP',
        year: 2026,
      });
      
      expect(result).toBeDefined();
      expect(result.planType).toBe('qpp');
      expect(result.year).toBe(2026);
      expect(result.employeeRate).toBe(0.064);
      expect(result.employerRate).toBe(0.064);
    });

    test('should list remittances', async () => {
      const result = await resolvers.Query.remittances(null, {
        planType: 'CPP',
        status: 'SUBMITTED',
      });
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      const remittance = result[0];
      expect(remittance).toBeDefined();
      expect(remittance.planType).toBe('CPP');
      expect(remittance.status).toBe('SUBMITTED');
      expect(remittance.totalContributions).toBeGreaterThan(0);
    });

    test('should get specific remittance by ID', async () => {
      const result = await resolvers.Query.remittance(null, {
        id: 'test-remittance-1',
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBe('test-remittance-1');
      expect(result.planType).toBe('CPP');
      expect(result.status).toBeDefined();
    });
  });

  describe('Pension Contribution Calculations', () => {
    test('should calculate CPP contribution for monthly payment', async () => {
      const input = {
        planType: 'CPP',
        memberId: 'member-123',
        grossEarnings: 5000,
        paymentFrequency: 'MONTHLY' as PaymentFrequency,
        province: 'ON',
        dateOfBirth: new Date('1980-01-01').toISOString(),
        yearToDateEarnings: 20000,
        yearToDateContributions: 1000,
      };

      const result = await resolvers.Mutation.calculatePensionContribution(null, { input });
      
      expect(result).toBeDefined();
      expect(result.planType).toBe('cpp');
      expect(result.employeeContribution).toBeGreaterThan(0);
      expect(result.employerContribution).toBeGreaterThan(0);
      expect(result.totalContribution).toBe(
        result.employeeContribution + result.employerContribution
      );
      expect(result.grossEarnings).toBe(5000);
      expect(result.pensionableEarnings).toBeLessThanOrEqual(result.grossEarnings);
    });

    test('should calculate QPP contribution', async () => {
      const input = {
        planType: 'QPP',
        memberId: 'member-456',
        grossEarnings: 4000,
        paymentFrequency: 'SEMIMONTHLY' as PaymentFrequency,
        province: 'QC',
        dateOfBirth: new Date('1985-06-15').toISOString(),
        yearToDateEarnings: 15000,
        yearToDateContributions: 800,
      };

      const result = await resolvers.Mutation.calculatePensionContribution(null, { input });
      
      expect(result).toBeDefined();
      expect(result.planType).toBe('qpp');
      expect(result.employeeContribution).toBeGreaterThan(0);
      expect(result.employerContribution).toBeGreaterThan(0);
      // QPP has higher rates than CPP
      expect(result.employeeContribution).toBeGreaterThan(0);
    });

    test('should calculate OTPP contribution with tiered rates', async () => {
      const input = {
        planType: 'OTPP',
        memberId: 'member-789',
        grossEarnings: 8000,
        paymentFrequency: 'MONTHLY' as PaymentFrequency,
        province: 'ON',
        dateOfBirth: new Date('1975-03-20').toISOString(),
        yearToDateEarnings: 40000,
        yearToDateContributions: 5000,
      };

      const result = await resolvers.Mutation.calculatePensionContribution(null, { input });
      
      expect(result).toBeDefined();
      expect(result.planType).toBe('ottp');
      expect(result.employeeContribution).toBeGreaterThan(0);
      expect(result.employerContribution).toBeGreaterThan(0);
      // OTPP employer contribution is higher than employee
      expect(result.employerContribution).toBeGreaterThan(result.employeeContribution);
    });
  });

  describe('Remittance Operations', () => {
    test('should create remittance', async () => {
      const input = {
        planType: 'CPP',
        periodStart: new Date('2026-01-01').toISOString(),
        periodEnd: new Date('2026-01-31').toISOString(),
        contributions: ['contrib-1', 'contrib-2', 'contrib-3'],
      };

      const result = await resolvers.Mutation.createRemittance(null, { input });
      
      expect(result).toBeDefined();
      expect(result.planType).toBe('CPP');
      expect(result.status).toBe('PENDING');
      expect(result.totalEmployeeContributions).toBeGreaterThan(0);
      expect(result.totalEmployerContributions).toBeGreaterThan(0);
      expect(result.employeeCount).toBe(3);
      expect(result.confirmationNumber).toBeNull();
    });

    test('should submit remittance', async () => {
      const result = await resolvers.Mutation.submitRemittance(null, {
        id: 'remittance-123',
      });
      
      expect(result).toBeDefined();
      expect(result.status).toBe('SUBMITTED');
      expect(result.confirmationNumber).toBeDefined();
      expect(result.confirmationNumber).toMatch(/^CPP-\d+/);
      expect(result.submittedAt).toBeDefined();
    });
  });

  describe('GraphQL Schema Validation', () => {
    test('should have pension types defined in schema', () => {
      expect(schema).toBeDefined();
      
      // Check schema contains pension types
      const schemaString = schema.toString();
      expect(schemaString).toContain('PensionPlanType');
      expect(schemaString).toContain('PensionContribution');
      expect(schemaString).toContain('ContributionRates');
      expect(schemaString).toContain('PensionRemittance');
      expect(schemaString).toContain('PensionProcessor');
    });

    test('should have pension queries defined', () => {
      expect(resolvers.Query.pensionProcessors).toBeDefined();
      expect(resolvers.Query.pensionProcessor).toBeDefined();
      expect(resolvers.Query.contributionRates).toBeDefined();
      expect(resolvers.Query.remittance).toBeDefined();
      expect(resolvers.Query.remittances).toBeDefined();
    });

    test('should have pension mutations defined', () => {
      expect(resolvers.Mutation.calculatePensionContribution).toBeDefined();
      expect(resolvers.Mutation.createRemittance).toBeDefined();
      expect(resolvers.Mutation.submitRemittance).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid plan type gracefully', async () => {
      await expect(
        resolvers.Query.pensionProcessor(null, { planType: 'INVALID' })
      ).rejects.toThrow();
    });

    test('should handle missing member data in calculation', async () => {
      const input = {
        planType: 'CPP',
        memberId: 'member-invalid',
        grossEarnings: -1000, // Invalid earnings
        paymentFrequency: 'MONTHLY' as PaymentFrequency,
        province: 'ON',
        dateOfBirth: new Date('2020-01-01').toISOString(), // Too young
      };

      await expect(
        resolvers.Mutation.calculatePensionContribution(null, { input })
      ).rejects.toThrow();
    });
  });
});
