/**
 * Pension Processor Integration Tests
 * Tests for CPP/QPP and OTPP processors
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Decimal } from 'decimal.js';
import { PensionProcessorFactory } from '@/lib/pension-processor/pension-factory';
import {
  PensionPlanType,
  EmploymentStatus,
  type PensionMember,
  type PensionableEarnings,
} from '@/lib/pension-processor/types';

describe('Pension Processor Integration Tests', () => {
  let factory: PensionProcessorFactory;

  beforeAll(async () => {
    factory = PensionProcessorFactory.getInstance();
    
    // Initialize with test configuration
    await factory.initialize({
      defaultPlan: PensionPlanType.CPP,
      plans: {
        [PensionPlanType.CPP]: {
          planType: PensionPlanType.CPP,
          environment: 'sandbox',
          metadata: {},
        },
        [PensionPlanType.QPP]: {
          planType: PensionPlanType.QPP,
          environment: 'sandbox',
          metadata: {},
        },
        [PensionPlanType.OTPP]: {
          planType: PensionPlanType.OTPP,
          employerAccountNumber: 'TEST-OTPP-12345',
          environment: 'sandbox',
          metadata: {},
        },
      },
    });
  });

  describe('CPP Processor', () => {
    it('should be available in factory', () => {
      const isAvailable = factory.isProcessorAvailable(PensionPlanType.CPP);
      expect(isAvailable).toBe(true);
    });

    it('should have correct capabilities', () => {
      const capabilities = factory.getProcessorCapabilities(PensionPlanType.CPP);
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsElectronicRemittance).toBe(true);
      expect(capabilities.minimumAge).toBe(18);
      expect(capabilities.maximumAge).toBe(70);
    });

    it('should calculate contribution correctly', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const member: PensionMember = {
        id: 'test-member-1',
        employeeNumber: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        hireDate: new Date('2020-01-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'ON',
        annualSalary: new Decimal('50000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('4166.67'), // Monthly: $50k / 12
        pensionableEarnings: new Decimal('4166.67'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      expect(calculation).toBeDefined();
      expect(calculation.memberId).toBe(member.id);
      expect(calculation.planType).toBe(PensionPlanType.CPP);
      expect(calculation.employeeContribution.greaterThan(0)).toBe(true);
      expect(calculation.employerContribution.greaterThan(0)).toBe(true);
      
      // CPP rates should be equal for employee and employer
      expect(calculation.employeeRate.equals(calculation.employerRate)).toBe(true);
      
      // Basic exemption should be applied
      expect(calculation.basicExemptAmount).toBeDefined();
      expect(calculation.basicExemptAmount!.greaterThan(0)).toBe(true);
    });

    it('should handle high earner correctly', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const member: PensionMember = {
        id: 'test-member-2',
        employeeNumber: 'EMP-002',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-06-15'),
        hireDate: new Date('2015-01-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'BC',
        annualSalary: new Decimal('150000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('12500'), // Monthly: $150k / 12
        pensionableEarnings: new Decimal('12500'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      expect(calculation).toBeDefined();
      expect(calculation.pensionableEarnings.greaterThan(0)).toBe(true);
      expect(calculation.employeeContribution.greaterThan(0)).toBe(true);
      
      // Verify contribution is calculated at correct rate
      const expectedContribution = calculation.pensionableEarnings.times(new Decimal('0.0595'));
      const rounded = expectedContribution.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      expect(calculation.employeeContribution.equals(rounded)).toBe(true);
    });

    it('should return zero contributions for underage member', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const member: PensionMember = {
        id: 'test-member-3',
        employeeNumber: 'EMP-003',
        firstName: 'Young',
        lastName: 'Person',
        dateOfBirth: new Date('2010-01-01'), // 16 years old
        hireDate: new Date('2024-01-01'),
        employmentStatus: EmploymentStatus.PART_TIME,
        province: 'ON',
        annualSalary: new Decimal('15000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('1250'),
        pensionableEarnings: new Decimal('1250'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      expect(calculation.employeeContribution.equals(0)).toBe(true);
      expect(calculation.employerContribution.equals(0)).toBe(true);
    });

    it('should get current contribution rates', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const rates = await processor.getContributionRates(2026);
      
      expect(rates).toBeDefined();
      expect(rates.taxYear).toBe(2026);
      expect(rates.employeeRate.equals(new Decimal('0.0595'))).toBe(true);
      expect(rates.yearlyMaximumPensionableEarnings.equals(new Decimal('68500'))).toBe(true);
      expect(rates.basicExemptAmount?.equals(new Decimal('3500'))).toBe(true);
    });
  });

  describe('QPP Processor', () => {
    it('should be available in factory', () => {
      const isAvailable = factory.isProcessorAvailable(PensionPlanType.QPP);
      expect(isAvailable).toBe(true);
    });

    it('should have higher rates than CPP', async () => {
      const cppProcessor = factory.getProcessor(PensionPlanType.CPP);
      const qppProcessor = factory.getProcessor(PensionPlanType.QPP);
      
      const cppRates = await cppProcessor.getContributionRates(2026);
      const qppRates = await qppProcessor.getContributionRates(2026);
      
      // QPP typically has higher rates than CPP
      expect(qppRates.employeeRate.greaterThan(cppRates.employeeRate)).toBe(true);
    });

    it('should calculate contribution correctly', async () => {
      const processor = factory.getProcessor(PensionPlanType.QPP);
      
      const member: PensionMember = {
        id: 'test-member-qpp-1',
        employeeNumber: 'EMP-QC-001',
        firstName: 'Pierre',
        lastName: 'Dubois',
        dateOfBirth: new Date('1988-03-15'),
        hireDate: new Date('2018-01-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'QC',
        annualSalary: new Decimal('60000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('5000'), // Monthly
        pensionableEarnings: new Decimal('5000'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      expect(calculation).toBeDefined();
      expect(calculation.planType).toBe(PensionPlanType.QPP);
      expect(calculation.employeeContribution.greaterThan(0)).toBe(true);
    });
  });

  describe('OTPP Processor', () => {
    it('should be available in factory', () => {
      const isAvailable = factory.isProcessorAvailable(PensionPlanType.OTPP);
      expect(isAvailable).toBe(true);
    });

    it('should have correct capabilities', () => {
      const capabilities = factory.getProcessorCapabilities(PensionPlanType.OTPP);
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsBuyBack).toBe(true);
      expect(capabilities.supportsEarlyRetirement).toBe(true);
    });

    it('should calculate contribution with tiered rates', async () => {
      const processor = factory.getProcessor(PensionPlanType.OTPP);
      
      const member: PensionMember = {
        id: 'test-member-otpp-1',
        employeeNumber: 'TEACH-001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        dateOfBirth: new Date('1982-08-20'),
        hireDate: new Date('2010-09-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'ON',
        annualSalary: new Decimal('85000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('7083.33'), // Monthly: $85k / 12
        pensionableEarnings: new Decimal('7083.33'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      expect(calculation).toBeDefined();
      expect(calculation.planType).toBe(PensionPlanType.OTPP);
      expect(calculation.employeeContribution.greaterThan(0)).toBe(true);
      expect(calculation.employerContribution.greaterThan(0)).toBe(true);
      
      // OTPP employer contribution should be higher than employee
      expect(calculation.employerContribution.greaterThan(calculation.employeeContribution)).toBe(true);
      
      // Check metadata
      expect(calculation.metadata?.tieredCalculation).toBe(true);
    });

    it('should calculate high earner with multiple tiers', async () => {
      const processor = factory.getProcessor(PensionPlanType.OTPP);
      
      const member: PensionMember = {
        id: 'test-member-otpp-2',
        employeeNumber: 'TEACH-002',
        firstName: 'Michael',
        lastName: 'Brown',
        dateOfBirth: new Date('1975-04-10'),
        hireDate: new Date('2000-09-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'ON',
        annualSalary: new Decimal('120000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('10000'), // Monthly
        pensionableEarnings: new Decimal('10000'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      expect(calculation).toBeDefined();
      expect(calculation.employeeContribution.greaterThan(0)).toBe(true);
      
      // Higher earners should have higher effective rates due to tiering
      const effectiveRate = calculation.employeeContribution.dividedBy(calculation.pensionableEarnings);
      expect(effectiveRate.greaterThan(new Decimal('0.10'))).toBe(true);
    });

    it('should reject non-Ontario members', async () => {
      const processor = factory.getProcessor(PensionPlanType.OTPP);
      
      const member: PensionMember = {
        id: 'test-member-otpp-3',
        employeeNumber: 'TEACH-003',
        firstName: 'Invalid',
        lastName: 'Province',
        dateOfBirth: new Date('1980-01-01'),
        hireDate: new Date('2010-01-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'BC', // Not Ontario
        annualSalary: new Decimal('70000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('5833.33'),
        pensionableEarnings: new Decimal('5833.33'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      await expect(
        processor.calculateContribution(member, earnings)
      ).rejects.toThrow('Ontario teachers');
    });
  });

  describe('Pension Factory', () => {
    it('should list available processors', () => {
      const available = factory.getAvailableProcessors();
      expect(available).toContain(PensionPlanType.CPP);
      expect(available).toContain(PensionPlanType.QPP);
      expect(available).toContain(PensionPlanType.OTPP);
    });

    it('should get default processor', () => {
      const defaultProcessor = factory.getDefaultProcessor();
      expect(defaultProcessor).toBeDefined();
      expect(defaultProcessor.type).toBe(PensionPlanType.CPP);
    });

    it('should throw error for unavailable processor', () => {
      expect(() => {
        factory.getProcessor('unknown' as PensionPlanType);
      }).toThrow();
    });
  });

  describe('Remittance Creation', () => {
    it('should create remittance for CPP contributions', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const member: PensionMember = {
        id: 'remit-member-1',
        employeeNumber: 'EMP-R001',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: new Date('1990-01-01'),
        hireDate: new Date('2020-01-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'ON',
        annualSalary: new Decimal('50000'),
      };

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('4166.67'),
        pensionableEarnings: new Decimal('4166.67'),
        periodStartDate: new Date('2026-01-01'),
        periodEndDate: new Date('2026-01-31'),
      };

      const calculation = await processor.calculateContribution(member, earnings);
      
      const remittance = await processor.createRemittance(
        [calculation],
        1, // January
        2026
      );

      expect(remittance).toBeDefined();
      expect(remittance.id).toBeDefined();
      expect(remittance.planType).toBe(PensionPlanType.CPP);
      expect(remittance.numberOfMembers).toBe(1);
      expect(remittance.status).toBe('pending');
      expect(remittance.totalEmployeeContributions.equals(calculation.employeeContribution)).toBe(true);
    });

    it('should submit remittance in sandbox mode', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const submitted = await processor.submitRemittance('test-remittance-id');
      
      expect(submitted).toBeDefined();
      expect(submitted.status).toBe('confirmed');
      expect(submitted.confirmationNumber).toBeDefined();
    });
  });

  describe('Year-to-Date Calculations', () => {
    it('should cap contributions at maximum', async () => {
      const processor = factory.getProcessor(PensionPlanType.CPP);
      
      const member: PensionMember = {
        id: 'ytd-member-1',
        employeeNumber: 'EMP-YTD-001',
        firstName: 'High',
        lastName: 'Earner',
        dateOfBirth: new Date('1980-01-01'),
        hireDate: new Date('2015-01-01'),
        employmentStatus: EmploymentStatus.FULL_TIME,
        province: 'ON',
        annualSalary: new Decimal('200000'),
      };

      // Simulate near-maximum YTD contributions
      const ytdEarnings = new Decimal('65000'); // Near maximum
      const ytdContributions = new Decimal('3700'); // Near maximum

      const earnings: PensionableEarnings = {
        grossEarnings: new Decimal('16666.67'), // Monthly
        pensionableEarnings: new Decimal('16666.67'),
        periodStartDate: new Date('2026-12-01'),
        periodEndDate: new Date('2026-12-31'),
      };

      const calculation = await processor.calculateContribution(
        member,
        earnings,
        ytdEarnings,
        ytdContributions
      );
      
      expect(calculation).toBeDefined();
      
      // Contribution should be reduced/zero if at maximum
      const rates = await processor.getContributionRates(2026);
      const totalYTD = ytdContributions.plus(calculation.employeeContribution);
      expect(totalYTD.lessThanOrEqualTo(rates.yearlyMaximumContribution)).toBe(true);
    });
  });
});
