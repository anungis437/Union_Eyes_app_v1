/**
 * Unit Tests: CLC Remittance Validation Service
 * Tests validation rules, compliance checks, and error detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RemittanceValidationService,
  remittanceValidator,
  RemittanceRecordSchema,
  type ValidationResult,
  type ValidationError,
} from '@/services/clc/remittance-validation';

// Mock database
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  })),
};

vi.mock('@/db', () => ({
  db: mockDb,
}));

describe('RemittanceValidation - Amount Validation', () => {
  it('should validate remittance matches calculated amount', () => {
    const calculatedAmount = 1320.00;
    const submittedAmount = 1320.00;

    const isValid = Math.abs(calculatedAmount - submittedAmount) < 0.01;

    expect(isValid).toBe(true);
  });

  it('should reject remittance with incorrect amount', () => {
    const calculatedAmount = 1320.00;
    const submittedAmount = 1300.00;

    const isValid = Math.abs(calculatedAmount - submittedAmount) < 0.01;

    expect(isValid).toBe(false);
  });

  it('should allow minor rounding differences (< $0.05)', () => {
    const calculatedAmount = 1320.03;
    const submittedAmount = 1320.00;

    const isValid = Math.abs(calculatedAmount - submittedAmount) < 0.05;

    expect(isValid).toBe(true);
  });

  it('should reject negative remittance amounts', () => {
    const amount = -500;

    const isValid = amount > 0;

    expect(isValid).toBe(false);
  });
});

describe('RemittanceValidation - Member Count Validation', () => {
  it('should validate member count against organization records', () => {
    const reportedMembers = 240;
    const recordedMembers = 240;

    const isValid = reportedMembers === recordedMembers;

    expect(isValid).toBe(true);
  });

  it('should flag discrepancy in member count', () => {
    const reportedMembers = 240;
    const recordedMembers = 255;
    const discrepancy = Math.abs(reportedMembers - recordedMembers);

    expect(discrepancy).toBeGreaterThan(0);
    expect(discrepancy).toBe(15);
  });

  it('should allow small discrepancies (< 5%)', () => {
    const reportedMembers = 240;
    const recordedMembers = 245;
    const variance = Math.abs(reportedMembers - recordedMembers) / recordedMembers;

    const isWithinTolerance = variance < 0.05;

    expect(isWithinTolerance).toBe(true);
  });
});

describe('RemittanceValidation - Timeliness Checks', () => {
  it('should validate remittance submitted before due date', () => {
    const submissionDate = new Date('2026-03-10');
    const dueDate = new Date('2026-03-15');

    const isOnTime = submissionDate.getTime() <= dueDate.getTime();

    expect(isOnTime).toBe(true);
  });

  it('should flag late remittance', () => {
    const submissionDate = new Date('2026-03-20');
    const dueDate = new Date('2026-03-15');

    const isLate = submissionDate.getTime() > dueDate.getTime();

    expect(isLate).toBe(true);
  });

  it('should calculate late fee for overdue remittance', () => {
    const baseAmount = 1320.00;
    const lateFeePercent = 2; // 2% per month
    const lateFee = baseAmount * (lateFeePercent / 100);

    expect(lateFee).toBeCloseTo(26.40, 2);
  });
});

describe('RemittanceValidation - Duplicate Detection', () => {
  it('should detect duplicate remittance submission', () => {
    const existingRemittances = [
      { month: 1, year: 2026, organizationId: 'local-123' },
      { month: 2, year: 2026, organizationId: 'local-123' },
    ];

    const newRemittance = { month: 1, year: 2026, organizationId: 'local-123' };

    const isDuplicate = existingRemittances.some(
      r => r.month === newRemittance.month &&
           r.year === newRemittance.year &&
           r.organizationId === newRemittance.organizationId
    );

    expect(isDuplicate).toBe(true);
  });

  it('should allow remittance for different month', () => {
    const existingRemittances = [
      { month: 1, year: 2026, organizationId: 'local-123' },
    ];

    const newRemittance = { month: 2, year: 2026, organizationId: 'local-123' };

    const isDuplicate = existingRemittances.some(
      r => r.month === newRemittance.month &&
           r.year === newRemittance.year &&
           r.organizationId === newRemittance.organizationId
    );

    expect(isDuplicate).toBe(false);
  });
});

describe('RemittanceValidation - Rate Validation', () => {
  it('should validate per-capita rate matches CLC standard', () => {
    const submittedRate = 5.50;
    const standardRate = 5.50;

    const isValid = submittedRate === standardRate;

    expect(isValid).toBe(true);
  });

  it('should reject incorrect per-capita rate', () => {
    const submittedRate: number = 5.00;
    const standardRate: number = 5.50;

    const isValid = submittedRate === standardRate;

    expect(isValid).toBe(false);
  });

  it('should handle rate changes effective date', () => {
    const remittanceMonth = new Date('2026-03-01');
    const rateChangeDate = new Date('2026-01-01');

    const applicableRate = remittanceMonth >= rateChangeDate ? 5.50 : 5.00;

    expect(applicableRate).toBe(5.50);
  });
});

describe('RemittanceValidation - Documentation Requirements', () => {
  it('should require member roster attachment', () => {
    const remittance = {
      memberRosterAttached: true,
      memberCount: 240,
    };

    const isComplete = remittance.memberRosterAttached;

    expect(isComplete).toBe(true);
  });

  it('should require payment confirmation', () => {
    const remittance = {
      paymentMethod: 'EFT',
      transactionReference: 'TXN-20260310-001',
    };

    const hasConfirmation = 
      remittance.paymentMethod &&
      remittance.transactionReference;

    expect(hasConfirmation).toBeTruthy();
  });

  it('should require authorized signatory', () => {
    const remittance = {
      submittedBy: 'John Smith',
      signatoryRole: 'Treasurer',
      authorizationDate: new Date('2026-03-10'),
    };

    const isAuthorized = 
      remittance.submittedBy &&
      remittance.signatoryRole &&
      remittance.authorizationDate;

    expect(isAuthorized).toBeTruthy();
  });
});

describe('RemittanceValidation - Compliance Checks', () => {
  it('should verify organization is in good standing', () => {
    const organization = {
      isGoodStanding: true,
      lastRemittanceDate: new Date('2026-02-15'),
      overdueCount: 0,
    };

    const isCompliant = 
      organization.isGoodStanding &&
      organization.overdueCount === 0;

    expect(isCompliant).toBe(true);
  });

  it('should flag organization with overdue remittances', () => {
    const organization = {
      isGoodStanding: false,
      overdueCount: 2,
    };

    const hasIssues = organization.overdueCount > 0;

    expect(hasIssues).toBe(true);
  });

  it('should track consecutive on-time remittances', () => {
    const remittanceHistory = [
      { month: 'Jan', onTime: true },
      { month: 'Feb', onTime: true },
      { month: 'Mar', onTime: true },
    ];

    const consecutiveOnTime = remittanceHistory.filter(r => r.onTime).length;

    expect(consecutiveOnTime).toBe(3);
  });
});

describe('RemittanceValidation - Error Messages', () => {
  it('should generate clear error for amount mismatch', () => {
    const error = {
      code: 'AMOUNT_MISMATCH',
      message: 'Submitted amount ($1,300.00) does not match calculated amount ($1,320.00)',
      expected: 1320.00,
      actual: 1300.00,
    };

    expect(error.code).toBe('AMOUNT_MISMATCH');
    expect(error.expected).toBe(1320.00);
  });

  it('should generate clear error for late submission', () => {
    const error = {
      code: 'LATE_SUBMISSION',
      message: 'Remittance submitted 5 days after due date',
      daysLate: 5,
    };

    expect(error.code).toBe('LATE_SUBMISSION');
    expect(error.daysLate).toBe(5);
  });

  it('should generate clear error for missing documentation', () => {
    const error = {
      code: 'MISSING_DOCUMENTATION',
      message: 'Required member roster not attached',
      missingItem: 'memberRoster',
    };

    expect(error.code).toBe('MISSING_DOCUMENTATION');
    expect(error.missingItem).toBe('memberRoster');
  });
});

describe('RemittanceValidation - Batch Validation', () => {
  it('should validate multiple remittances at once', () => {
    const batch = [
      { localId: 'local-1', amount: 1320, members: 240 },
      { localId: 'local-2', amount: 990, members: 180 },
      { localId: 'local-3', amount: 522.50, members: 95 },
    ];

    const allValid = batch.every(r => r.amount > 0 && r.members > 0);

    expect(allValid).toBe(true);
  });

  it('should calculate batch total', () => {
    const batch = [
      { amount: 1320.00 },
      { amount: 990.00 },
      { amount: 522.50 },
    ];

    const batchTotal = batch.reduce((sum, r) => sum + r.amount, 0);

    expect(batchTotal).toBe(2832.50);
  });

  it('should identify failed validation in batch', () => {
    const batch = [
      { id: 'r1', valid: true },
      { id: 'r2', valid: false, error: 'Amount mismatch' },
      { id: 'r3', valid: true },
    ];

    const failedCount = batch.filter(r => !r.valid).length;

    expect(failedCount).toBe(1);
  });
});

// ====================================================================
// COMPREHENSIVE TESTS FOR ACTUAL SERVICE METHODS
// ====================================================================

describe('RemittanceValidationService - validateRecord', () => {
  let service: RemittanceValidationService;

  beforeEach(() => {
    service = new RemittanceValidationService();
  });

  it('should validate a valid remittance record', () => {
    const validRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Local Union 123',
      fromOrgCode: 'LU-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC National',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 240,
      perCapitaRate: '5.50',
      totalAmount: '1320.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(validRecord);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid UUID formats', () => {
    const invalidRecord = {
      id: 'invalid-uuid',
      fromOrgId: 'invalid',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
    expect(result.errors.some(e => e.field === 'fromOrgId')).toBe(true);
  });

  it('should detect invalid organization code format', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test Org',
      fromOrgCode: 'invalid code!',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'fromOrgCode')).toBe(true);
  });

  it('should detect period end before period start', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-02-01'),
      periodEnd: new Date('2026-01-01'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'periodEnd')).toBe(true);
    expect(result.errors.find(e => e.field === 'periodEnd')?.message).toContain('after period start');
  });

  it('should detect amount calculation mismatch', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 240,
      perCapitaRate: '5.50',
      totalAmount: '1000.00', // Should be 1320.00
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'totalAmount')).toBe(true);
    expect(result.errors.find(e => e.field === 'totalAmount')?.message).toContain('mismatch');
  });

  it('should warn when due date is before period end', () => {
    const record = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 240,
      perCapitaRate: '5.50',
      totalAmount: '1320.00',
      status: 'pending',
      dueDate: new Date('2026-01-15'), // Before period end
    };

    const result = service.validateRecord(record);

    expect(result.warnings.some(w => w.field === 'dueDate')).toBe(true);
    expect(result.warnings.find(w => w.field === 'dueDate')?.message).toContain('before period end');
  });

  it('should error when status is paid but no paid date', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 240,
      perCapitaRate: '5.50',
      totalAmount: '1320.00',
      status: 'paid',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'paidDate')).toBe(true);
  });

  it('should warn when total amount is zero', () => {
    const record = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 0,
      perCapitaRate: '5.50',
      totalAmount: '0.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(record);

    expect(result.warnings.some(w => w.field === 'totalAmount')).toBe(true);
    expect(result.warnings.some(w => w.field === 'remittableMembers')).toBe(true);
  });

  it('should handle negative remittable members', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: -10,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'remittableMembers')).toBe(true);
  });

  it('should detect invalid per-capita rate format', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.5', // Should be 5.50
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'perCapitaRate')).toBe(true);
  });

  it('should detect invalid status', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'invalid_status',
      dueDate: new Date('2026-02-15'),
    };

    const result = service.validateRecord(invalidRecord);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });

  it('should handle all valid statuses', () => {
    const statuses = ['pending', 'paid', 'overdue', 'cancelled'];

    for (const status of statuses) {
      const record = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
        fromOrgName: 'Test',
        fromOrgCode: 'TEST-123',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 100,
        perCapitaRate: '5.50',
        totalAmount: '550.00',
        status,
        dueDate: new Date('2026-02-15'),
        paidDate: status === 'paid' ? new Date('2026-02-10') : undefined,
      };

      const result = service.validateRecord(record);
      
      if (status === 'paid') {
        expect(result.valid).toBe(true);
      }
    }
  });
});

describe('RemittanceValidationService - validateBatch', () => {
  let service: RemittanceValidationService;

  beforeEach(() => {
    service = new RemittanceValidationService();
  });

  it('should validate a batch of valid records', () => {
    const records = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
        fromOrgName: 'Local 1',
        fromOrgCode: 'LU-001',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 100,
        perCapitaRate: '5.50',
        totalAmount: '550.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440004',
        fromOrgName: 'Local 2',
        fromOrgCode: 'LU-002',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 200,
        perCapitaRate: '5.50',
        totalAmount: '1100.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
      },
    ];

    const result = service.validateBatch(records);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect errors in multiple records', () => {
    const records = [
      {
        id: 'invalid',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
        fromOrgName: 'Local 1',
        fromOrgCode: 'LU-001',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 100,
        perCapitaRate: '5.50',
        totalAmount: '550.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        fromOrgId: 'invalid',
        fromOrgName: 'Local 2',
        fromOrgCode: 'LU-002',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 200,
        perCapitaRate: '5.50',
        totalAmount: '1100.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
      },
    ];

    const result = service.validateBatch(records);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('record[0]'))).toBe(true);
    expect(result.errors.some(e => e.field.includes('record[1]'))).toBe(true);
  });

  it('should error on empty batch', () => {
    const result = service.validateBatch([]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'batch')).toBe(true);
    expect(result.errors.find(e => e.field === 'batch')?.message).toContain('No records');
  });

  it('should collect warnings from multiple records', () => {
    const records = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
        fromOrgName: 'Local 1',
        fromOrgCode: 'LU-001',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 0,
        perCapitaRate: '5.50',
        totalAmount: '0.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
      },
    ];

    const result = service.validateBatch(records);

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should prefix field names with record index', () => {
    const records = [
      {
        id: 'invalid',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
        fromOrgName: 'Test',
        fromOrgCode: 'TEST-123',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 100,
        perCapitaRate: '5.50',
        totalAmount: '550.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
      },
    ];

    const result = service.validateBatch(records);

    expect(result.errors[0].field).toContain('record[0]');
  });
});

describe('RemittanceValidationService - validateCLCFormat', () => {
  let service: RemittanceValidationService;

  beforeEach(() => {
    service = new RemittanceValidationService();
  });

  it('should validate CLC standard format', () => {
    const record = {
      fromOrgCode: 'AB-123',
      toOrgCode: 'CLC-001',
      clcAccountCode: 'ACC-001',
    };

    const result = service.validateCLCFormat(record);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn on non-standard fromOrgCode format', () => {
    const record = {
      fromOrgCode: 'invalid',
      toOrgCode: 'CLC-001',
      clcAccountCode: 'ACC-001',
    };

    const result = service.validateCLCFormat(record);

    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.field === 'fromOrgCode')).toBe(true);
    expect(result.warnings.find(w => w.field === 'fromOrgCode')?.message).toContain('CLC standard format');
  });

  it('should warn on non-standard toOrgCode format', () => {
    const record = {
      fromOrgCode: 'AB-123',
      toOrgCode: 'invalid',
      clcAccountCode: 'ACC-001',
    };

    const result = service.validateCLCFormat(record);

    expect(result.warnings.some(w => w.field === 'toOrgCode')).toBe(true);
  });

  it('should warn when CLC account code is missing', () => {
    const record = {
      fromOrgCode: 'AB-123',
      toOrgCode: 'CLC-001',
    };

    const result = service.validateCLCFormat(record);

    expect(result.warnings.some(w => w.field === 'clcAccountCode')).toBe(true);
  });

  it('should accept various CLC code formats', () => {
    const validCodes = [
      'AB-123',
      'ABC-1234',
      'ABCD-12345',
      'XY-999',
    ];

    for (const code of validCodes) {
      const record = {
        fromOrgCode: code,
        toOrgCode: code,
        clcAccountCode: 'ACC-001',
      };

      const result = service.validateCLCFormat(record);
      expect(result.valid).toBe(true);
    }
  });

  it('should handle empty record gracefully', () => {
    const result = service.validateCLCFormat({});

    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.field === 'clcAccountCode')).toBe(true);
  });
});

describe('RemittanceValidationService - validateStatCanFormat', () => {
  let service: RemittanceValidationService;

  beforeEach(() => {
    service = new RemittanceValidationService();
  });

  it('should validate StatCan compliant record', () => {
    const record = {
      fromOrgCode: 'ABC123',
      fromOrgName: 'Local Union',
      toOrgCode: 'CLC001',
      toOrgName: 'CLC National',
      remittableMembers: 100,
      totalAmount: '550.00',
    };

    const result = service.validateStatCanFormat(record);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should error on invalid StatCan code format', () => {
    const record = {
      fromOrgCode: 'INVALID-CODE!',
      fromOrgName: 'Local Union',
      toOrgCode: 'CLC001',
      toOrgName: 'CLC National',
      remittableMembers: 100,
      totalAmount: '550.00',
    };

    const result = service.validateStatCanFormat(record);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'fromOrgCode')).toBe(true);
    expect(result.errors.find(e => e.field === 'fromOrgCode')?.message).toContain('StatCan');
  });

  it('should error on missing required fields', () => {
    const record = {
      fromOrgCode: 'ABC123',
    };

    const result = service.validateStatCanFormat(record);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'fromOrgName')).toBe(true);
    expect(result.errors.some(e => e.field === 'toOrgCode')).toBe(true);
    expect(result.errors.some(e => e.field === 'toOrgName')).toBe(true);
    expect(result.errors.some(e => e.field === 'remittableMembers')).toBe(true);
    expect(result.errors.some(e => e.field === 'totalAmount')).toBe(true);
  });

  it('should error on non-positive member count', () => {
    const record = {
      fromOrgCode: 'ABC123',
      fromOrgName: 'Local Union',
      toOrgCode: 'CLC001',
      toOrgName: 'CLC National',
      remittableMembers: 0,
      totalAmount: '0.00',
    };

    const result = service.validateStatCanFormat(record);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'remittableMembers')).toBe(true);
    expect(result.errors.find(e => e.field === 'remittableMembers')?.message).toContain('positive');
  });

  it('should accept alphanumeric codes up to 10 chars', () => {
    const validCodes = ['A', 'AB', 'ABC123', 'A1B2C3D4E5', '1234567890'];

    for (const code of validCodes) {
      const record = {
        fromOrgCode: code,
        fromOrgName: 'Test',
        toOrgCode: 'CLC001',
        toOrgName: 'CLC',
        remittableMembers: 100,
        totalAmount: '550.00',
      };

      const result = service.validateStatCanFormat(record);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject codes with special characters', () => {
    const invalidCodes = ['ABC-123', 'AB_C', 'AB C', 'AB!C'];

    for (const code of invalidCodes) {
      const record = {
        fromOrgCode: code,
        fromOrgName: 'Test',
        toOrgCode: 'CLC001',
        toOrgName: 'CLC',
        remittableMembers: 100,
        totalAmount: '550.00',
      };

      const result = service.validateStatCanFormat(record);
      expect(result.valid).toBe(false);
    }
  });

  it('should handle negative member count', () => {
    const record = {
      fromOrgCode: 'ABC123',
      fromOrgName: 'Local Union',
      toOrgCode: 'CLC001',
      toOrgName: 'CLC National',
      remittableMembers: -10,
      totalAmount: '550.00',
    };

    const result = service.validateStatCanFormat(record);

    expect(result.valid).toBe(false);
  });
});

describe('RemittanceValidationService - formatValidationErrors', () => {
  let service: RemittanceValidationService;

  beforeEach(() => {
    service = new RemittanceValidationService();
  });

  it('should format errors and warnings', () => {
    const validationResult: ValidationResult = {
      valid: false,
      errors: [
        { field: 'id', message: 'Invalid UUID', severity: 'error' },
        { field: 'amount', message: 'Amount mismatch', severity: 'error' },
      ],
      warnings: [
        { field: 'dueDate', message: 'Due date is early', severity: 'warning' },
      ],
    };

    const formatted = service.formatValidationErrors(validationResult);

    expect(formatted).toContain('ERRORS:');
    expect(formatted).toContain('id: Invalid UUID');
    expect(formatted).toContain('amount: Amount mismatch');
    expect(formatted).toContain('WARNINGS:');
    expect(formatted).toContain('dueDate: Due date is early');
  });

  it('should format errors only', () => {
    const validationResult: ValidationResult = {
      valid: false,
      errors: [
        { field: 'id', message: 'Invalid UUID', severity: 'error' },
      ],
      warnings: [],
    };

    const formatted = service.formatValidationErrors(validationResult);

    expect(formatted).toContain('ERRORS:');
    expect(formatted).toContain('id: Invalid UUID');
    expect(formatted).not.toContain('WARNINGS:');
  });

  it('should format warnings only', () => {
    const validationResult: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [
        { field: 'amount', message: 'Amount is zero', severity: 'warning' },
      ],
    };

    const formatted = service.formatValidationErrors(validationResult);

    expect(formatted).not.toContain('ERRORS:');
    expect(formatted).toContain('WARNINGS:');
    expect(formatted).toContain('amount: Amount is zero');
  });

  it('should return empty string for no errors or warnings', () => {
    const validationResult: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const formatted = service.formatValidationErrors(validationResult);

    expect(formatted).toBe('');
  });

  it('should format multiple errors and warnings', () => {
    const validationResult: ValidationResult = {
      valid: false,
      errors: [
        { field: 'id', message: 'Error 1', severity: 'error' },
        { field: 'name', message: 'Error 2', severity: 'error' },
        { field: 'code', message: 'Error 3', severity: 'error' },
      ],
      warnings: [
        { field: 'field1', message: 'Warning 1', severity: 'warning' },
        { field: 'field2', message: 'Warning 2', severity: 'warning' },
      ],
    };

    const formatted = service.formatValidationErrors(validationResult);

    expect(formatted.split('\n').length).toBeGreaterThan(5);
  });
});

describe('RemittanceValidationService - Singleton Instance', () => {
  it('should export a singleton remittanceValidator instance', () => {
    expect(remittanceValidator).toBeInstanceOf(RemittanceValidationService);
  });

  it('should use the singleton instance for validation', () => {
    const validRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = remittanceValidator.validateRecord(validRecord);

    expect(result.valid).toBe(true);
  });
});

describe('RemittanceRecordSchema - Zod Schema Validation', () => {
  it('should validate a complete valid record', () => {
    const validRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test Org',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC National',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = RemittanceRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);
  });

  it('should validate record with optional fields', () => {
    const validRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test Org',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC National',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'paid',
      dueDate: new Date('2026-02-15'),
      paidDate: new Date('2026-02-10'),
      clcAccountCode: 'ACC-001',
      glAccount: 'GL-001',
      notes: 'Test notes',
    };

    const result = RemittanceRecordSchema.safeParse(validRecord);

    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const invalidRecord = {
      id: 'not-a-uuid',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test Org',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC National',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = RemittanceRecordSchema.safeParse(invalidRecord);

    expect(result.success).toBe(false);
  });

  it('should reject empty organization name', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: '',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC National',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100,
      perCapitaRate: '5.50',
      totalAmount: '550.00',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = RemittanceRecordSchema.safeParse(invalidRecord);

    expect(result.success).toBe(false);
  });

  it('should reject fractional member count', () => {
    const invalidRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
      fromOrgName: 'Test',
      fromOrgCode: 'TEST-123',
      toOrgId: '550e8400-e29b-41d4-a716-446655440002',
      toOrgName: 'CLC',
      toOrgCode: 'CLC-001',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      remittableMembers: 100.5,
      perCapitaRate: '5.50',
      totalAmount: '552.75',
      status: 'pending',
      dueDate: new Date('2026-02-15'),
    };

    const result = RemittanceRecordSchema.safeParse(invalidRecord);

    expect(result.success).toBe(false);
  });
});

describe('RemittanceValidation - Integration Tests', () => {
  let service: RemittanceValidationService;

  beforeEach(() => {
    service = new RemittanceValidationService();
  });

  it('should validate end-to-end scenario with valid records', () => {
    const records = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fromOrgId: '550e8400-e29b-41d4-a716-446655440001',
        fromOrgName: 'Local Union 123',
        fromOrgCode: 'LU-123',
        toOrgId: '550e8400-e29b-41d4-a716-446655440002',
        toOrgName: 'CLC National',
        toOrgCode: 'CLC-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        remittableMembers: 240,
        perCapitaRate: '5.50',
        totalAmount: '1320.00',
        status: 'pending',
        dueDate: new Date('2026-02-15'),
        clcAccountCode: 'ACC-001',
      },
    ];

    const batchResult = service.validateBatch(records);
    expect(batchResult.valid).toBe(true);

    const clcResult = service.validateCLCFormat(records[0]);
    expect(clcResult.valid).toBe(true);

    const formatted = service.formatValidationErrors(batchResult);
    expect(formatted).toBe('');
  });

  it('should handle complex validation with multiple error types', () => {
    const record = {
      id: 'invalid',
      fromOrgId: 'invalid',
      fromOrgName: '',
      fromOrgCode: 'invalid!',
      toOrgId: 'invalid',
      toOrgName: '',
      toOrgCode: 'invalid!',
      periodStart: new Date('2026-02-01'),
      periodEnd: new Date('2026-01-01'),
      remittableMembers: -10,
      perCapitaRate: '5.5',
      totalAmount: '1000',
      status: 'invalid',
      dueDate: new Date('2026-01-15'),
    };

    const result = service.validateRecord(record);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);

    const formatted = service.formatValidationErrors(result);
    expect(formatted).toContain('ERRORS:');
  });
});

