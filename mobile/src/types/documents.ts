/**
 * Document Types for Mobile App
 * Complete TypeScript definitions for document capture, OCR, and management
 */

export enum DocumentType {
  CLAIM = 'claim',
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  MEDICAL_RECORD = 'medical_record',
  ID_CARD = 'id_card',
  PASSPORT = 'passport',
  CONTRACT = 'contract',
  FORM = 'form',
  OTHER = 'other',
}

export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  OCR_PENDING = 'ocr_pending',
  OCR_PROCESSING = 'ocr_processing',
  OCR_COMPLETED = 'ocr_completed',
  OCR_FAILED = 'ocr_failed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DRAFT = 'draft',
}

export enum OCRProvider {
  ML_KIT = 'ml_kit', // Google ML Kit (on-device)
  TESSERACT = 'tesseract', // Tesseract.js (on-device fallback)
  SERVER = 'server', // Server-side OCR (high accuracy)
}

export enum ImageFilter {
  ORIGINAL = 'original',
  BLACK_WHITE = 'black_white',
  GRAYSCALE = 'grayscale',
  COLOR = 'color',
  ENHANCE = 'enhance',
}

export interface DocumentPage {
  id: string;
  uri: string;
  thumbnailUri?: string;
  width: number;
  height: number;
  size: number; // bytes
  order: number;
  filter: ImageFilter;
  corners?: DocumentCorners;
  ocrResult?: OCRResult;
  processedAt?: Date;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface Point {
  x: number;
  y: number;
}

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  description?: string;
  status: DocumentStatus;
  pages: DocumentPage[];
  createdAt: Date;
  updatedAt: Date;
  uploadedAt?: Date;
  processedAt?: Date;
  claimId?: string;
  tags: string[];
  metadata: DocumentMetadata;
  ocrText?: string; // Combined text from all pages
  language?: string;
  confidence?: number; // Average confidence
  fileSize: number; // Total size in bytes
  pdfUri?: string; // Generated PDF
  serverId?: string; // Server-side ID after upload
}

export interface DocumentMetadata {
  originalFileName?: string;
  mimeType: string;
  capturedWith: 'camera' | 'gallery' | 'file_picker';
  deviceInfo?: {
    manufacturer: string;
    model: string;
    osVersion: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  ocrProvider?: OCRProvider;
  processingTime?: number; // milliseconds
  compressed: boolean;
  originalSize?: number;
}

// OCR Types
export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
  language: string;
  languageConfidence: number;
  provider: OCRProvider;
  processedAt: Date;
  processingTime: number; // milliseconds
  confidence: number; // 0-1
}

export interface OCRBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  paragraphs: OCRParagraph[];
  recognizedLanguages: string[];
}

export interface OCRParagraph {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  words: OCRWord[];
}

export interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  symbols?: OCRSymbol[];
}

export interface OCRSymbol {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Upload Types
export interface UploadTask {
  id: string;
  documentId: string;
  status: UploadStatus;
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PAUSED = 'paused',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Camera Types
export interface CameraOptions {
  quality: number; // 0-1
  base64: boolean;
  exif: boolean;
  skipProcessing?: boolean;
  correctOrientation?: boolean;
  flashMode?: FlashMode;
}

export enum FlashMode {
  OFF = 'off',
  ON = 'on',
  AUTO = 'auto',
  TORCH = 'torch',
}

export interface CaptureResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  exif?: Record<string, any>;
}

// Image Editor Types
export interface ImageEditorState {
  originalUri: string;
  editedUri?: string;
  cropRegion?: CropRegion;
  rotation: number; // degrees: 0, 90, 180, 270
  filter: ImageFilter;
  brightness: number; // -1 to 1
  contrast: number; // -1 to 1
  saturation: number; // -1 to 1
  corners?: DocumentCorners;
}

export interface CropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

// Search and Filter Types
export interface DocumentFilters {
  types?: DocumentType[];
  statuses?: DocumentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  searchText?: string;
  claimId?: string;
  hasOCR?: boolean;
}

export interface DocumentSortOptions {
  field: 'createdAt' | 'updatedAt' | 'title' | 'type' | 'size';
  direction: 'asc' | 'desc';
}

// View Preferences
export enum DocumentViewMode {
  GRID = 'grid',
  LIST = 'list',
}

export interface DocumentsPreferences {
  viewMode: DocumentViewMode;
  sortOptions: DocumentSortOptions;
  filters: DocumentFilters;
  thumbnailSize: 'small' | 'medium' | 'large';
  showOCRPreview: boolean;
}

// Export Types
export interface ExportOptions {
  format: 'pdf' | 'txt' | 'json' | 'images';
  includeOCR: boolean;
  quality?: number; // For images/PDF
  pageRange?: {
    start: number;
    end: number;
  };
}

// API Response Types
export interface DocumentUploadResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  status: DocumentStatus;
}

export interface OCRApiResponse {
  text: string;
  blocks: OCRBlock[];
  language: string;
  confidence: number;
  processingTime: number;
}

// Store State Types
export interface DocumentsState {
  documents: Document[];
  selectedDocumentIds: string[];
  uploadQueue: UploadTask[];
  currentDocument?: Document;
  preferences: DocumentsPreferences;
  isLoading: boolean;
  error?: string;
}

// Hook Return Types
export interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  createDocument: (doc: Partial<Document>) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  uploadDocument: (document: Document) => Promise<void>;
  searchDocuments: (query: string) => Promise<Document[]>;
  filterDocuments: (filters: DocumentFilters) => Document[];
  sortDocuments: (options: DocumentSortOptions) => void;
}

export interface UseDocumentUploadReturn {
  uploadDocument: (document: Document) => Promise<void>;
  uploadProgress: Map<string, number>;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
}

export interface UseOCRProcessReturn {
  processImage: (uri: string, options?: OCROptions) => Promise<OCRResult>;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export interface OCROptions {
  provider?: OCRProvider;
  language?: string;
  detectOrientation?: boolean;
  detectTables?: boolean;
  detectHandwriting?: boolean;
}

export interface UseCameraPermissionsReturn {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  isGranted: boolean;
  canAskAgain: boolean;
}

export interface UseDocumentViewerReturn {
  currentPage: number;
  totalPages: number;
  zoom: number;
  showOCROverlay: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setZoom: (zoom: number) => void;
  toggleOCROverlay: () => void;
}

// Configuration Types
export interface OCRConfig {
  providers: {
    mlKit: MLKitConfig;
    tesseract: TesseractConfig;
    server: ServerOCRConfig;
  };
  defaultProvider: OCRProvider;
  fallbackProvider: OCRProvider;
  languages: string[];
  minConfidence: number;
}

export interface MLKitConfig {
  enabled: boolean;
  languages: string[];
  latinOnly: boolean;
}

export interface TesseractConfig {
  enabled: boolean;
  languages: string[];
  workerPath: string;
}

export interface ServerOCRConfig {
  enabled: boolean;
  endpoint: string;
  apiKey?: string;
  timeout: number;
}

// Quality Presets
export interface ImageQualityPreset {
  name: string;
  compressionQuality: number;
  maxWidth: number;
  maxHeight: number;
  format: 'jpeg' | 'png';
}

export const QUALITY_PRESETS: Record<string, ImageQualityPreset> = {
  high: {
    name: 'High Quality',
    compressionQuality: 0.95,
    maxWidth: 3000,
    maxHeight: 3000,
    format: 'jpeg',
  },
  medium: {
    name: 'Medium Quality',
    compressionQuality: 0.8,
    maxWidth: 2000,
    maxHeight: 2000,
    format: 'jpeg',
  },
  low: {
    name: 'Low Quality',
    compressionQuality: 0.6,
    maxWidth: 1200,
    maxHeight: 1200,
    format: 'jpeg',
  },
};

