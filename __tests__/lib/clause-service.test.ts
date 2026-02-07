/**
 * Clause Service Tests - Legal clause management for CBAs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getClauseById,
  getClausesByCBAId,
  listClauses,
  createClause,
  updateClause,
  deleteClause,
  searchClauses,
  getClausesByType,
  getClauseHierarchy,
  compareClauses,
  saveClauseComparison,
  bulkCreateClauses,
  getWageProgressions,
  createWageProgression,
  getClauseTypeDistribution,
  getMostViewedClauses,
  type NewClause,
  type Clause,
  type NewWageProgression,
  type WageProgression,
} from '@/lib/services/clause-service';

vi.mock('@/db/db', () => ({
  db: {
    query: {
      cbaClause: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
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
  cbaClause: {
    id: 'id',
    cbaId: 'cbaId',
    clauseType: 'clauseType',
    articleNumber: 'articleNumber',
    confidenceScore: 'confidenceScore',
    contentPlainText: 'contentPlainText',
    clauseNumber: 'clauseNumber',
    viewCount: 'viewCount',
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    orderIndex: 'orderIndex',
    parentClauseId: 'parentClauseId',
    _: { name: 'cbaClause' },
  },
  wageProgressions: {
    cbaId: 'cbaId',
    classification: 'classification',
    step: 'step',
  },
  benefitComparisons: {},
  clauseComparisons: {
    clauseType: 'clauseType',
    clauseIds: 'clauseIds',
  },
}));

import { db } from '@/db/db';

describe('Clause Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get clause by ID', async () => {
    const mockClause: Clause = {
      id: 'clause-1',
      cbaId: 'cba-1',
      title: 'Wages',
      content: 'Wage rates...',
      clauseType: 'monetary',
    } as Clause;

    (db.query.cbaClause.findFirst as any).mockResolvedValue(mockClause);

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.update as any) = mockUpdate;

    const result = await getClauseById('clause-1');
    expect(result).toEqual(mockClause);
  });

  it('should get clauses by CBA ID', async () => {
    const mockClauses: Clause[] = [
      { id: 'clause-1', cbaId: 'cba-1', title: 'Wages' } as Clause,
      { id: 'clause-2', cbaId: 'cba-1', title: 'Benefits' } as Clause,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockClauses),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getClausesByCBAId('cba-1');
    expect(result).toEqual(mockClauses);
  });

  it('should create clause', async () => {
    const newClause: NewClause = {
      cbaId: 'cba-1',
      title: 'Wages',
      content: 'Wage rates...',
      clauseType: 'monetary',
    };

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'clause-1', ...newClause }]),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await createClause(newClause);
    expect(result.title).toBe('Wages');
  });

  it('should bulk create clauses', async () => {
    const clauses: NewClause[] = [
      { cbaId: 'cba-1', title: 'Clause 1', content: 'Content 1', clauseType: 'general' },
      { cbaId: 'cba-1', title: 'Clause 2', content: 'Content 2', clauseType: 'general' },
    ];

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(clauses.map((c, i) => ({ id: `clause-${i}`, ...c }))),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await bulkCreateClauses(clauses);
    expect(result).toHaveLength(2);
  });

  it('should update clause', async () => {
    const updates = { title: 'Updated Title' };
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'clause-1', ...updates }]),
        }),
      }),
    });
    (db.update as any) = mockUpdate;

    const result = await updateClause('clause-1', updates);
    expect(result?.title).toBe('Updated Title');
  });

  it('should delete clause', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });
    (db.delete as any) = mockDelete;

    const result = await deleteClause('clause-1');
    expect(result).toBe(true);
  });

  it('should list clauses with pagination', async () => {
    const mockClauses: Clause[] = [
      { id: 'clause-1', cbaId: 'cba-1', title: 'Wages' } as Clause,
    ];

    const mockSelect = vi.fn();
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockClauses),
              }),
            }),
          }),
        }),
      });

    (db.select as any) = mockSelect;

    const result = await listClauses({ cbaId: 'cba-1' }, { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.clauses).toEqual(mockClauses);
  });

  it('should search clauses with filters', async () => {
    const mockClauses: Clause[] = [
      { id: 'clause-1', cbaId: 'cba-1', title: 'Wages' } as Clause,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockClauses),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await searchClauses('wage', { cbaId: 'cba-1', clauseType: ['monetary'] }, 25);
    expect(result).toEqual(mockClauses);
  });

  it('should get clauses by type', async () => {
    const mockClauses: Clause[] = [
      { id: 'clause-1', cbaId: 'cba-1', clauseType: 'monetary' } as Clause,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockClauses),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getClausesByType('monetary', { limit: 5 });
    expect(result).toEqual(mockClauses);
  });

  it('should get clause hierarchy', async () => {
    const parent: Clause = { id: 'parent-1', cbaId: 'cba-1', title: 'Parent' } as Clause;
    const clause: Clause = { id: 'child-1', cbaId: 'cba-1', parentClauseId: 'parent-1' } as Clause;
    const children: Clause[] = [{ id: 'child-2', cbaId: 'cba-1', parentClauseId: 'child-1' } as Clause];

    (db.query.cbaClause.findFirst as any)
      .mockResolvedValueOnce(clause)
      .mockResolvedValueOnce(parent);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(children),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getClauseHierarchy('child-1');
    expect(result.parent).toEqual(parent);
    expect(result.clause).toEqual(clause);
    expect(result.children).toEqual(children);
  });

  it('should compare clauses', async () => {
    const mockClauses: Clause[] = [
      { id: 'clause-1', clauseType: 'monetary', cbaId: 'cba-1' } as Clause,
      { id: 'clause-2', clauseType: 'monetary', cbaId: 'cba-2' } as Clause,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockClauses),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await compareClauses({ clauseIds: ['clause-1', 'clause-2'], analysisType: 'all' });
    expect(result.clauses).toHaveLength(2);
    expect(result.similarities).toHaveLength(1);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should save clause comparison', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'comp-1', comparisonName: 'Test' }]),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await saveClauseComparison(
      'Test',
      'monetary',
      ['clause-1'],
      'org-1',
      'user-1',
      { summary: 'ok' }
    );
    expect(result.id).toBe('comp-1');
  });

  it('should get wage progressions', async () => {
    const progressions: WageProgression[] = [
      { id: 'wp-1', cbaId: 'cba-1', classification: 'A', step: 1 } as WageProgression,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(progressions),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getWageProgressions('cba-1', 'A');
    expect(result).toEqual(progressions);
  });

  it('should create wage progression', async () => {
    const data: NewWageProgression = {
      cbaId: 'cba-1',
      classification: 'A',
      step: 1,
      wageRate: '25.00',
    } as NewWageProgression;

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'wp-1', ...data }]),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await createWageProgression(data);
    expect(result.id).toBe('wp-1');
  });

  it('should get clause type distribution', async () => {
    const distribution = [{ clauseType: 'monetary', count: 2 }];
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(distribution),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getClauseTypeDistribution('cba-1');
    expect(result).toEqual(distribution);
  });

  it('should get most viewed clauses', async () => {
    const mockClauses: Clause[] = [
      { id: 'clause-1', cbaId: 'cba-1', viewCount: 10 } as Clause,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockClauses),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getMostViewedClauses(5);
    expect(result).toEqual(mockClauses);
  });
});
