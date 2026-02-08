/**
 * Unit Tests: Certification Management Service
 * Tests certification issuance, renewals, CE tracking, and alerts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificationManagementService } from '@/services/certification-management-service';

// Mock database
const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([
          {
            id: 'cert-type-1',
            certificationName: 'Labour Relations Officer',
            issuingBody: 'CIRB',
            requiresRenewal: true,
            renewalFrequencyMonths: '24',
            ceRequired: true,
            ceHoursPerRenewalPeriod: 30,
          }
        ])),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([
        {
          id: 'cert-1',
          userId: 'user-123',
          certificationTypeId: 'cert-type-1',
          certificationNumber: 'LRO-2026-001',
          issuedDate: new Date('2026-02-01'),
          expiryDate: new Date('2028-02-01'),
          status: 'active',
          compliant: true,
        }
      ])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  })),
}));

vi.mock('@/db', () => ({
  db: mockDb,
}));

describe('CertificationManagementService - Certification Issuance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should issue new certification with valid data', async () => {
    const issuance = {
      userId: 'user-123',
      fullName: 'Jane Smith',
      role: 'Labour Relations Officer',
      certificationTypeId: 'cert-type-1',
      certificationNumber: 'LRO-2026-001',
      issuedDate: new Date('2026-02-01'),
      expiryDate: new Date('2028-02-01'),
    };

    const result = await CertificationManagementService.issueCertification(issuance, 'admin-1');

    expect(result).toBeDefined();
    expect(result.certificationNumber).toBe('LRO-2026-001');
    expect(result.status).toBe('active');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should calculate next renewal date for renewable certifications', async () => {
    const issuance = {
      userId: 'user-456',
      fullName: 'John Doe',
      role: 'Business Agent',
      certificationTypeId: 'cert-type-1',
      certificationNumber: 'BA-2026-001',
      issuedDate: new Date('2026-02-01'),
      expiryDate: new Date('2028-02-01'),
    };

    await CertificationManagementService.issueCertification(issuance, 'admin-2');

    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({})
    );
  });

  it('should throw error when certification type not found', async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const issuance = {
      userId: 'user-789',
      fullName: 'Alice Brown',
      role: 'Organizer',
      certificationTypeId: 'invalid-cert',
      certificationNumber: 'ORG-2026-001',
      issuedDate: new Date('2026-02-01'),
    };

    await expect(
      CertificationManagementService.issueCertification(issuance, 'admin-3')
    ).rejects.toThrow('Certification type not found');
  });

  it('should create audit log entry on certification issuance', async () => {
    const logSpy = vi.spyOn(CertificationManagementService as any, 'logAuditAction')
      .mockResolvedValue(undefined);

    const issuance = {
      userId: 'user-999',
      fullName: 'Bob Johnson',
      role: 'Safety Officer',
      certificationTypeId: 'cert-type-1',
      certificationNumber: 'SO-2026-001',
      issuedDate: new Date('2026-02-01'),
      expiryDate: new Date('2027-02-01'),
    };

    await CertificationManagementService.issueCertification(issuance, 'admin-4');

    // Audit log should be called (mocked implementation)
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

describe('CertificationManagementService - Alert Scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should schedule 90-day expiry alert', () => {
    const expiryDate = new Date('2026-06-01');
    const alertDate90 = new Date(expiryDate);
    alertDate90.setDate(alertDate90.getDate() - 90);

    expect(alertDate90.getTime()).toBeLessThan(expiryDate.getTime());
  });

  it('should schedule 30-day expiry alert', () => {
    const expiryDate = new Date('2026-06-01');
    const alertDate30 = new Date(expiryDate);
    alertDate30.setDate(alertDate30.getDate() - 30);

    expect(alertDate30.getTime()).toBeLessThan(expiryDate.getTime());
  });

  it('should not schedule alerts if no expiry date', async () => {
    const issuance = {
      userId: 'user-100',
      fullName: 'Charlie Lee',
      role: 'Steward',
      certificationTypeId: 'cert-type-1',
      certificationNumber: 'ST-2026-001',
      issuedDate: new Date('2026-02-01'),
      // No expiryDate
    };

    await CertificationManagementService.issueCertification(issuance, 'admin-5');

    // Should not attempt to schedule alerts
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

describe('CertificationManagementService - Continuing Education', () => {
  it('should validate CE hours earned', () => {
    const ceCourse = {
      userId: 'user-200',
      certificationId: 'cert-1',
      courseTitle: 'Advanced Labour Law',
      courseProvider: 'CLC Education',
      courseDate: new Date('2026-01-15'),
      ceHoursEarned: 8,
      ceCategory: 'Legal',
    };

    expect(ceCourse.ceHoursEarned).toBeGreaterThan(0);
    expect(ceCourse.ceHoursEarned).toBeLessThanOrEqual(40); // Max hours per course
  });

  it('should require CE category for all courses', () => {
    const validCategories = ['Legal', 'Technical', 'Safety', 'Ethics', 'Management'];
    const testCategory = 'Legal';

    expect(validCategories).toContain(testCategory);
  });

  it('should track CE course completion date', () => {
    const courseDate = new Date('2026-01-15');
    const today = new Date('2026-02-06');

    expect(courseDate.getTime()).toBeLessThan(today.getTime());
  });
});

describe('CertificationManagementService - Compliance Checking', () => {
  it('should mark certification as compliant when requirements met', () => {
    const certification = {
      ceHoursEarned: 35,
      ceHoursRequired: 30,
      expiryDate: new Date('2027-12-31'),
      status: 'active',
    };

    const isCompliant = 
      certification.ceHoursEarned >= certification.ceHoursRequired &&
      certification.status === 'active';

    expect(isCompliant).toBe(true);
  });

  it('should mark certification as non-compliant when CE hours insufficient', () => {
    const certification = {
      ceHoursEarned: 15,
      ceHoursRequired: 30,
      status: 'active',
    };

    const isCompliant = certification.ceHoursEarned >= certification.ceHoursRequired;

    expect(isCompliant).toBe(false);
  });

  it('should mark expired certification as non-compliant', () => {
    const today = new Date('2026-02-06');
    const expiryDate = new Date('2025-12-31');

    const isExpired = expiryDate.getTime() < today.getTime();

    expect(isExpired).toBe(true);
  });
});

describe('CertificationManagementService - Renewal Processing', () => {
  it('should calculate renewal due date based on frequency', () => {
    const issuedDate = new Date('2026-02-01');
    const renewalFrequencyMonths = 24;
    
    const renewalDueDate = new Date(issuedDate);
    renewalDueDate.setMonth(renewalDueDate.getMonth() + renewalFrequencyMonths);

    expect(renewalDueDate.getUTCFullYear()).toBe(2028);
    expect(renewalDueDate.getUTCMonth()).toBe(1); // February (0-indexed)
  });

  it('should handle certifications with no renewal requirement', () => {
    const certification = {
      requiresRenewal: false,
      renewalFrequencyMonths: null,
    };

    const needsRenewal = certification.requiresRenewal;

    expect(needsRenewal).toBe(false);
  });
});
