import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as documentService from '@/lib/services/document-service';

const mockDb = vi.hoisted(() => ({
  query: {
    documents: {
      findFirst: vi.fn(),
    },
    documentFolders: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/db/db', () => ({
  db: mockDb,
}));

describe('document-service additional coverage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listFolders', () => {
    it('returns root folders when parentFolderId is null', async () => {
      const folders = [
        { id: 'folder-1', organizationId: 'org-1', name: 'Root A', parentFolderId: null },
        { id: 'folder-2', organizationId: 'org-1', name: 'Root B', parentFolderId: null },
      ];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(folders),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const result = await documentService.listFolders('org-1', null);

      expect(result).toHaveLength(2);
      expect(result[0].documentCount).toBe(2);
      expect(result[1].documentCount).toBe(0);
    });

    it('filters by parent folder when parentFolderId is provided', async () => {
      const folders = [
        { id: 'folder-3', organizationId: 'org-1', name: 'Child', parentFolderId: 'parent-1' },
      ];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(folders),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        });

      const result = await documentService.listFolders('org-1', 'parent-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('folder-3');
    });

    it('throws when listing folders fails', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('DB failure');
      });

      await expect(documentService.listFolders('org-1')).rejects.toThrow('Failed to list folders');
    });
  });

  describe('getFolderTree', () => {
    it('throws when folder tree query fails', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB failure')),
        }),
      });

      await expect(documentService.getFolderTree('org-1')).rejects.toThrow('Failed to get folder tree');
    });
  });

  describe('deleteFolder', () => {
    it('deletes folder without deleting contents', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'folder-1' }]),
      });

      const result = await documentService.deleteFolder('folder-1', false);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('deletes folder contents and subfolders when requested', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'folder-1' }]),
      });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'child-1' }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

      const result = await documentService.deleteFolder('folder-1', true);

      expect(result).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('returns false when folder delete returns no rows', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      });

      const result = await documentService.deleteFolder('folder-1', false);

      expect(result).toBe(false);
    });

    it('throws when delete folder fails', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('DB failure');
      });

      await expect(documentService.deleteFolder('folder-1')).rejects.toThrow('Failed to delete folder');
    });
  });

  describe('processDocumentOCR', () => {
    it('throws when updateDocument fails', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      await expect(documentService.processDocumentOCR('doc-1')).rejects.toThrow(
        'Failed to process document OCR'
      );
    });
  });

  describe('bulk operations error paths', () => {
    it('returns failure when bulk move fails', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Bulk move failed');
      });

      const result = await documentService.bulkMoveDocuments(['doc-1', 'doc-2'], 'folder-1');

      expect(result.success).toBe(false);
      expect(result.failed).toBe(2);
    });

    it('removes tags when operation is remove', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 'doc-1', tags: ['keep', 'remove'] },
          ]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'doc-1' }]),
      });

      const result = await documentService.bulkUpdateTags(['doc-1'], ['remove'], 'remove');

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns failure when bulk tag update fails', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Select failed');
      });

      const result = await documentService.bulkUpdateTags(['doc-1'], ['tag'], 'add');

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });

    it('returns failure when bulk delete fails', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Bulk delete failed');
      });

      const result = await documentService.bulkDeleteDocuments(['doc-1']);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });
  });

  describe('searchDocuments', () => {
    it('throws when search query fails', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Search failed');
      });

      await expect(documentService.searchDocuments('org-1', 'query')).rejects.toThrow(
        'Failed to search documents'
      );
    });
  });
});



