/**
 * Document Service Tests (Minimal Version)
 * Testing basic document operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDocumentById,
} from '@/lib/services/document-service';

// Mock database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      documents: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/db/schema', () => ({
  documents: {
    id: 'id',
    name: 'name',
    _: { name: 'documents' },
  },
}));

// Import after mocks
import { db } from '@/db/db';

describe('Document Service - Minimal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get document by ID', async () => {
    const mockDocument = {
      id: 'doc-123',
      organizationId: 'org-1',
      name: 'Contract.pdf',
      fileUrl: 'https://storage.example.com/contract.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      folderId: 'folder-1',
      category: 'legal',
      isConfidential: true,
      deletedAt: null,
    };

    (db.query.documents.findFirst as any).mockResolvedValue(mockDocument);

    const result = await getDocumentById('doc-123');

    expect(result).toEqual(mockDocument);
    expect(db.query.documents.findFirst).toHaveBeenCalled();
  });

  it('should return null if document not found', async () => {
    (db.query.documents.findFirst as any).mockResolvedValue(null);

    const result = await getDocumentById('nonexistent');

    expect(result).toBeNull();
  });
});



