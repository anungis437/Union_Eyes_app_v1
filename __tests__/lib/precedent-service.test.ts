/**
 * Precedent Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPrecedentById,
  getPrecedentByCaseNumber,
  listPrecedents,
  createPrecedent,
  updatePrecedent,
  deletePrecedent,
  searchPrecedents,
  getPrecedentsByIssueType,
  getRelatedPrecedents,
  getArbitratorProfile,
  updateArbitratorStats,
  getTopArbitrators,
  getPrecedentStatistics,
  getMostCitedPrecedents,
  type NewArbitrationDecision,
  type ArbitrationDecision,
  type ArbitratorProfile,
} from '@/lib/services/precedent-service';

vi.mock('@/db/db', () => ({
  db: {
    query: {
      arbitrationDecisions: {
        findFirst: vi.fn(),
      },
      arbitratorProfiles: {
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
  arbitrationDecisions: {
    id: 'id',
    caseNumber: 'caseNumber',
    caseTitle: 'caseTitle',
    tribunal: 'tribunal',
    decisionType: 'decisionType',
    decisionDate: 'decisionDate',
    arbitrator: 'arbitrator',
    union: 'union',
    employer: 'employer',
    outcome: 'outcome',
    precedentValue: 'precedentValue',
    summary: 'summary',
    headnote: 'headnote',
    issueTypes: 'issueTypes',
    jurisdiction: 'jurisdiction',
    sector: 'sector',
    citationCount: 'citationCount',
    viewCount: 'viewCount',
    createdAt: 'createdAt',
    fullText: 'fullText',
    remedy: 'remedy',
  },
  arbitratorProfiles: {
    name: 'name',
    isActive: 'isActive',
    totalDecisions: 'totalDecisions',
    updated: 'updated',
  },
  tribunalTypeEnum: {},
  decisionTypeEnum: {},
  outcomeEnum: {},
  precedentValueEnum: {},
}));

import { db } from '@/db/db';

describe('Precedent Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get precedent by ID without full text by default', async () => {
    const decision: ArbitrationDecision = {
      id: 'dec-1',
      caseNumber: 'A-1',
      fullText: 'Full text here',
    } as ArbitrationDecision;

    (db.query.arbitrationDecisions.findFirst as any).mockResolvedValue(decision);

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.update as any) = mockUpdate;

    const result = await getPrecedentById('dec-1');
    expect(result?.id).toBe('dec-1');
    expect((result as any).fullText).toBeUndefined();
  });

  it('should get precedent by case number', async () => {
    const decision: ArbitrationDecision = { id: 'dec-1', caseNumber: 'A-1' } as ArbitrationDecision;
    (db.query.arbitrationDecisions.findFirst as any).mockResolvedValue(decision);

    const result = await getPrecedentByCaseNumber('A-1');
    expect(result).toEqual(decision);
  });

  it('should list precedents with pagination', async () => {
    const precedents: ArbitrationDecision[] = [{ id: 'dec-1' } as ArbitrationDecision];

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
                offset: vi.fn().mockResolvedValue(precedents),
              }),
            }),
          }),
        }),
      });
    (db.select as any) = mockSelect;

    const result = await listPrecedents({ tribunal: ['labor'] }, { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.precedents).toEqual(precedents);
  });

  it('should create precedent', async () => {
    const data: NewArbitrationDecision = {
      caseNumber: 'A-1',
      caseTitle: 'Union v Employer',
    } as NewArbitrationDecision;

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'dec-1', ...data }]),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await createPrecedent(data);
    expect(result.id).toBe('dec-1');
  });

  it('should update precedent', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'dec-1', caseTitle: 'Updated' }]),
        }),
      }),
    });
    (db.update as any) = mockUpdate;

    const result = await updatePrecedent('dec-1', { caseTitle: 'Updated' } as any);
    expect(result?.caseTitle).toBe('Updated');
  });

  it('should delete precedent', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });
    (db.delete as any) = mockDelete;

    const result = await deletePrecedent('dec-1');
    expect(result).toBe(true);
  });

  it('should search precedents', async () => {
    const precedents: ArbitrationDecision[] = [{ id: 'dec-1' } as ArbitrationDecision];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(precedents),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await searchPrecedents('union', { tribunal: ['labor'] }, 5);
    expect(result).toEqual(precedents);
  });

  it('should get precedents by issue type', async () => {
    const precedents: ArbitrationDecision[] = [{ id: 'dec-1' } as ArbitrationDecision];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(precedents),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getPrecedentsByIssueType('overtime');
    expect(result).toEqual(precedents);
  });

  it('should get related precedents', async () => {
    const decision: ArbitrationDecision = {
      id: 'dec-1',
      issueTypes: ['overtime'],
      sector: 'public',
    } as ArbitrationDecision;

    (db.query.arbitrationDecisions.findFirst as any).mockResolvedValue(decision);

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.update as any) = mockUpdate;

    const related: ArbitrationDecision[] = [{ id: 'dec-2' } as ArbitrationDecision];
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(related),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getRelatedPrecedents('dec-1');
    expect(result).toEqual(related);
  });

  it('should get arbitrator profile', async () => {
    const profile: ArbitratorProfile = { name: 'Jane Doe' } as ArbitratorProfile;
    (db.query.arbitratorProfiles.findFirst as any).mockResolvedValue(profile);

    const result = await getArbitratorProfile('Jane Doe');
    expect(result).toEqual(profile);
  });

  it('should update arbitrator stats with existing profile', async () => {
    const decisions = [
      { outcome: 'grievance_upheld', decisionDate: new Date('2024-01-01'), issueTypes: ['overtime'] },
      { outcome: 'grievance_denied', decisionDate: new Date('2024-02-01'), issueTypes: ['discipline'] },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(decisions),
      }),
    });
    (db.select as any) = mockSelect;

    (db.query.arbitratorProfiles.findFirst as any).mockResolvedValue({ name: 'Jane Doe' });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.update as any) = mockUpdate;

    await updateArbitratorStats('Jane Doe');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should insert arbitrator profile when missing', async () => {
    const decisions = [
      { outcome: 'grievance_upheld', decisionDate: new Date('2024-01-01'), issueTypes: ['overtime'] },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(decisions),
      }),
    });
    (db.select as any) = mockSelect;

    (db.query.arbitratorProfiles.findFirst as any).mockResolvedValue(null);

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db.insert as any) = mockInsert;

    await updateArbitratorStats('Jane Doe');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('should get top arbitrators', async () => {
    const profiles: ArbitratorProfile[] = [{ name: 'Jane Doe' } as ArbitratorProfile];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(profiles),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getTopArbitrators(5);
    expect(result).toEqual(profiles);
  });

  it('should get precedent statistics', async () => {
    const mockSelect = vi.fn();
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([{ outcome: 'grievance_upheld', count: 2 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([{ tribunal: 'labor', count: 2 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ total: 2 }]),
      });
    (db.select as any) = mockSelect;

    const result = await getPrecedentStatistics();
    expect(result.total).toBe(2);
    expect(result.byOutcome).toHaveLength(1);
    expect(result.byTribunal).toHaveLength(1);
  });

  it('should get most cited precedents', async () => {
    const precedents: ArbitrationDecision[] = [{ id: 'dec-1' } as ArbitrationDecision];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(precedents),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getMostCitedPrecedents(3);
    expect(result).toEqual(precedents);
  });
});
