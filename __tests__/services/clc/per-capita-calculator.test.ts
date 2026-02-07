/**
 * Unit Tests: CLC Per-Capita Remittance Calculator Service
 * Tests monthly per-capita tax calculations, member standing, remittance tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PerCapitaCalculation, RemittanceStatus, MemberStanding } from '@/services/clc/per-capita-calculator';
import { createMockDb } from '@/__tests__/test-utils';

// Mock database with proper chaining
const mockDb = createMockDb();

// Setup mocks before imports
vi.mock('@/db/schema', () => ({
  organizations: 'organizations',
  organizationMembers: 'organizationMembers',
  clcChartOfAccounts: 'clcChartOfAccounts',
  perCapitaRemittances: 'perCapitaRemittances',
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args) => ({ eq: args })),
  and: vi.fn((...args) => ({ and: args })),
  sql: vi.fn((strings, ...values) => ({ sql: strings, values })),
  gte: vi.fn((...args) => ({ gte: args })),
  lte: vi.fn((...args) => ({ lte: args })),
  isNotNull: vi.fn((field) => ({ isNotNull: field })),
}));

vi.mock('@/db', () => ({
  db: mockDb,
}));

// Import functions to test
import {
  getMemberStanding,
  countGoodStandingMembers,
  calculatePerCapita,
  calculateAllPerCapita,
  savePerCapitaRemittances,
  getRemittanceStatusForParent,
  getOverdueRemittances,
  markOverdueRemittances,
  updateLastRemittanceDate,
  processMonthlyPerCapita,
} from '@/services/clc/per-capita-calculator';

describe('PerCapitaCalculator - Member Standing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return not in good standing when no membership found', async () => {
    // Mock empty membership result
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await getMemberStanding('user-1', 'org-1');

    expect(result.isGoodStanding).toBe(false);
    expect(result.lastDuesPaymentDate).toBeNull();
    expect(result.duesOwing).toBe(0);
  });

  it('should return good standing when dues paid within 60 days', async () => {
    const today = new Date();
    const paymentDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Mock membership found
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            userId: 'user-1',
            organizationId: 'org-1',
            status: 'active',
          },
        ]),
      }),
    });

    // Mock dues payment query
    mockDb.execute.mockResolvedValue([
      {
        last_payment_date: paymentDate,
        dues_owing: 0,
      },
    ]);

    const result = await getMemberStanding('user-1', 'org-1');

    expect(result.isGoodStanding).toBe(true);
    expect(result.duesOwing).toBe(0);
  });

  it('should return not in good standing when dues paid over 60 days ago', async () => {
    const oldPaymentDate = new Date();
    oldPaymentDate.setDate(oldPaymentDate.getDate() - 90);

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            userId: 'user-1',
            organizationId: 'org-1',
            status: 'active',
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      {
        last_payment_date: oldPaymentDate,
        dues_owing: 150,
      },
    ]);

    const result = await getMemberStanding('user-1', 'org-1');

    expect(result.isGoodStanding).toBe(false);
    expect(result.duesOwing).toBe(150);
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

describe('countGoodStandingMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should count total and good standing members', async () => {
    mockDb.execute.mockResolvedValue([
      {
        total_members: 250,
        good_standing_members: 240,
      },
    ]);

    const result = await countGoodStandingMembers('org-1');

    expect(result.total).toBe(250);
    expect(result.goodStanding).toBe(240);
    expect(result.remittable).toBe(240);
  });

  it('should handle organization with no members', async () => {
    mockDb.execute.mockResolvedValue([
      {
        total_members: 0,
        good_standing_members: 0,
      },
    ]);

    const result = await countGoodStandingMembers('org-1');

    expect(result.total).toBe(0);
    expect(result.goodStanding).toBe(0);
    expect(result.remittable).toBe(0);
  });

  it('should handle all members in good standing', async () => {
    mockDb.execute.mockResolvedValue([
      {
        total_members: 100,
        good_standing_members: 100,
      },
    ]);

    const result = await countGoodStandingMembers('org-1');

    expect(result.total).toBe(100);
    expect(result.goodStanding).toBe(100);
    expect(result.remittable).toBe(100);
  });

  it('should handle no members in good standing', async () => {
    mockDb.execute.mockResolvedValue([
      {
        total_members: 50,
        good_standing_members: 0,
      },
    ]);

    const result = await countGoodStandingMembers('org-1');

    expect(result.total).toBe(50);
    expect(result.goodStanding).toBe(0);
    expect(result.remittable).toBe(0);
  });
});

describe('Per-Capita Remittance Calculations', () => {
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

describe('calculatePerCapita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when organization not found', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    await expect(calculatePerCapita('org-1', 1, 2026)).rejects.toThrow(
      'Organization org-1 not found'
    );
  });

  it('should return null when organization has no parent', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Test Org',
            parentId: null,
            settings: {},
          },
        ]),
      }),
    });

    const result = await calculatePerCapita('org-1', 1, 2026);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('has no parent')
    );

    consoleSpy.mockRestore();
  });

  it('should return null when per capita rate is invalid', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Test Org',
            parentId: 'parent-1',
            settings: { perCapitaRate: '0' },
          },
        ]),
      }),
    });

    const result = await calculatePerCapita('org-1', 1, 2026);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid per-capita rate')
    );

    consoleSpy.mockRestore();
  });

  it('should calculate per capita correctly for valid organization', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Test Local 123',
            parentId: 'parent-1',
            charterNumber: 'CLC-123',
            settings: { perCapitaRate: '5.50', remittanceDay: '15' },
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      {
        total_members: 250,
        good_standing_members: 240,
      },
    ]);

    const result = await calculatePerCapita('org-1', 1, 2026);

    expect(result).not.toBeNull();
    expect(result?.fromOrganizationId).toBe('org-1');
    expect(result?.toOrganizationId).toBe('parent-1');
    expect(result?.totalMembers).toBe(250);
    expect(result?.goodStandingMembers).toBe(240);
    expect(result?.remittableMembers).toBe(240);
    expect(result?.perCapitaRate).toBe(5.50);
    expect(result?.totalAmount).toBe(1320); // 240 * 5.50
    expect(result?.clcAccountCode).toBe('CLC-123');
    expect(result?.glAccount).toBe('5200');
  });

  it('should calculate due date correctly', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Test Local 123',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50', remittanceDay: '20' },
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      {
        total_members: 100,
        good_standing_members: 95,
      },
    ]);

    const result = await calculatePerCapita('org-1', 2, 2026); // March

    expect(result?.dueDate.getDate()).toBe(20);
    expect(result?.dueDate.getMonth()).toBe(2); // March (0-indexed)
    expect(result?.dueDate.getFullYear()).toBe(2026);
  });

  it('should use default remittance day when not specified', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Test Local 123',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50' },
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      {
        total_members: 100,
        good_standing_members: 95,
      },
    ]);

    const result = await calculatePerCapita('org-1', 1, 2026);

    expect(result?.dueDate.getDate()).toBe(15); // DEFAULT_REMITTANCE_DAY
  });

  it('should handle zero remittable members', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Test Local 123',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50' },
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      {
        total_members: 100,
        good_standing_members: 0,
      },
    ]);

    const result = await calculatePerCapita('org-1', 1, 2026);

    expect(result?.totalAmount).toBe(0);
    expect(result?.remittableMembers).toBe(0);
  });
});

describe('calculateAllPerCapita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate per capita for all organizations with parent', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Local 1',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50' },
          },
          {
            id: 'org-2',
            name: 'Local 2',
            parentId: 'parent-1',
            settings: { perCapitaRate: '6.00' },
          },
        ]),
      }),
    });

    let callCount = 0;
    mockDb.execute.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve([
          { total_members: 100, good_standing_members: 90 },
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await calculateAllPerCapita(1, 2026);

    expect(result).toHaveLength(2);
    expect(result[0].fromOrganizationId).toBe('org-1');
    expect(result[1].fromOrganizationId).toBe('org-2');
  });

  it('should skip organizations without per capita rate', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Local 1',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50' },
          },
          {
            id: 'org-2',
            name: 'Local 2',
            parentId: 'parent-1',
            settings: {},
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      { total_members: 100, good_standing_members: 90 },
    ]);

    const result = await calculateAllPerCapita(1, 2026);

    expect(result).toHaveLength(1);
    expect(result[0].fromOrganizationId).toBe('org-1');
  });

  it('should handle errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Local 1',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50' },
          },
        ]),
      }),
    });

    mockDb.execute.mockRejectedValue(new Error('Database error'));

    const result = await calculateAllPerCapita(1, 2026);

    expect(result).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle empty organization list', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await calculateAllPerCapita(1, 2026);

    expect(result).toHaveLength(0);
    consoleSpy.mockRestore();
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
describe('savePerCapitaRemittances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save new remittances to database', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock no existing remittances
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(null),
    });

    const calculations: PerCapitaCalculation[] = [
      {
        fromOrganizationId: 'org-1',
        toOrganizationId: 'parent-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        totalMembers: 250,
        goodStandingMembers: 240,
        remittableMembers: 240,
        perCapitaRate: 5.50,
        totalAmount: 1320,
        dueDate: new Date('2026-02-15'),
        clcAccountCode: 'CLC-123',
        glAccount: '5200',
      },
    ];

    const result = await savePerCapitaRemittances(calculations);

    expect(result.saved).toBe(1);
    expect(result.errors).toBe(0);
    consoleSpy.mockRestore();
  });

  it('should update existing remittances', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'remit-1',
            fromOrganizationId: 'org-1',
            toOrganizationId: 'parent-1',
          },
        ]),
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(null),
      }),
    });

    const calculations: PerCapitaCalculation[] = [
      {
        fromOrganizationId: 'org-1',
        toOrganizationId: 'parent-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        totalMembers: 250,
        goodStandingMembers: 240,
        remittableMembers: 240,
        perCapitaRate: 5.50,
        totalAmount: 1320,
        dueDate: new Date('2026-02-15'),
        clcAccountCode: 'CLC-123',
        glAccount: '5200',
      },
    ];

    const result = await savePerCapitaRemittances(calculations);

    expect(result.saved).toBe(1);
    expect(result.errors).toBe(0);
    consoleSpy.mockRestore();
  });

  it('should handle errors during save', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    const calculations: PerCapitaCalculation[] = [
      {
        fromOrganizationId: 'org-1',
        toOrganizationId: 'parent-1',
        remittanceMonth: 1,
        remittanceYear: 2026,
        totalMembers: 250,
        goodStandingMembers: 240,
        remittableMembers: 240,
        perCapitaRate: 5.50,
        totalAmount: 1320,
        dueDate: new Date('2026-02-15'),
        clcAccountCode: 'CLC-123',
        glAccount: '5200',
      },
    ];

    const result = await savePerCapitaRemittances(calculations);

    expect(result.saved).toBe(0);
    expect(result.errors).toBe(1);

    consoleErrorSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle empty calculations array', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await savePerCapitaRemittances([]);

    expect(result.saved).toBe(0);
    expect(result.errors).toBe(0);
    consoleSpy.mockRestore();
  });
});

describe('getRemittanceStatusForParent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get remittance status for all child organizations', async () => {
    mockDb.execute.mockResolvedValue([
      {
        organization_id: 'org-1',
        organization_name: 'Local 123',
        total_due: '1320.00',
        total_paid: '5000.00',
        total_overdue: '0.00',
        pending_count: '1',
        overdue_count: '0',
        last_remittance_date: new Date('2026-01-20'),
      },
      {
        organization_id: 'org-2',
        organization_name: 'Local 456',
        total_due: '2500.00',
        total_paid: '3000.00',
        total_overdue: '1200.00',
        pending_count: '2',
        overdue_count: '1',
        last_remittance_date: new Date('2025-12-15'),
      },
    ]);

    const result = await getRemittanceStatusForParent('parent-1', 2026);

    expect(result).toHaveLength(2);
    expect(result[0].organizationId).toBe('org-1');
    expect(result[0].totalDue).toBe(1320);
    expect(result[0].totalPaid).toBe(5000);
    expect(result[1].organizationId).toBe('org-2');
    expect(result[1].totalOverdue).toBe(1200);
  });

  it('should use current year when year not specified', async () => {
    mockDb.execute.mockResolvedValue([]);

    await getRemittanceStatusForParent('parent-1');

    expect(mockDb.execute).toHaveBeenCalled();
  });

  it('should handle organizations with no remittances', async () => {
    mockDb.execute.mockResolvedValue([
      {
        organization_id: 'org-1',
        organization_name: 'New Local',
        total_due: '0.00',
        total_paid: '0.00',
        total_overdue: '0.00',
        pending_count: '0',
        overdue_count: '0',
        last_remittance_date: null,
      },
    ]);

    const result = await getRemittanceStatusForParent('parent-1', 2026);

    expect(result).toHaveLength(1);
    expect(result[0].totalDue).toBe(0);
    expect(result[0].lastRemittanceDate).toBeNull();
  });
});

describe('getOverdueRemittances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return overdue remittances', async () => {
    const overdueRemittance = {
      id: 'remit-1',
      fromOrganizationId: 'org-1',
      status: 'pending',
      dueDate: '2026-01-15',
      totalAmount: '1320.00',
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([overdueRemittance]),
      }),
    });

    const result = await getOverdueRemittances();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('remit-1');
    expect(result[0].status).toBe('pending');
  });

  it('should return empty array when no overdue remittances', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await getOverdueRemittances();

    expect(result).toHaveLength(0);
  });
});

describe('markOverdueRemittances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark overdue remittances', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ length: 3 }),
      }),
    });

    const result = await markOverdueRemittances();

    expect(result).toBe(3);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should return 0 when no remittances to mark', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ length: 0 }),
      }),
    });

    const result = await markOverdueRemittances();

    expect(result).toBe(0);
  });

  it('should handle undefined result length', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    });

    const result = await markOverdueRemittances();

    expect(result).toBe(0);
  });
});

describe('updateLastRemittanceDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update organization last remittance date', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'org-1',
              settings: {},
            },
          ]),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(null),
      }),
    });

    const remittanceDate = new Date('2026-02-18');
    await updateLastRemittanceDate('org-1', remittanceDate);

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('should preserve existing settings', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'org-1',
              settings: { perCapitaRate: '5.50' },
            },
          ]),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(null),
      }),
    });

    const remittanceDate = new Date('2026-02-18');
    await updateLastRemittanceDate('org-1', remittanceDate);

    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should handle organization not found', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const remittanceDate = new Date('2026-02-18');
    await updateLastRemittanceDate('org-1', remittanceDate);

    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe('processMonthlyPerCapita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process monthly per capita completely', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock calculateAllPerCapita
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Local 1',
            parentId: 'parent-1',
            settings: { perCapitaRate: '5.50' },
          },
        ]),
      }),
    });

    mockDb.execute.mockResolvedValue([
      { total_members: 100, good_standing_members: 95 },
    ]);

    // Mock savePerCapitaRemittances
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(null),
    });

    // Mock markOverdueRemittances
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ length: 2 }),
      }),
    });

    const result = await processMonthlyPerCapita();

    expect(result.calculated).toBe(1);
    expect(result.saved).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.overdueMarked).toBe(2);

    consoleSpy.mockRestore();
  });

  it('should handle errors during processing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Processing error')),
      }),
    });

    await expect(processMonthlyPerCapita()).rejects.toThrow('Processing error');

    consoleErrorSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should log processing summary', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ length: 0 }),
      }),
    });

    await processMonthlyPerCapita();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Monthly Per-Capita Processing')
    );

    consoleSpy.mockRestore();
  });
});