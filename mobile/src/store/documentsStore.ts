/**
 * Documents Store
 * Zustand store for document state management
 */

import { create } from 'zustand';
import {
  Document,
  DocumentsState,
  DocumentFilters,
  DocumentSortOptions,
  DocumentViewMode,
  UploadTask,
} from '../types/documents';
import storageService from '../services/storage';

const DOCUMENTS_STORAGE_KEY = 'documents';
const PREFERENCES_STORAGE_KEY = 'documents_preferences';

interface DocumentsStore extends DocumentsState {
  // Actions
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  setCurrentDocument: (document: Document | undefined) => void;
  selectDocument: (id: string) => void;
  deselectDocument: (id: string) => void;
  clearSelection: () => void;
  setUploadQueue: (queue: UploadTask[]) => void;
  addToUploadQueue: (task: UploadTask) => void;
  updateUploadTask: (id: string, updates: Partial<UploadTask>) => void;
  removeFromUploadQueue: (id: string) => void;
  setFilters: (filters: Partial<DocumentFilters>) => void;
  setSortOptions: (options: DocumentSortOptions) => void;
  setViewMode: (mode: DocumentViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useDocumentsStore = create<DocumentsStore>((set, get) => ({
  // Initial state
  documents: [],
  selectedDocumentIds: [],
  uploadQueue: [],
  currentDocument: undefined,
  preferences: {
    viewMode: DocumentViewMode.GRID,
    sortOptions: {
      field: 'createdAt',
      direction: 'desc',
    },
    filters: {},
    thumbnailSize: 'medium',
    showOCRPreview: true,
  },
  isLoading: false,
  error: undefined,

  // Actions
  setDocuments: (documents) => {
    set({ documents });
    get().saveToStorage();
  },

  addDocument: (document) => {
    set((state) => ({
      documents: [document, ...state.documents],
    }));
    get().saveToStorage();
  },

  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates, updatedAt: new Date() } : doc
      ),
    }));
    get().saveToStorage();
  },

  deleteDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
      selectedDocumentIds: state.selectedDocumentIds.filter((docId) => docId !== id),
      currentDocument: state.currentDocument?.id === id ? undefined : state.currentDocument,
    }));
    get().saveToStorage();
  },

  setCurrentDocument: (document) => {
    set({ currentDocument: document });
  },

  selectDocument: (id) => {
    set((state) => ({
      selectedDocumentIds: [...state.selectedDocumentIds, id],
    }));
  },

  deselectDocument: (id) => {
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.filter((docId) => docId !== id),
    }));
  },

  clearSelection: () => {
    set({ selectedDocumentIds: [] });
  },

  setUploadQueue: (queue) => {
    set({ uploadQueue: queue });
  },

  addToUploadQueue: (task) => {
    set((state) => ({
      uploadQueue: [...state.uploadQueue, task],
    }));
  },

  updateUploadTask: (id, updates) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
  },

  removeFromUploadQueue: (id) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((task) => task.id !== id),
    }));
  },

  setFilters: (filters) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        filters: { ...state.preferences.filters, ...filters },
      },
    }));
  },

  setSortOptions: (options) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        sortOptions: options,
      },
    }));
  },

  setViewMode: (mode) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        viewMode: mode,
      },
    }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  loadFromStorage: async () => {
    try {
      const documentsData = await storageService.storage.getItem<string>(DOCUMENTS_STORAGE_KEY);
      const preferencesData = await storageService.storage.getItem<string>(PREFERENCES_STORAGE_KEY);

      if (documentsData) {
        const documents = JSON.parse(documentsData);
        // Convert date strings back to Date objects
        documents.forEach((doc: any) => {
          doc.createdAt = new Date(doc.createdAt);
          doc.updatedAt = new Date(doc.updatedAt);
          if (doc.uploadedAt) doc.uploadedAt = new Date(doc.uploadedAt);
          if (doc.processedAt) doc.processedAt = new Date(doc.processedAt);
        });
        set({ documents });
      }

      if (preferencesData) {
        const preferences = JSON.parse(preferencesData);
        set({ preferences });
      }
    } catch {
    }
  },

  saveToStorage: async () => {
    try {
      const { documents, preferences } = get();
      await storageService.storage.setItem(DOCUMENTS_STORAGE_KEY, documents);
      await storageService.storage.setItem(PREFERENCES_STORAGE_KEY, preferences);
    } catch {
    }
  },
}));

// Computed selectors
export const selectFilteredDocuments = (state: DocumentsStore): Document[] => {
  const { documents, preferences } = state;
  const { filters, sortOptions } = preferences;

  let filtered = [...documents];

  // Apply filters
  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter((doc) => filters.types!.includes(doc.type));
  }

  if (filters.statuses && filters.statuses.length > 0) {
    filtered = filtered.filter((doc) => filters.statuses!.includes(doc.status));
  }

  if (filters.dateFrom) {
    filtered = filtered.filter((doc) => doc.createdAt >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    filtered = filtered.filter((doc) => doc.createdAt <= filters.dateTo!);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((doc) => filters.tags!.some((tag) => doc.tags.includes(tag)));
  }

  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.ocrText?.toLowerCase().includes(searchLower)
    );
  }

  if (filters.claimId) {
    filtered = filtered.filter((doc) => doc.claimId === filters.claimId);
  }

  if (filters.hasOCR !== undefined) {
    filtered = filtered.filter((doc) => (doc.ocrText ? true : false) === filters.hasOCR);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Handle special case for size (sum of page sizes)
    if (sortOptions.field === 'size') {
      aValue = a.pages.reduce((sum, page) => sum + (page.size || 0), 0);
      bValue = b.pages.reduce((sum, page) => sum + (page.size || 0), 0);
    } else {
      aValue = a[sortOptions.field];
      bValue = b[sortOptions.field];
    }

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    return sortOptions.direction === 'asc' ? comparison : -comparison;
  });

  return filtered;
};

export const selectSelectedDocuments = (state: DocumentsStore): Document[] => {
  return state.documents.filter((doc) => state.selectedDocumentIds.includes(doc.id));
};

export const selectDocumentById =
  (id: string) =>
  (state: DocumentsStore): Document | undefined => {
    return state.documents.find((doc) => doc.id === id);
  };

export const selectDocumentsByClaimId =
  (claimId: string) =>
  (state: DocumentsStore): Document[] => {
    return state.documents.filter((doc) => doc.claimId === claimId);
  };

