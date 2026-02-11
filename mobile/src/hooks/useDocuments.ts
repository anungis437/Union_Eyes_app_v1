/**
 * Document Hooks
 * Custom React hooks for document management, OCR, camera, and uploads
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@services/api';
import { v4 as uuidv4 } from 'uuid';
import {
  Document,
  DocumentType,
  DocumentStatus,
  OCRResult,
  OCROptions,
  DocumentFilters,
  DocumentSortOptions,
  CaptureResult,
  UseDocumentsReturn,
  UseDocumentUploadReturn,
  UseOCRProcessReturn,
  UseCameraPermissionsReturn,
  UseDocumentViewerReturn,
  DocumentPage,
  ImageFilter,
} from '../types/documents';
import {
  useDocumentsStore,
  selectFilteredDocuments,
  selectSelectedDocuments,
  selectDocumentById,
} from '../store/documentsStore';
import cameraService from '../services/camera';
import ocrService from '../services/ocr';
import documentUploadService from '../services/document-upload';

// Legacy API hooks (keep for backward compatibility)
export function useDocumentsAPI(params?: { limit?: number }) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => apiService.getDocuments(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadDocumentAPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => apiService.uploadDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocumentAPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Main documents hook
 */
export function useDocuments(): UseDocumentsReturn {
  const {
    documents,
    isLoading,
    error,
    addDocument,
    updateDocument,
    deleteDocument,
    setDocuments,
    setFilters,
    setSortOptions,
    setLoading,
    setError,
  } = useDocumentsStore();

  const filteredDocuments = useDocumentsStore(selectFilteredDocuments);

  const createDocument = useCallback(
    async (doc: Partial<Document>): Promise<Document> => {
      try {
        setLoading(true);
        const newDocument: Document = {
          id: uuidv4(),
          type: doc.type || DocumentType.OTHER,
          title: doc.title || 'Untitled Document',
          description: doc.description,
          status: doc.status || DocumentStatus.DRAFT,
          pages: doc.pages || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: doc.tags || [],
          metadata: doc.metadata || {
            mimeType: 'image/jpeg',
            capturedWith: 'camera',
            compressed: false,
          },
          fileSize: doc.pages?.reduce((sum, page) => sum + page.size, 0) || 0,
          ...doc,
        };

        addDocument(newDocument);
        setError(undefined);
        return newDocument;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addDocument, setLoading, setError]
  );

  const uploadDocument = useCallback(
    async (document: Document): Promise<void> => {
      try {
        setLoading(true);
        await documentUploadService.uploadDocument(document);
        updateDocument(document.id, { status: DocumentStatus.COMPLETED });
        setError(undefined);
      } catch (err: any) {
        setError(err.message);
        updateDocument(document.id, { status: DocumentStatus.FAILED });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateDocument, setLoading, setError]
  );

  const searchDocuments = useCallback(
    async (query: string): Promise<Document[]> => {
      setFilters({ searchText: query });
      return filteredDocuments;
    },
    [filteredDocuments, setFilters]
  );

  const filterDocuments = useCallback(
    (filters: DocumentFilters): Document[] => {
      setFilters(filters);
      return filteredDocuments;
    },
    [filteredDocuments, setFilters]
  );

  const sortDocuments = useCallback(
    (options: DocumentSortOptions): void => {
      setSortOptions(options);
    },
    [setSortOptions]
  );

  return {
    documents: filteredDocuments,
    isLoading,
    error: error || null,
    createDocument,
    updateDocument: async (id: string, updates: Partial<Document>) => {
      updateDocument(id, updates);
    },
    deleteDocument: async (id: string) => {
      Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDocument(id),
        },
      ]);
    },
    uploadDocument,
    searchDocuments,
    filterDocuments,
    sortDocuments,
  };
}

/**
 * Document upload hook
 */
export function useDocumentUpload(): UseDocumentUploadReturn {
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const { updateDocument } = useDocumentsStore();

  const uploadDocument = useCallback(
    async (document: Document): Promise<void> => {
      try {
        updateDocument(document.id, { status: DocumentStatus.UPLOADING });

        await documentUploadService.uploadDocument(document, (progress) => {
          setUploadProgress((prev) => new Map(prev).set(document.id, progress));
        });

        updateDocument(document.id, {
          status: DocumentStatus.COMPLETED,
          uploadedAt: new Date(),
        });
      } catch (error: any) {
        updateDocument(document.id, { status: DocumentStatus.FAILED });
        throw error;
      }
    },
    [updateDocument]
  );

  const pauseUpload = useCallback((id: string) => {
    const tasks = documentUploadService.getPendingUploads();
    const task = tasks.find((t) => t.documentId === id);
    if (task) {
      documentUploadService.pauseUpload(task.id);
    }
  }, []);

  const resumeUpload = useCallback(async (id: string) => {
    const tasks = documentUploadService.getPendingUploads();
    tasks.find((t) => t.documentId === id);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    const tasks = documentUploadService.getPendingUploads();
    const task = tasks.find((t) => t.documentId === id);
    if (task) {
      documentUploadService.cancelUpload(task.id);
    }
  }, []);

  const retryUpload = useCallback(async (id: string) => {
    void id;
  }, []);

  return {
    uploadDocument,
    uploadProgress,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
  };
}

/**
 * OCR processing hook
 */
export function useOCRProcess(): UseOCRProcessReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(
    async (uri: string, options?: OCROptions): Promise<OCRResult> => {
      try {
        setIsProcessing(true);
        setProgress(0);
        setError(null);

        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const result = await ocrService.processImage(uri, options);

        clearInterval(progressInterval);
        setProgress(100);

        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    processImage,
    isProcessing,
    progress,
    error,
  };
}

/**
 * Camera permissions hook
 */
export function useCameraPermissions(): UseCameraPermissionsReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { granted, canAskAgain: canAsk } = await cameraService.checkCameraPermissions();
    setHasPermission(granted);
    setIsGranted(granted);
    setCanAskAgain(canAsk);
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await cameraService.requestCameraPermissions();
    setHasPermission(granted);
    setIsGranted(granted);
    return granted;
  }, []);

  return {
    hasPermission,
    requestPermission,
    isGranted,
    canAskAgain,
  };
}

/**
 * Document viewer hook
 */
export function useDocumentViewer(documentId: string): UseDocumentViewerReturn {
  const document = useDocumentsStore(selectDocumentById(documentId));
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showOCROverlay, setShowOCROverlay] = useState(false);

  const totalPages = document?.pages.length || 0;

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 0 && page < totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const toggleOCROverlay = useCallback(() => {
    setShowOCROverlay(!showOCROverlay);
  }, [showOCROverlay]);

  return {
    currentPage,
    totalPages,
    zoom,
    showOCROverlay,
    goToPage,
    nextPage,
    previousPage,
    setZoom,
    toggleOCROverlay,
  };
}

/**
 * Document capture hook (combines camera + OCR)
 */
export function useDocumentCapture() {
  const { createDocument, updateDocument } = useDocuments();
  const { processImage } = useOCRProcess();
  const [isCapturing, setIsCapturing] = useState(false);

  const captureDocument = useCallback(
    async (
      type: DocumentType = DocumentType.OTHER,
      options?: { runOCR?: boolean; title?: string }
    ): Promise<Document | null> => {
      try {
        setIsCapturing(true);

        const captureResult = await cameraService.capturePhoto({ quality: 0.9 });
        if (!captureResult) {
          return null;
        }

        const page: DocumentPage = {
          id: uuidv4(),
          uri: captureResult.uri,
          width: captureResult.width,
          height: captureResult.height,
          size: await cameraService.getFileSize(captureResult.uri),
          order: 0,
          filter: ImageFilter.ORIGINAL,
        };

        const document = await createDocument({
          type,
          title: options?.title || `Document ${new Date().toLocaleDateString()}`,
          pages: [page],
          status: DocumentStatus.DRAFT,
        });

        if (options?.runOCR) {
          try {
            const ocrResult = await processImage(captureResult.uri);
            page.ocrResult = ocrResult;
            await updateDocument(document.id, {
              ocrText: ocrResult.text,
              language: ocrResult.language,
              confidence: ocrResult.confidence,
              status: DocumentStatus.OCR_COMPLETED,
            });
          } catch (ocrError) {
            await updateDocument(document.id, {
              status: DocumentStatus.OCR_FAILED,
            });
          }
        }

        return document;
      } catch {
        Alert.alert('Error', 'Failed to capture document');
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [createDocument, updateDocument, processImage]
  );

  const pickFromGallery = useCallback(
    async (
      type: DocumentType = DocumentType.OTHER,
      options?: { runOCR?: boolean; allowsMultiple?: boolean }
    ): Promise<Document | null> => {
      try {
        setIsCapturing(true);

        const captureResults = await cameraService.pickImageFromGallery(
          { quality: 0.9 },
          options?.allowsMultiple || false
        );

        if (captureResults.length === 0) {
          return null;
        }

        const pages: DocumentPage[] = await Promise.all(
          captureResults.map(async (result, index) => ({
            id: uuidv4(),
            uri: result.uri,
            width: result.width,
            height: result.height,
            size: await cameraService.getFileSize(result.uri),
            order: index,
            filter: ImageFilter.ORIGINAL,
          }))
        );

        const document = await createDocument({
          type,
          title: `Document ${new Date().toLocaleDateString()}`,
          pages,
          status: DocumentStatus.DRAFT,
        });

        if (options?.runOCR) {
          try {
            const ocrResults = await Promise.all(pages.map((page) => processImage(page.uri)));

            pages.forEach((page, index) => {
              page.ocrResult = ocrResults[index];
            });

            const combinedText = ocrResults.map((r) => r.text).join('\n\n');

            await updateDocument(document.id, {
              ocrText: combinedText,
              language: ocrResults[0]?.language,
              confidence: ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length,
              status: DocumentStatus.OCR_COMPLETED,
            });
          } catch (ocrError) {
            await updateDocument(document.id, {
              status: DocumentStatus.OCR_FAILED,
            });
          }
        }

        return document;
      } catch {
        Alert.alert('Error', 'Failed to pick images');
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [createDocument, updateDocument, processImage]
  );

  return {
    captureDocument,
    pickFromGallery,
    isCapturing,
  };
}

/**
 * Document search hook
 */
export function useDocumentSearch() {
  const { documents } = useDocumentsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);

  useEffect(() => {
    if (!searchQuery) {
      setResults(documents);
      return;
    }

    const filtered = documents.filter((doc) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.ocrText?.toLowerCase().includes(searchLower) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    });

    setResults(filtered);
  }, [searchQuery, documents]);

  return {
    searchQuery,
    setSearchQuery,
    results,
  };
}

