/**
 * Document Service Tests
 * 
 * Tests for:
 * - Document CRUD operations
 * - Folder management with hierarchical structure
 * - Document listing with filtering, pagination, search
 * - Soft delete and permanent delete
 * - Bulk operations (move, tag update, delete)
 * - Folder tree building
 * - Document statistics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDocumentById,
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  permanentlyDeleteDocument,
  getFolderById,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderTree,
  bulkMoveDocuments,
  bulkUpdateTags,
  bulkDeleteDocuments,
  getDocumentStatistics,
} from '@/lib/services/document-service';
import { db } from '@/db/db';

// Mock database with chainable query builder
vi.mock('@/db/db', () => {
  // Create chainable mock
  const createChainableMock = () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      leftJoin: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      then: vi.fn((resolve) => resolve([])),
    };
    return chain;
  };

  return {
    db: {
      query: {
        documents: {
          findFirst: vi.fn(),
        },
        documentFolders: {
          findFirst: vi.fn(),
        },
      },
      select: vi.fn(() => createChainableMock()),
      insert: vi.fn(() => createChainableMock()),
      update: vi.fn(() => createChainableMock()),
      delete: vi.fn(() => createChainableMock()),
    },
  };
});

vi.mock('@/db/schema', () => ({
  documents: {
    id: 'id',
    tenantId: 'tenantId',
    name: 'name',
    _: { name: 'documents' },
  },
  documentFolders: {
    id: 'id',
    name: 'name',
    _: { name: 'documentFolders' },
  },
}));

describe('Document Service - Document Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentById()', () => {
    it('should get document by ID', async () => {
      const mockDocument = {
        id: 'doc-123',
        tenantId: 'tenant-1',
        name: 'Contract.pdf',
        fileUrl: 'https://storage.example.com/contract.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        folderId: 'folder-1',
        category: 'legal',
        isConfidential: true,
        deletedAt: null,
      };

      (db.query.documents.findFirst as any) = vi.fn().mockResolvedValue(mockDocument);

      const result = await getDocumentById('doc-123');

      expect(result).toEqual(mockDocument);
      expect(db.query.documents.findFirst).toHaveBeenCalled();
    });

    it('should return null if document is deleted', async () => {
      const mockDocument = {
        id: 'doc-123',
        deletedAt: new Date(),
      };

      (db.query.documents.findFirst as any) = vi.fn().mockResolvedValue(mockDocument);

      const result = await getDocumentById('doc-123');

      expect(result).toBeNull();
    });

    it('should include folder when requested', async () => {
      const mockDocument = {
        id: 'doc-123',
        folderId: 'folder-1',
        deletedAt: null,
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Contracts',
        tenantId: 'tenant-1',
      };

      (db.query.documents.findFirst as any) = vi.fn().mockResolvedValue(mockDocument);
      (db.query.documentFolders.findFirst as any) = vi.fn().mockResolvedValue(mockFolder);

      const result = await getDocumentById('doc-123', true);

      expect(result?.folder).toEqual(mockFolder);
    });

    it('should handle errors', async () => {
      (db.query.documents.findFirst as any) = vi.fn().mockRejectedValue(new Error('DB error'));

      await expect(getDocumentById('doc-123')).rejects.toThrow('Failed to fetch document');
    });
  });

  describe('listDocuments()', () => {
    it('should list documents with pagination', async () => {
      const mockDocuments = [
        { id: 'doc-1', name: 'File1.pdf' },
        { id: 'doc-2', name: 'File2.pdf' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockDocuments);

      (db.select as any) = vi.fn(() => ({
        from: mockFrom,
      }));

      mockFrom.mockImplementation((table: any) => {
        if (table._.name === 'documents') {
          return {
            where: mockWhere.mockReturnValue({
              orderBy: mockOrderBy.mockReturnValue({
                limit: mockLimit.mockReturnValue({
                  offset: mockOffset,
                }),
              }),
            }),
          };
        }
        // For count query
        return {
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        };
      });

      const result = await listDocuments({}, { page: 1, limit: 10 });

      expect(result.documents).toEqual(mockDocuments);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by tenant ID', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();

      (db.select as any) = vi.fn(() => ({
        from: mockFrom,
      }));

      mockFrom.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue([]),
        }),
      });

      await listDocuments({ tenantId: 'tenant-1' });

      expect(mockWhere).toHaveBeenCalled();
    });

    it('should filter by search query', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();

      (db.select as any) = vi.fn(() => ({
        from: mockFrom,
      }));

      mockFrom.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue([]),
        }),
      });

      await listDocuments({ searchQuery: 'contract' });

      expect(mockWhere).toHaveBeenCalled();
    });

    it('should sort by different columns', async () => {
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();

      (db.select as any) = vi.fn(() => ({
        from: mockFrom,
      }));

      mockFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await listDocuments({}, { sortBy: 'name', sortOrder: 'asc' });

      expect(mockOrderBy).toHaveBeenCalled();
    });
  });

  describe('createDocument()', () => {
    it('should create document', async () => {
      const newDocument = {
        tenantId: 'tenant-1',
        name: 'Contract.pdf',
        fileUrl: 'https://storage.example.com/contract.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        uploadedBy: 'user-1',
      };

      const createdDocument = {
        id: 'doc-123',
        ...newDocument,
      };

      (db.insert as any) = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdDocument]),
        }),
      });

      const result = await createDocument(newDocument);

      expect(result).toEqual(createdDocument);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      (db.insert as any) = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Insert failed')),
        }),
      });

      await expect(createDocument({ tenantId: 'tenant-1', name: 'Test' } as any)).rejects.toThrow(
        'Failed to create document'
      );
    });
  });

  describe('updateDocument()', () => {
    it('should update document', async () => {
      const updatedDocument = {
        id: 'doc-123',
        name: 'Updated Contract.pdf',
      };

      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedDocument]),
          }),
        }),
      });

      const result = await updateDocument('doc-123', { name: 'Updated Contract.pdf' });

      expect(result).toEqual(updatedDocument);
    });

    it('should return null if document not found', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await updateDocument('doc-123', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('deleteDocument()', () => {
    it('should soft delete document', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'doc-123' }]),
          }),
        }),
      });

      const result = await deleteDocument('doc-123');

      expect(result).toBe(true);
    });

    it('should return false if document not found', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await deleteDocument('doc-123');

      expect(result).toBe(false);
    });
  });

  describe('permanentlyDeleteDocument()', () => {
    it('should permanently delete document', async () => {
      (db.delete as any) = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await permanentlyDeleteDocument('doc-123');

      expect(result).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      (db.delete as any) = vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Delete failed')),
      });

      await expect(permanentlyDeleteDocument('doc-123')).rejects.toThrow(
        'Failed to permanently delete document'
      );
    });
  });
});

describe('Document Service - Folder Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFolderById()', () => {
    it('should get folder with document count', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Contracts',
        tenantId: 'tenant-1',
        deletedAt: null,
      };

      (db.query.documentFolders.findFirst as any) = vi.fn().mockResolvedValue(mockFolder);
      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }));

      const result = await getFolderById('folder-1');

      expect(result?.documentCount).toBe(5);
      expect(result?.id).toBe('folder-1');
    });

    it('should return null if folder deleted', async () => {
      const mockFolder = {
        id: 'folder-1',
        deletedAt: new Date(),
      };

      (db.query.documentFolders.findFirst as any) = vi.fn().mockResolvedValue(mockFolder);

      const result = await getFolderById('folder-1');

      expect(result).toBeNull();
    });
  });

  describe('listFolders()', () => {
    it('should list root folders', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Contracts', parentFolderId: null },
        { id: 'folder-2', name: 'Policies', parentFolderId: null },
      ];

      (db.select as any) = vi.fn()
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(mockFolders),
        }))
        .mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }));

      const result = await listFolders('tenant-1', null);

      expect(result).toHaveLength(2);
    });

    it('should list subfolders', async () => {
      const mockFolders = [{ id: 'folder-3', name: 'Subfolder', parentFolderId: 'folder-1' }];

      (db.select as any) = vi.fn()
        .mockImplementationOnce(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(mockFolders),
        }))
        .mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }));

      const result = await listFolders('tenant-1', 'folder-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('createFolder()', () => {
    it('should create folder', async () => {
      const newFolder = {
        tenantId: 'tenant-1',
        name: 'New Folder',
      };

      const createdFolder = {
        id: 'folder-123',
        ...newFolder,
      };

      (db.insert as any) = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdFolder]),
        }),
      });

      const result = await createFolder(newFolder);

      expect(result).toEqual(createdFolder);
    });
  });

  describe('updateFolder()', () => {
    it('should update folder', async () => {
      const updatedFolder = {
        id: 'folder-123',
        name: 'Updated Folder',
      };

      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedFolder]),
          }),
        }),
      });

      const result = await updateFolder('folder-123', { name: 'Updated Folder' });

      expect(result).toEqual(updatedFolder);
    });
  });

  describe('deleteFolder()', () => {
    it('should delete empty folder', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'folder-123' }]),
          }),
        }),
      });

      const result = await deleteFolder('folder-123', false);

      expect(result).toBe(true);
    });

    it('should delete folder with contents', async () => {
      const mockSubfolders = [{ id: 'folder-sub-1' }];

      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSubfolders),
      }));

      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'folder-123' }]),
          }),
        }),
      });

      const result = await deleteFolder('folder-123', true);

      expect(result).toBe(true);
    });
  });

  describe('getFolderTree()', () => {
    it('should build folder tree', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Root 1', parentFolderId: null },
        { id: 'folder-2', name: 'Child 1', parentFolderId: 'folder-1' },
        { id: 'folder-3', name: 'Root 2', parentFolderId: null },
      ];

      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFolders),
      }));

      const result = await getFolderTree('tenant-1');

      expect(result).toHaveLength(2); // Two root folders
      expect(result[0].children).toHaveLength(1); // First root has 1 child
    });

    it('should handle empty tree', async () => {
      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }));

      const result = await getFolderTree('tenant-1');

      expect(result).toHaveLength(0);
    });
  });
});

describe('Document Service - Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bulkMoveDocuments()', () => {
    it('should move multiple documents to folder', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bulkMoveDocuments(['doc-1', 'doc-2', 'doc-3'], 'folder-123');

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle bulk move errors', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Update failed')),
        }),
      });

      const result = await bulkMoveDocuments(['doc-1', 'doc-2'], 'folder-123');

      expect(result.success).toBe(false);
      expect(result.failed).toBe(2);
    });
  });

  describe('bulkUpdateTags()', () => {
    it('should replace tags', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bulkUpdateTags(['doc-1', 'doc-2'], ['legal', 'urgent'], 'replace');

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });

    it('should add tags', async () => {
      const mockDocs = [
        { id: 'doc-1', tags: ['existing'] },
        { id: 'doc-2', tags: [] },
      ];

      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      }));

      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      });

      const result = await bulkUpdateTags(['doc-1', 'doc-2'], ['new'], 'add');

      expect(result.success).toBe(true);
    });

    it('should remove tags', async () => {
      const mockDocs = [{ id: 'doc-1', tags: ['tag1', 'tag2', 'tag3'] }];

      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      }));

      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      });

      const result = await bulkUpdateTags(['doc-1'], ['tag2'], 'remove');

      expect(result.success).toBe(true);
    });
  });

  describe('bulkDeleteDocuments()', () => {
    it('should bulk delete documents', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bulkDeleteDocuments(['doc-1', 'doc-2', 'doc-3']);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
    });

    it('should handle bulk delete errors', async () => {
      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Delete failed')),
        }),
      });

      const result = await bulkDeleteDocuments(['doc-1']);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });
  });
});

describe('Document Service - Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentStatistics()', () => {
    it('should calculate document statistics', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          category: 'legal',
          fileType: 'application/pdf',
          fileSize: 1024000,
          isConfidential: true,
        },
        {
          id: 'doc-2',
          category: 'legal',
          fileType: 'application/pdf',
          fileSize: 512000,
          isConfidential: false,
        },
        {
          id: 'doc-3',
          category: 'hr',
          fileType: 'application/msword',
          fileSize: 256000,
          isConfidential: true,
        },
      ];

      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      }));

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(3);
      expect(result.byCategory['legal']).toBe(2);
      expect(result.byCategory['hr']).toBe(1);
      expect(result.byFileType['application/pdf']).toBe(2);
      expect(result.totalSize).toBe(1792000);
      expect(result.confidential).toBe(2);
    });

    it('should handle empty statistics', async () => {
      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }));

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.confidential).toBe(0);
    });

    it('should handle documents without categories', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          category: null,
          fileType: 'text/plain',
          fileSize: 1024,
          isConfidential: false,
        },
      ];

      (db.select as any) = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      }));

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(1);
      expect(Object.keys(result.byCategory)).toHaveLength(0);
    });
  });
});
