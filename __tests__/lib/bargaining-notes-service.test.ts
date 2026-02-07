/**
 * Bargaining Notes Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBargainingNoteById,
  listBargainingNotes,
  getBargainingNotesByCBA,
  createBargainingNote,
  bulkCreateBargainingNotes,
  updateBargainingNote,
  deleteBargainingNote,
  searchBargainingNotes,
  getBargainingTimeline,
  getNotesByTags,
  getNotesRelatedToClauses,
  getNotesRelatedToPrecedents,
  getSessionTypes,
  getBargainingNotesStatistics,
  addAttachmentToNote,
  getAllTags,
  type NewBargainingNote,
  type BargainingNote,
} from '@/lib/services/bargaining-notes-service';

vi.mock('@/db/db', () => ({
  db: {
    query: {
      bargainingNotes: {
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
    selectDistinct: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
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
  bargainingNotes: {
    id: 'id',
    cbaId: 'cbaId',
    organizationId: 'organizationId',
    sessionType: 'sessionType',
    confidentialityLevel: 'confidentialityLevel',
    sessionDate: 'sessionDate',
    createdAt: 'createdAt',
    tags: 'tags',
    title: 'title',
    content: 'content',
    createdBy: 'createdBy',
    sessionNumber: 'sessionNumber',
    relatedClauseIds: 'relatedClauseIds',
    relatedDecisionIds: 'relatedDecisionIds',
    attachments: 'attachments',
    _: { name: 'bargainingNotes' },
  },
}));

import { db } from '@/db/db';

describe('Bargaining Notes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get bargaining note by ID', async () => {
    const note: BargainingNote = { id: 'note-1', title: 'Session 1' } as BargainingNote;
    (db.query.bargainingNotes.findFirst as any).mockResolvedValue(note);

    const result = await getBargainingNoteById('note-1');
    expect(result).toEqual(note);
  });

  it('should list bargaining notes with pagination', async () => {
    const notes: BargainingNote[] = [{ id: 'note-1', title: 'Session 1' } as BargainingNote];

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
                offset: vi.fn().mockResolvedValue(notes),
              }),
            }),
          }),
        }),
      });
    (db.select as any) = mockSelect;

    const result = await listBargainingNotes({ organizationId: 'org-1' }, { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.notes).toEqual(notes);
  });

  it('should get bargaining notes by CBA', async () => {
    const notes: BargainingNote[] = [{ id: 'note-1', cbaId: 'cba-1' } as BargainingNote];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(notes),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getBargainingNotesByCBA('cba-1');
    expect(result).toEqual(notes);
  });

  it('should create bargaining note', async () => {
    const data: NewBargainingNote = {
      cbaId: 'cba-1',
      title: 'Session 1',
      content: 'Notes',
    } as NewBargainingNote;

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'note-1', ...data }]),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await createBargainingNote(data);
    expect(result.id).toBe('note-1');
  });

  it('should bulk create bargaining notes', async () => {
    const data: NewBargainingNote[] = [
      { cbaId: 'cba-1', title: 'Session 1', content: 'Notes' } as NewBargainingNote,
      { cbaId: 'cba-1', title: 'Session 2', content: 'More notes' } as NewBargainingNote,
    ];

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(data.map((note, i) => ({ id: `note-${i}`, ...note }))),
      }),
    });
    (db.insert as any) = mockInsert;

    const result = await bulkCreateBargainingNotes(data);
    expect(result).toHaveLength(2);
  });

  it('should update bargaining note', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'note-1', title: 'Updated' }]),
        }),
      }),
    });
    (db.update as any) = mockUpdate;

    const result = await updateBargainingNote('note-1', { title: 'Updated' } as any);
    expect(result?.title).toBe('Updated');
  });

  it('should delete bargaining note', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });
    (db.delete as any) = mockDelete;

    const result = await deleteBargainingNote('note-1');
    expect(result).toBe(true);
  });

  it('should search bargaining notes', async () => {
    const notes: BargainingNote[] = [{ id: 'note-1', title: 'Wages' } as BargainingNote];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(notes),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await searchBargainingNotes('wage', { cbaId: 'cba-1' }, 10);
    expect(result).toEqual(notes);
  });

  it('should get bargaining timeline', async () => {
    const timelineRows = [
      {
        id: 'note-1',
        sessionDate: new Date('2024-01-01'),
        sessionType: 'initial',
        sessionNumber: 1,
        title: 'Session 1',
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(timelineRows),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getBargainingTimeline('cba-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-1');
  });

  it('should get notes by tags', async () => {
    const notes: BargainingNote[] = [{ id: 'note-1', tags: ['strategy'] } as BargainingNote];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(notes),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getNotesByTags(['strategy'], 'org-1', 5);
    expect(result).toEqual(notes);
  });

  it('should get notes related to clauses', async () => {
    const notes: BargainingNote[] = [{ id: 'note-1' } as BargainingNote];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(notes),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getNotesRelatedToClauses(['clause-1']);
    expect(result).toEqual(notes);
  });

  it('should get notes related to precedents', async () => {
    const notes: BargainingNote[] = [{ id: 'note-1' } as BargainingNote];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(notes),
          }),
        }),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getNotesRelatedToPrecedents(['decision-1']);
    expect(result).toEqual(notes);
  });

  it('should get session types for organization', async () => {
    const mockSelectDistinct = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { sessionType: 'initial' },
          { sessionType: 'follow-up' },
        ]),
      }),
    });
    (db.selectDistinct as any) = mockSelectDistinct;

    const result = await getSessionTypes('org-1');
    expect(result).toEqual(['initial', 'follow-up']);
  });

  it('should get bargaining notes statistics', async () => {
    const mockSelect = vi.fn();
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { sessionType: 'initial', count: 2 },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 2 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { sessionDate: new Date('2024-01-01'), sessionType: 'initial', title: 'Session 1' },
              ]),
            }),
          }),
        }),
      });
    (db.select as any) = mockSelect;

    const result = await getBargainingNotesStatistics('org-1');
    expect(result.total).toBe(2);
    expect(result.bySessionType).toHaveLength(1);
    expect(result.recentActivity).toHaveLength(1);
  });

  it('should add attachment to note', async () => {
    const note: BargainingNote = { id: 'note-1', attachments: [] } as BargainingNote;
    (db.query.bargainingNotes.findFirst as any).mockResolvedValue(note);

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 'note-1', attachments: [{ filename: 'file.pdf' }] },
          ]),
        }),
      }),
    });
    (db.update as any) = mockUpdate;

    const result = await addAttachmentToNote('note-1', {
      filename: 'file.pdf',
      url: 'https://example.com/file.pdf',
      fileType: 'application/pdf',
    });

    expect(result?.attachments).toHaveLength(1);
  });

  it('should get all tags for organization', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { tags: ['strategy', 'wages'] },
          { tags: ['wages'] },
        ]),
      }),
    });
    (db.select as any) = mockSelect;

    const result = await getAllTags('org-1');
    expect(result).toEqual(['strategy', 'wages']);
  });
});
