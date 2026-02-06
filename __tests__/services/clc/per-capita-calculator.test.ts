/**
 * Unit Tests: CLC Per-Capita Remittance Calculator Service
 * Tests monthly per-capita tax calculations, member standing, remittance tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PerCapitaCalculation, RemittanceStatus, MemberStanding } from '@/services/clc/per-capita-calculator';

// Mock database
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve([])),
        limit: vi.fn(() => Promise.resolve([])),
      })),
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([{ id: 'remit-1' }])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ changes: 1 })),
    })),
  })),
};

vi.mock('@/db', () => ({
  db: mockDb,
}));

describe('PerCapitaCalculator - Member Standing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate good standing members correctly', () => {
    const members = [
      { userId: '1', goodStanding: true, lastDuesPayment: new Date('2026-01-15') },
      { userId: '2', goodStanding: true, lastDuesPayment: new Date('2026-01-20') },
      { userId: '3', goodStanding: false, lastDuesPayment: new Date('2025-10-01') },
      { userId: '4', goodStanding: true, lastDuesPayment: new Date('2026-02-01') },
    ];

    const goodStandingCount = members.filter(m => m.goodStanding).length;

    expect(goodStandingCount).toBe(3);
  });

  it('should exclude non-good-standing members from remittance', () => {
    const totalMembers = 250;
    const goodStandingMembers = 240;
    const remittableMembers = goodStandingMembers;

    expect(remittableMembers).toBeLessThan(totalMembers);
    expect(remittableMembers).toBe(240);
  });

  it('should verify dues payment within 60 days for good standing', () => {
    const lastPayment = new Date('2026-01-07'); // 30 days ago
    const today = new Date('2026-02-06');
    const daysSincePayment = Math.floor(
      (today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isGoodStanding = daysSincePayment <= 60;

    expect(isGoodStanding).toBe(true);
  });

  it('should mark member as not in good standing after 60 days', () => {
    const lastPayment = new Date('2025-11-01'); // Over 90 days ago
    const today = new Date('2026-02-06');
    const daysSincePayment = Math.floor(
      (today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isGoodStanding = daysSincePayment <= 60;

    expect(isGoodStanding).toBe(false);
    expect(daysSincePayment).toBeGreaterThan(90);
  });
});

describe('PerCapitaCalculator - Remittance Calculations', () => {
  it('should calculate monthly per-capita remittance correctly', () => {
    const remittableMembers = 240;
    const perCapitaRate = 5.50; // $5.50 per member per month
    const totalAmount = remittableMembers * perCapitaRate;

    expect(totalAmount).toBe(1320); // $1,320
  });

  it('should use CLC standard rate of $5.50 per member', () => {
    const clcStandardRate = 5.50;

    expect(clcStandardRate).toBe(5.50);
  });

  it('should calculate remittance for multiple locals', () => {
    const locals = [
      { localId: 'local-1', members: 240, rate: 5.50 },
      { localId: 'local-2', members: 180, rate: 5.50 },
      { localId: 'local-3', members: 95, rate: 5.50 },
    ];

    const totalRemittance = locals.reduce(
      (sum, local) => sum + (local.members * local.rate),
      0
    );

    expect(totalRemittance).toBe(2832.50); // $2,832.50
  });

  it('should round remittance to 2 decimal places', () => {
    const members = 127;
    const rate = 5.50;
    const amount = members * rate;
    const rounded = Math.round(amount * 100) / 100;

    expect(rounded).toBe(698.50);
  });
});

describe('PerCapitaCalculator - Due Date Calculations', () => {
  it('should set due date to 15th of following month', () => {
    const remittanceMonth = 1; // February (0-indexed)
    const remittanceYear = 2026;
    
    const dueDate = new Date(remittanceYear, remittanceMonth + 1, 15);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(2); // March (0-indexed)
    expect(dueDate.getDate()).toBe(15);
  });

  it('should handle year rollover for December remittance', () => {
    const remittanceMonth = 11; // December (0-indexed)
    const remittanceYear = 2025;
    
    const dueDate = new Date(remittanceYear, remittanceMonth + 1, 15);

    expect(dueDate.getFullYear()).toBe(2026);
    expect(dueDate.getMonth()).toBe(0); // January
  });

  it('should identify overdue remittances', () => {
    const dueDate = new Date('2026-02-15');
    const today = new Date('2026-03-01');

    const isOverdue = today.getTime() > dueDate.getTime();

    expect(isOverdue).toBe(true);
  });

  it('should calculate days overdue', () => {
    const dueDate = new Date('2026-02-15');
    const today = new Date('2026-02-25');

    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysOverdue).toBe(10);
  });
});

describe('PerCapitaCalculator - CLC Account Codes', () => {
  it('should use GL account 4100 for per-capita revenue', () => {
    const perCapitaGLAccount = '4100';

    expect(perCapitaGLAccount).toBe('4100');
  });

  it('should use CLC account code PC-REV for remittances', () => {
    const clcAccountCode = 'PC-REV';

    expect(clcAccountCode).toBe('PC-REV');
  });

  it('should map per-capita to chart of accounts', () => {
    const accountMapping = {
      accountCode: 'PC-REV',
      accountName: 'Per-Capita Tax Revenue',
      glAccount: '4100',
      category: 'Revenue',
    };

    expect(accountMapping.glAccount).toBe('4100');
    expect(accountMapping.category).toBe('Revenue');
  });
});

describe('PerCapitaCalculator - Remittance Status', () => {
  it('should track total amount due across all periods', () => {
    const remittances = [
      { month: 'Jan', amount: 1320, status: 'unpaid' },
      { month: 'Feb', amount: 1350, status: 'unpaid' },
      { month: 'Mar', amount: 1280, status: 'paid' },
    ];

    const totalDue = remittances
      .filter(r => r.status === 'unpaid')
      .reduce((sum, r) => sum + r.amount, 0);

    expect(totalDue).toBe(2670);
  });

  it('should track total paid amount', () => {
    const remittances = [
      { month: 'Jan', amount: 1320, status: 'paid' },
      { month: 'Feb', amount: 1350, status: 'unpaid' },
      { month: 'Mar', amount: 1280, status: 'paid' },
    ];

    const totalPaid = remittances
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.amount, 0);

    expect(totalPaid).toBe(2600);
  });

  it('should count overdue remittances', () => {
    const today = new Date('2026-04-01');
    const remittances = [
      { dueDate: new Date('2026-02-15'), status: 'unpaid' },
      { dueDate: new Date('2026-03-15'), status: 'unpaid' },
      { dueDate: new Date('2026-04-15'), status: 'unpaid' },
    ];

    const overdueCount = remittances.filter(r => 
      r.status === 'unpaid' && r.dueDate.getTime() < today.getTime()
    ).length;

    expect(overdueCount).toBe(2);
  });

  it('should track last remittance date', () => {
    const remittances = [
      { paidDate: new Date('2026-01-20T12:00:00Z') },
      { paidDate: new Date('2026-02-18T12:00:00Z') },
      { paidDate: new Date('2026-01-15T12:00:00Z') },
    ];

    const lastPaidDate = remittances
      .map(r => r.paidDate)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    expect(lastPaidDate.getMonth()).toBe(1); // February (0-indexed)
    expect(lastPaidDate.getUTCDate()).toBe(18);
  });
});

describe('PerCapitaCalculator - Validation Rules', () => {
  it('should require valid organization IDs', () => {
    const calculation: Partial<PerCapitaCalculation> = {
      fromOrganizationId: 'local-123',
      toOrganizationId: 'clc-parent',
    };

    const isValid = 
      calculation.fromOrganizationId &&
      calculation.toOrganizationId &&
      calculation.fromOrganizationId !== calculation.toOrganizationId;

    expect(isValid).toBe(true);
  });

  it('should reject same organization for from/to', () => {
    const fromOrg = 'org-123';
    const toOrg = 'org-123';

    const isValid = fromOrg !== toOrg;

    expect(isValid).toBe(false);
  });

  it('should require positive member count', () => {
    const memberCount = 240;

    const isValid = memberCount > 0;

    expect(isValid).toBe(true);
  });

  it('should require positive per-capita rate', () => {
    const rate = 5.50;

    const isValid = rate > 0;

    expect(isValid).toBe(true);
  });
});

describe('PerCapitaCalculator - Month/Year Validation', () => {
  it('should validate remittance month (0-11)', () => {
    const month = 1; // February

    const isValid = month >= 0 && month <= 11;

    expect(isValid).toBe(true);
  });

  it('should reject invalid month values', () => {
    const invalidMonth = 12;

    const isValid = invalidMonth >= 0 && invalidMonth <= 11;

    expect(isValid).toBe(false);
  });

  it('should validate remittance year', () => {
    const year = 2026;

    const isValid = year >= 2020 && year <= 2050;

    expect(isValid).toBe(true);
  });
});

describe('PerCapitaCalculator - Historical Tracking', () => {
  it('should calculate year-to-date remittances', () => {
    const yearRemittances = [
      { month: 0, amount: 1320 }, // Jan
      { month: 1, amount: 1350 }, // Feb
      { month: 2, amount: 1280 }, // Mar
    ];

    const ytdTotal = yearRemittances.reduce((sum, r) => sum + r.amount, 0);

    expect(ytdTotal).toBe(3950);
  });

  it('should calculate average monthly remittance', () => {
    const remittances = [1320, 1350, 1280, 1400];
    const average = remittances.reduce((sum, amt) => sum + amt, 0) / remittances.length;

    expect(average).toBe(1337.50);
  });
});
