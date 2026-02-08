import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  createDocumentVersion,
  getDocumentVersions,
  processDocumentOCR,
  bulkProcessOCR,
  searchDocuments,
  bulkMoveDocuments,
  bulkUpdateTags,
  bulkDeleteDocuments,
  getDocumentStatistics,
} from '@/lib/services/document-service';
import { db } from '@/db/db';

// Mock the database
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

describe('document-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Document Operations
  // ============================================================================

  describe('getDocumentById', () => {
    it('should return a document when found', async () => {
      const mockDocument = {
        id: 'doc-1',
        tenantId: 'tenant-1',
        name: 'Test Document',
        fileUrl: 'https://example.com/file.pdf',
        fileType: 'pdf',
        uploadedBy: 'user-1',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        folderId: null,
      };

      mockDb.query.documents.findFirst.mockResolvedValue(mockDocument);

      const result = await getDocumentById('doc-1');

      expect(result).toEqual(mockDocument);
      expect(mockDb.query.documents.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return null when document is deleted', async () => {
      const mockDocument = {
        id: 'doc-1',
        deletedAt: new Date(),
      };

      mockDb.query.documents.findFirst.mockResolvedValue(mockDocument as any);

      const result = await getDocumentById('doc-1');

      expect(result).toBeNull();
    });

    it('should return null when document not found', async () => {
      mockDb.query.documents.findFirst.mockResolvedValue(null);

      const result = await getDocumentById('doc-1');

      expect(result).toBeNull();
    });

    it('should include folder when requested', async () => {
      const mockDocument = {
        id: 'doc-1',
        folderId: 'folder-1',
        deletedAt: null,
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Test Folder',
      };

      mockDb.query.documents.findFirst.mockResolvedValue(mockDocument as any);
      mockDb.query.documentFolders.findFirst.mockResolvedValue(mockFolder as any);

      const result = await getDocumentById('doc-1', true);

      expect(result).toHaveProperty('folder');
    });

    it('should handle errors', async () => {
      mockDb.query.documents.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(getDocumentById('doc-1')).rejects.toThrow('Failed to fetch document');
    });
  });

  describe('create and update operations', () => {
    it('should create a document', async () => {
      const mockDoc = { id: 'doc-1', name: 'New Doc' };
      
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDoc]),
        }),
      });

      const result = await createDocument(mockDoc as any);

      expect(result).toEqual(mockDoc);
    });

    it('should update a document', async () => {
      const mockDoc = { id: 'doc-1', name: 'Updated' };
      
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDoc]),
          }),
        }),
      });

      const result = await updateDocument('doc-1', { name: 'Updated' });

      expect(result).toEqual(mockDoc);
    });

    it('should delete a document', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'doc-1' }]),
          }),
        }),
      });

      const result = await deleteDocument('doc-1');

      expect(result).toBe(true);
    });

    it('should permanently delete', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await permanentlyDeleteDocument('doc-1');

      expect(result).toBe(true);
    });
  });

  describe('listDocuments', () => {
    it('should list documents with pagination', async () => {
      const mockDocs = [{ id: 'doc-1' }, { id: 'doc-2' }];
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      }).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockDocs),
              }),
            }),
          }),
        }),
      });

      const result = await listDocuments({}, { page: 1, limit: 10 });

      expect(result).toHaveProperty('documents');
      expect(result).toHaveProperty('total');
    });
  });

  // ============================================================================
  // Folder Operations
  // ============================================================================

  describe('folder operations', () => {
    it('should get folder by id with count', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Test Folder',
        deletedAt: null,
      };

      mockDb.query.documentFolders.findFirst.mockResolvedValue(mockFolder as any);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await getFolderById('folder-1');

      expect(result).toHaveProperty('documentCount', 5);
    });

    it('should create a folder', async () => {
      const mockFolder = { id: 'folder-1', name: 'New Folder' };
      
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockFolder]),
        }),
      });

      const result = await createFolder(mockFolder as any);

      expect(result).toEqual(mockFolder);
    });

    it('should update a folder', async () => {
      const mockFolder = { id: 'folder-1', name: 'Updated' };
      
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockFolder]),
          }),
        }),
      });

      const result = await updateFolder('folder-1', { name: 'Updated' });

      expect(result).toEqual(mockFolder);
    });
  });

  describe('getFolderTree', () => {
    it('should build folder tree structure', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Root 1', parentFolderId: null, tenantId: 'tenant-1' },
        { id: 'folder-2', name: 'Child 1', parentFolderId: 'folder-1', tenantId: 'tenant-1' },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockFolders),
        }),
      });

      const result = await getFolderTree('tenant-1');

      expect(result).toHaveLength(1); // One root folder
      expect(result[0]).toHaveProperty('children');
    });
  });

  // ============================================================================
  // Version Control
  // ============================================================================

  describe('document versions', () => {
    it('should create a document version', async () => {
      const result = await createDocumentVersion(
        'doc-1',
        'https://example.com/v2.pdf',
        'user-1',
        'Updated content'
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('documentId', 'doc-1');
      expect(result).toHaveProperty('uploadedBy', 'user-1');
    });

    it('should get document versions', async () => {
      const result = await getDocumentVersions('doc-1');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // OCR Processing
  // ============================================================================

  describe('OCR processing', () => {
    it('should process document with OCR', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      });

      const result = await processDocumentOCR('doc-1');

      expect(result).toHaveProperty('documentId', 'doc-1');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('language', 'en');
    });

    it('should bulk process OCR successfully', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      });

      const result = await bulkProcessOCR(['doc-1', 'doc-2']);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });

    it('should handle OCR errors', async () => {
       mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('OCR Error')),
          }),
        }),
      });

      const result = await bulkProcessOCR(['doc-1']);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });
  });

  // ============================================================================
  // Search Operations
  // ============================================================================

  describe('searchDocuments', () => {
    it('should search documents', async () => {
      const mockDocs = [{ id: 'doc-1' }];
      
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      }).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockDocs),
            }),
          }),
        }),
      });

      const result = await searchDocuments('tenant-1', 'test');

      expect(result).toHaveProperty('documents');
      expect(result).toHaveProperty('total');
    });
  });

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  describe('bulk operations', () => {
    it('should bulk move documents', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bulkMoveDocuments(['doc-1', 'doc-2'], 'folder-1');

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });

    it('should bulk update tags (replace)', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bulkUpdateTags(['doc-1'], ['tag1'], 'replace');

      expect(result.success).toBe(true);
    });

    it('should bulk update tags (add)', async () => {
      const mockDocs = [{ id: 'doc-1', tags: ['existing'] }];
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDocs),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      });

      const result = await bulkUpdateTags(['doc-1'], ['new'], 'add');

      expect(result.success).toBe(true);
    });

    it('should bulk delete documents', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await bulkDeleteDocuments(['doc-1', 'doc-2']);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('getDocumentStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          category: 'legal',
          fileType: 'pdf',
          fileSize: 1024,
          isConfidential: true,
        },
        {
          id: 'doc-2',
          category: 'legal',
          fileType: 'docx',
          fileSize: 2048,
          isConfidential: false,
        },
        {
          id: 'doc-3',
          category: 'financial',
          fileType: 'pdf',
          fileSize: 512,
          isConfidential: true,
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDocs),
        }),
      });

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(3);
      expect(result.byCategory).toEqual({ legal: 2, financial: 1 });
      expect(result.byFileType).toEqual({ pdf: 2, docx: 1 });
      expect(result.totalSize).toBe(3584);
      expect(result.confidential).toBe(2);
    });

    it('should handle empty statistics', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(0);
      expect(result.byCategory).toEqual({});
    });
  });

  // ============================================================================
  // Document Operations
  // ============================================================================

  describe('getDocumentById', () => {
    it('should return a document when found', async () => {
      const mockDocument = {
        id: 'doc-1',
        tenantId: 'tenant-1',
        name: 'Test Document',
        fileUrl: 'https://example.com/file.pdf',
        fileType: 'pdf',
        uploadedBy: 'user-1',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.query.documents.findFirst).mockResolvedValue(mockDocument);

      const result = await getDocumentById('doc-1');

      expect(result).toEqual(mockDocument);
      expect(db.query.documents.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should return null when document is deleted', async () => {
      const mockDocument = {
        id: 'doc-1',
        deletedAt: new Date(),
      };

      vi.mocked(db.query.documents.findFirst).mockResolvedValue(mockDocument as any);

      const result = await getDocumentById('doc-1');

      expect(result).toBeNull();
    });

    it('should return null when document not found', async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue(null);

      const result = await getDocumentById('doc-1');

      expect(result).toBeNull();
    });

    it('should include folder when requested and folderId exists', async () => {
      const mockDocument = {
        id: 'doc-1',
        folderId: 'folder-1',
        deletedAt: null,
      };

      const mockFolder = {
        id: 'folder-1',
        name: 'Test Folder',
        tenantId: 'tenant-1',
      };

      vi.mocked(db.query.documents.findFirst).mockResolvedValue(mockDocument as any);
      vi.mocked(db.query.documentFolders.findFirst).mockResolvedValue(mockFolder as any);

      const result = await getDocumentById('doc-1', true);

      expect(result).toHaveProperty('folder');
      expect(result?.folder).toEqual(mockFolder);
    });

    it('should handle errors and throw', async () => {
      vi.mocked(db.query.documents.findFirst).mockRejectedValue(new Error('DB Error'));

      await expect(getDocumentById('doc-1')).rejects.toThrow('Failed to fetch document');
    });
  });

  describe('listDocuments', () => {
    beforeEach(() => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);
    });

    it('should return documents with pagination', async () => {
      const mockDocs = [
        { id: 'doc-1', name: 'Doc 1' },
        { id: 'doc-2', name: 'Doc 2' },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockDocs),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await listDocuments({}, { page: 1, limit: 10 });

      expect(result).toHaveProperty('documents');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
    });

    it('should filter by tenantId', async () => {
      await listDocuments({ tenantId: 'tenant-1' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by folderId', async () => {
      await listDocuments({ folderId: 'folder-1' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      await listDocuments({ category: 'legal' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by fileType', async () => {
      await listDocuments({ fileType: 'pdf' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by uploadedBy', async () => {
      await listDocuments({ uploadedBy: 'user-1' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by tags', async () => {
      await listDocuments({ tags: ['tag1', 'tag2'] });

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by searchQuery', async () => {
      await listDocuments({ searchQuery: 'test' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should sort by name ascending', async () => {
      await listDocuments({}, { sortBy: 'name', sortOrder: 'asc' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should sort by uploadedAt descending', async () => {
      await listDocuments({}, { sortBy: 'uploadedAt', sortOrder: 'desc' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(listDocuments()).rejects.toThrow('Failed to list documents');
    });
  });

  describe('createDocument', () => {
    it('should create a document successfully', async () => {
      const mockDocument = {
        id: 'doc-1',
        tenantId: 'tenant-1',
        name: 'New Document',
        fileUrl: 'https://example.com/file.pdf',
        fileType: 'pdf',
        uploadedBy: 'user-1',
      };

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockDocument]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      const result = await createDocument(mockDocument as any);

      expect(result).toEqual(mockDocument);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(db.insert).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(createDocument({} as any)).rejects.toThrow('Failed to create document');
    });
  });

  describe('updateDocument', () => {
    it('should update a document successfully', async () => {
      const mockUpdated = {
        id: 'doc-1',
        name: 'Updated Document',
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdated]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await updateDocument('doc-1', { name: 'Updated Document' });

      expect(result).toEqual(mockUpdated);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return null when document not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await updateDocument('doc-1', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(updateDocument('doc-1', {})).rejects.toThrow('Failed to update document');
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete a document successfully', async () => {
      const mockDeleted = { id: 'doc-1' };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockDeleted]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await deleteDocument('doc-1');

      expect(result).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return false when document not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await deleteDocument('doc-1');

      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(deleteDocument('doc-1')).rejects.toThrow('Failed to delete document');
    });
  });

  describe('permanentlyDeleteDocument', () => {
    it('should permanently delete a document successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.delete).mockReturnValue(mockDelete as any);

      const result = await permanentlyDeleteDocument('doc-1');

      expect(result).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(db.delete).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(permanentlyDeleteDocument('doc-1')).rejects.toThrow(
        'Failed to permanently delete document'
      );
    });
  });

  // ============================================================================
  // Folder Operations
  // ============================================================================

  describe('getFolderById', () => {
    it('should return a folder with document count', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Test Folder',
        tenantId: 'tenant-1',
        deletedAt: null,
      };

      vi.mocked(db.query.documentFolders.findFirst).mockResolvedValue(mockFolder as any);

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await getFolderById('folder-1');

      expect(result).toHaveProperty('documentCount', 5);
      expect(result?.name).toBe('Test Folder');
    });

    it('should return null when folder is deleted', async () => {
      const mockFolder = {
        id: 'folder-1',
        deletedAt: new Date(),
      };

      vi.mocked(db.query.documentFolders.findFirst).mockResolvedValue(mockFolder as any);

      const result = await getFolderById('folder-1');

      expect(result).toBeNull();
    });

    it('should return null when folder not found', async () => {
      vi.mocked(db.query.documentFolders.findFirst).mockResolvedValue(null);

      const result = await getFolderById('folder-1');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      vi.mocked(db.query.documentFolders.findFirst).mockRejectedValue(new Error('DB Error'));

      await expect(getFolderById('folder-1')).rejects.toThrow('Failed to fetch folder');
    });
  });

  describe('listFolders', () => {
    it('should list folders with document counts', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Folder 1', tenantId: 'tenant-1' },
        { id: 'folder-2', name: 'Folder 2', tenantId: 'tenant-1' },
      ];

      // First call for listing folders
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockFolders),
      };

      // Mock for document count queries (will be called multiple times)
      const mockCountSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      };

      // Setup the mock to return different values for different calls
      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSelect as any;
        }
        return mockCountSelect as any;
      });

      const result = await listFolders('tenant-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by parentFolderId null', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      const mockCountSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockSelect as any);
      vi.mocked(db.select).mockReturnValue(mockCountSelect as any);

      await listFolders('tenant-1', null);

      expect(db.select).toHaveBeenCalled();
    });

    it('should filter by specific parentFolderId', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      const mockCountSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockSelect as any);
      vi.mocked(db.select).mockReturnValue(mockCountSelect as any);

      await listFolders('tenant-1', 'parent-folder-1');

      expect(db.select).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(listFolders('tenant-1')).rejects.toThrow('Failed to list folders');
    });
  });

  describe('createFolder', () => {
    it('should create a folder successfully', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'New Folder',
        tenantId: 'tenant-1',
        createdBy: 'user-1',
      };

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockFolder]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      const result = await createFolder(mockFolder as any);

      expect(result).toEqual(mockFolder);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(db.insert).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(createFolder({} as any)).rejects.toThrow('Failed to create folder');
    });
  });

  describe('updateFolder', () => {
    it('should update a folder successfully', async () => {
      const mockUpdated = {
        id: 'folder-1',
        name: 'Updated Folder',
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdated]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await updateFolder('folder-1', { name: 'Updated Folder' });

      expect(result).toEqual(mockUpdated);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return null when folder not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await updateFolder('folder-1', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(updateFolder('folder-1', {})).rejects.toThrow('Failed to update folder');
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder without contents', async () => {
      const mockDeleted = { id: 'folder-1' };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockDeleted]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await deleteFolder('folder-1', false);

      expect(result).toBe(true);
    });

    it('should delete folder with contents', async () => {
      // Mock empty subfolders to prevent infinite recursion
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]), // No subfolders
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'folder-1' }]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await deleteFolder('folder-1', true);

      expect(result).toBe(true);
    });

    it('should return false when folder not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await deleteFolder('folder-1');

      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(deleteFolder('folder-1')).rejects.toThrow('Failed to delete folder');
    });
  });

  describe('getFolderTree', () => {
    it('should build folder tree structure', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Root 1', parentFolderId: null, tenantId: 'tenant-1' },
        { id: 'folder-2', name: 'Child 1', parentFolderId: 'folder-1', tenantId: 'tenant-1' },
        { id: 'folder-3', name: 'Root 2', parentFolderId: null, tenantId: 'tenant-1' },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockFolders),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await getFolderTree('tenant-1');

      expect(result).toHaveLength(2); // Two root folders
      expect(result[0]).toHaveProperty('children');
    });

    it('should handle empty folder tree', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await getFolderTree('tenant-1');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(getFolderTree('tenant-1')).rejects.toThrow('Failed to get folder tree');
    });
  });

  // ============================================================================
  // Version Control
  // ============================================================================

  describe('createDocumentVersion', () => {
    it('should create a document version', async () => {
      const result = await createDocumentVersion(
        'doc-1',
        'https://example.com/v2.pdf',
        'user-1',
        'Updated content'
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('documentId', 'doc-1');
      expect(result).toHaveProperty('fileUrl', 'https://example.com/v2.pdf');
      expect(result).toHaveProperty('uploadedBy', 'user-1');
      expect(result).toHaveProperty('changeDescription', 'Updated content');
    });

    it('should create version without change description', async () => {
      const result = await createDocumentVersion('doc-1', 'https://example.com/v2.pdf', 'user-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('changeDescription', undefined);
    });
  });

  describe('getDocumentVersions', () => {
    it('should return empty array', async () => {
      const result = await getDocumentVersions('doc-1');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // OCR Processing
  // ============================================================================

  describe('processDocumentOCR', () => {
    it('should process document with OCR', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{}]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await processDocumentOCR('doc-1');

      expect(result).toHaveProperty('documentId', 'doc-1');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('language', 'en');
      expect(result).toHaveProperty('processedAt');
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(processDocumentOCR('doc-1')).rejects.toThrow('Failed to process document OCR');
    });
  });

  describe('bulkProcessOCR', () => {
    it('should process multiple documents successfully', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{}]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkProcessOCR(['doc-1', 'doc-2']);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      let callCount = 0;
      vi.mocked(db.update).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([{}]),
          } as any;
        }
        throw new Error('OCR Error');
      });

      const result = await bulkProcessOCR(['doc-1', 'doc-2']);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle complete failure', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('OCR Error');
      });

      const result = await bulkProcessOCR(['doc-1', 'doc-2']);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  // ============================================================================
  // Search Operations
  // ============================================================================

  describe('searchDocuments', () => {
    it('should search documents with query', async () => {
      const mockDocs = [{ id: 'doc-1', name: 'Test Document' }];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockDocs),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await searchDocuments('tenant-1', 'test');

      expect(result).toHaveProperty('documents');
      expect(result).toHaveProperty('total');
    });

    it('should search with category filter', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      await searchDocuments('tenant-1', 'test', { category: 'legal' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should search with fileType filter', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      await searchDocuments('tenant-1', 'test', { fileType: 'pdf' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should search with tags filter', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      await searchDocuments('tenant-1', 'test', { tags: ['tag1'] });

      expect(db.select).toHaveBeenCalled();
    });

    it('should search with uploadedBy filter', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      await searchDocuments('tenant-1', 'test', { uploadedBy: 'user-1' });

      expect(db.select).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      await searchDocuments('tenant-1', 'test', {}, { page: 2, limit: 20 });

      expect(db.select).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(searchDocuments('tenant-1', 'test')).rejects.toThrow(
        'Failed to search documents'
      );
    });
  });

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  describe('bulkMoveDocuments', () => {
    it('should move documents successfully', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkMoveDocuments(['doc-1', 'doc-2'], 'folder-1');

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should move documents to null folder', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkMoveDocuments(['doc-1'], null);

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = await bulkMoveDocuments(['doc-1'], 'folder-1');

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors).toBeDefined();
    });
  });

  describe('bulkUpdateTags', () => {
    it('should replace tags', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkUpdateTags(['doc-1', 'doc-2'], ['tag1', 'tag2'], 'replace');

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });

    it('should add tags', async () => {
      const mockDocs = [
        { id: 'doc-1', tags: ['existing'] },
        { id: 'doc-2', tags: [] },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{}]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkUpdateTags(['doc-1', 'doc-2'], ['new-tag'], 'add');

      expect(result.success).toBe(true);
    });

    it('should remove tags', async () => {
      const mockDocs = [{ id: 'doc-1', tags: ['tag1', 'tag2'] }];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{}]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkUpdateTags(['doc-1'], ['tag1'], 'remove');

      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = await bulkUpdateTags(['doc-1'], ['tag1'], 'replace');

      expect(result.success).toBe(false);
    });
  });

  describe('bulkDeleteDocuments', () => {
    it('should delete documents successfully', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as any);

      const result = await bulkDeleteDocuments(['doc-1', 'doc-2', 'doc-3']);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle errors', async () => {
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = await bulkDeleteDocuments(['doc-1']);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('getDocumentStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          category: 'legal',
          fileType: 'pdf',
          fileSize: 1024,
          isConfidential: true,
        },
        {
          id: 'doc-2',
          category: 'legal',
          fileType: 'docx',
          fileSize: 2048,
          isConfidential: false,
        },
        {
          id: 'doc-3',
          category: 'financial',
          fileType: 'pdf',
          fileSize: 512,
          isConfidential: true,
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(3);
      expect(result.byCategory).toEqual({ legal: 2, financial: 1 });
      expect(result.byFileType).toEqual({ pdf: 2, docx: 1 });
      expect(result.totalSize).toBe(3584);
      expect(result.confidential).toBe(2);
    });

    it('should handle empty statistics', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await getDocumentStatistics('tenant-1');

      expect(result.total).toBe(0);
      expect(result.byCategory).toEqual({});
      expect(result.byFileType).toEqual({});
      expect(result.totalSize).toBe(0);
      expect(result.confidential).toBe(0);
    });

    it('should handle documents with null fileSize', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          category: 'legal',
          fileType: 'pdf',
          fileSize: null,
          isConfidential: false,
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDocs),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await getDocumentStatistics('tenant-1');

      expect(result.totalSize).toBe(0);
    });

    it('should handle errors', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('DB Error');
      });

      await expect(getDocumentStatistics('tenant-1')).rejects.toThrow(
        'Failed to get document statistics'
      );
    });
  });
});
