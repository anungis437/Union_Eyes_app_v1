/**
 * CBA Service Tests
 * 
 * Tests for Collective Bargaining Agreement management including:
 * - CBA CRUD operations
 * - Filtered listing with pagination
 * - Status management
 * - Expiry tracking
 * - Statistics and analytics
 * - Search functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCBAById,
  getCBAByNumber,
  listCBAs,
  createCBA,
  updateCBA,
  deleteCBA,
  hardDeleteCBA,
  updateCBAStatus,
  getCBAsExpiringSoon,
  getCBAStatistics,
  searchCBAs,
  type NewCBA,
  type CBA,
} from '@/lib/services/cba-service';

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      collectiveAgreements: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ rowCount: 0 })),
    })),
  },
}));

vi.mock('@/db/schema', () => ({
  collectiveAgreements: {
    id: 'id',
    cbaNumber: 'cbaNumber',
    organizationId: 'organizationId',
    title: 'title',
    status: 'status',
    viewCount: 'viewCount',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    _: { name: 'collective_agreements' },
  },
  cbaStatusEnum: {},
  jurisdictionEnum: {},
  cbaLanguageEnum: {},
}));

import { db } from '@/db/db';

describe('CBA Service - Retrieval Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCBAById()', () => {
    it('should get CBA by ID', async () => {
      const mockCBA: CBA = {
        id: 'cba-123',
        cbaNumber: 'CBA-2024-001',
        organizationId: 'org-1',
        title: 'Healthcare Workers Agreement 2024',
        employerName: 'City Hospital',
        unionName: 'Healthcare Workers Union',
        status: 'active',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2026-12-31'),
        jurisdiction: 'ON',
        sector: 'Healthcare',
        isPublic: true,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as CBA;

      (db.query.collectiveAgreements.findFirst as any).mockResolvedValue(mockCBA);

      const result = await getCBAById('cba-123');

      expect(result).toEqual(mockCBA);
      expect(db.query.collectiveAgreements.findFirst).toHaveBeenCalled();
    });

    it('should return null if CBA not found', async () => {
      (db.query.collectiveAgreements.findFirst as any).mockResolvedValue(null);

      const result = await getCBAById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (db.query.collectiveAgreements.findFirst as any).mockRejectedValue(
        new Error('DB error')
      );

      await expect(getCBAById('cba-123')).rejects.toThrow('Failed to fetch CBA');
    });
  });

  describe('getCBAByNumber()', () => {
    it('should get CBA by number', async () => {
      const mockCBA: CBA = {
        id: 'cba-123',
        cbaNumber: 'CBA-2024-001',
        title: 'Healthcare Workers Agreement',
      } as CBA;

      (db.query.collectiveAgreements.findFirst as any).mockResolvedValue(mockCBA);

      const result = await getCBAByNumber('CBA-2024-001');

      expect(result).toEqual(mockCBA);
      expect(result?.cbaNumber).toBe('CBA-2024-001');
    });

    it('should return null if CBA not found', async () => {
      (db.query.collectiveAgreements.findFirst as any).mockResolvedValue(null);

      const result = await getCBAByNumber('INVALID');

      expect(result).toBeNull();
    });
  });
});

describe('CBA Service - CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCBA()', () => {
    it('should create a new CBA', async () => {
      const newCBA: NewCBA = {
        cbaNumber: 'CBA-2024-001',
        organizationId: 'org-1',
        title: 'Healthcare Workers Agreement 2024',
        employerName: 'City Hospital',
        unionName: 'Healthcare Workers Union',
        status: 'draft',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2026-12-31'),
        jurisdiction: 'ON',
        sector: 'Healthcare',
        isPublic: true,
      };

      const createdCBA: CBA = {
        ...newCBA,
        id: 'cba-123',
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as CBA;

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdCBA]),
        }),
      });
      (db.insert as any) = mockInsert;

      const result = await createCBA(newCBA);

      expect(result).toEqual(createdCBA);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('updateCBA()', () => {
    it('should update CBA successfully', async () => {
      const updates = {
        title: 'Updated Agreement Title',
        status: 'active',
      };

      const updatedCBA: CBA = {
        id: 'cba-123',
        title: 'Updated Agreement Title',
        status: 'active',
        updatedAt: new Date(),
      } as CBA;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedCBA]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateCBA('cba-123', updates);

      expect(result).toEqual(updatedCBA);
    });

    it('should return null if CBA not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateCBA('nonexistent', { title: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteCBA()', () => {
    it('should soft delete CBA', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'cba-123' }]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await deleteCBA('cba-123');

      expect(result).toBe(true);
    });

    it('should return false if CBA not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await deleteCBA('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('hardDeleteCBA()', () => {
    it('should permanently delete CBA', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      (db.delete as any) = mockDelete;

      const result = await hardDeleteCBA('cba-123');

      expect(result).toBe(true);
    });

    it('should handle deletion errors', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB error')),
      });
      (db.delete as any) = mockDelete;

      await expect(hardDeleteCBA('cba-123')).rejects.toThrow(
        'Failed to hard delete CBA'
      );
    });
  });
});

describe('CBA Service - Status Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateCBAStatus()', () => {
    it('should update CBA status', async () => {
      const updatedCBA: CBA = {
        id: 'cba-123',
        status: 'active',
        updatedAt: new Date(),
      } as CBA;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedCBA]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateCBAStatus('cba-123', 'active');

      expect(result).toEqual(updatedCBA);
      expect(result?.status).toBe('active');
    });

    it('should return null if CBA not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.update as any) = mockUpdate;

      const result = await updateCBAStatus('nonexistent', 'active');

      expect(result).toBeNull();
    });
  });
});

describe('CBA Service - Analytics and Reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCBAsExpiringSoon()', () => {
    it('should get CBAs expiring within timeframe', async () => {
      const expiringCBAs: CBA[] = [
        {
          id: 'cba-1',
          title: 'Agreement 1',
          expiryDate: new Date('2024-03-15'),
          status: 'active',
        } as CBA,
        {
          id: 'cba-2',
          title: 'Agreement 2',
          expiryDate: new Date('2024-04-01'),
          status: 'active',
        } as CBA,
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(expiringCBAs),
          }),
        }),
      });
      (db.select as any) = mockSelect;

      const result = await getCBAsExpiringSoon('org-1', 90);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCBAStatistics()', () => {
    it('should calculate CBA statistics', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { status: 'active', count: 2, totalEmployees: 100 },
                { status: 'expired', count: 1, totalEmployees: 50 },
              ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          }),
        });
      (db.select as any) = mockSelect;

      const result = await getCBAStatistics('org-1');

      expect(result.total).toBe(3);
      expect(result.byStatus).toEqual([
        { status: 'active', count: 2, totalEmployees: 100 },
        { status: 'expired', count: 1, totalEmployees: 50 },
      ]);
    });

    it('should handle empty results', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });
      (db.select as any) = mockSelect;

      const result = await getCBAStatistics('org-1');

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual([]);
    });
  });
});

describe('CBA Service - List and Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCBAs()', () => {
    it('should list CBAs with pagination', async () => {
      const mockCBAs: CBA[] = [
        { id: 'cba-1', title: 'Agreement 1' } as CBA,
        { id: 'cba-2', title: 'Agreement 2' } as CBA,
      ];

      // Mock for count
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockCBAs),
                }),
              }),
            }),
          }),
        });

      (db.select as any) = mockSelect;

      const result = await listCBAs({ organizationId: 'org-1' }, { page: 1, limit: 10 });

      expect(result.cbas).toEqual(mockCBAs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        });

      (db.select as any) = mockSelect;

      await listCBAs({ status: ['active', 'draft'] });

      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchCBAs()', () => {
    it('should search CBAs by query', async () => {
      const mockCBAs: CBA[] = [
        {
          id: 'cba-1',
          title: 'Healthcare Agreement',
          employerName: 'City Hospital',
        } as CBA,
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockCBAs),
            }),
          }),
        }),
      });

      (db.select as any) = mockSelect;

      const result = await searchCBAs('healthcare', 'org-1');

      expect(result).toEqual(mockCBAs);
    });
  });
});
