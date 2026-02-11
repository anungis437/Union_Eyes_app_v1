/**
 * OCR Configuration
 * Settings for different OCR providers and language support
 */

import { OCRConfig, OCRProvider } from '../types/documents';

export const OCR_CONFIG: OCRConfig = {
  providers: {
    mlKit: {
      enabled: true,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
      latinOnly: false,
    },
    tesseract: {
      enabled: true,
      languages: ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'chi_sim', 'jpn', 'kor'],
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/',
    },
    server: {
      enabled: true,
      endpoint: process.env.EXPO_PUBLIC_API_URL + '/api/ocr/process',
      apiKey: process.env.EXPO_PUBLIC_OCR_API_KEY,
      timeout: 30000, // 30 seconds
    },
  },
  defaultProvider: OCRProvider.ML_KIT, // Fast, on-device
  fallbackProvider: OCRProvider.TESSERACT, // Offline fallback
  languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'],
  minConfidence: 0.6, // Minimum confidence threshold (0-1)
};

// Language code mappings between providers
export const LANGUAGE_MAPPINGS: Record<
  string,
  { mlKit: string; tesseract: string; display: string }
> = {
  en: { mlKit: 'en', tesseract: 'eng', display: 'English' },
  es: { mlKit: 'es', tesseract: 'spa', display: 'Spanish' },
  fr: { mlKit: 'fr', tesseract: 'fra', display: 'French' },
  de: { mlKit: 'de', tesseract: 'deu', display: 'German' },
  it: { mlKit: 'it', tesseract: 'ita', display: 'Italian' },
  pt: { mlKit: 'pt', tesseract: 'por', display: 'Portuguese' },
  zh: { mlKit: 'zh', tesseract: 'chi_sim', display: 'Chinese' },
  ja: { mlKit: 'ja', tesseract: 'jpn', display: 'Japanese' },
  ko: { mlKit: 'ko', tesseract: 'kor', display: 'Korean' },
};

// OCR quality settings
export const OCR_QUALITY_SETTINGS = {
  fast: {
    name: 'Fast',
    provider: OCRProvider.ML_KIT,
    preprocessImage: false,
    enhanceContrast: false,
  },
  balanced: {
    name: 'Balanced',
    provider: OCRProvider.ML_KIT,
    preprocessImage: true,
    enhanceContrast: true,
  },
  accurate: {
    name: 'Most Accurate',
    provider: OCRProvider.SERVER,
    preprocessImage: true,
    enhanceContrast: true,
  },
};

// Document type detection patterns
export const DOCUMENT_PATTERNS = {
  receipt: {
    keywords: ['receipt', 'total', 'tax', 'subtotal', 'amount', 'paid', '$'],
    confidence: 0.7,
  },
  invoice: {
    keywords: ['invoice', 'bill', 'amount due', 'payment', 'terms', 'net'],
    confidence: 0.7,
  },
  medicalRecord: {
    keywords: ['patient', 'doctor', 'diagnosis', 'prescription', 'medical', 'clinic', 'hospital'],
    confidence: 0.8,
  },
  idCard: {
    keywords: ['id', 'license', 'identification', 'dob', 'expires', 'issued'],
    confidence: 0.8,
  },
  passport: {
    keywords: ['passport', 'nationality', 'issued', 'expires', 'surname', 'given names'],
    confidence: 0.9,
  },
};

// Image preprocessing settings
export const IMAGE_PREPROCESSING = {
  autoRotate: true,
  autoContrast: true,
  autoBrightness: true,
  removeNoise: true,
  sharpen: true,
  deskew: true,
};

// Batch processing settings
export const BATCH_PROCESSING = {
  maxConcurrent: 3, // Max simultaneous OCR processes
  maxQueueSize: 20,
  priorityRules: {
    highPriority: ['id_card', 'passport', 'medical_record'],
    lowPriority: ['other'],
  },
};

// Cache settings
export const OCR_CACHE = {
  enabled: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100 * 1024 * 1024, // 100 MB
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  fastProcessing: 2000, // Under 2 seconds
  slowProcessing: 10000, // Over 10 seconds
  maxProcessingTime: 30000, // 30 seconds timeout
};

// Display confidence colors
export const CONFIDENCE_COLORS = {
  high: '#10b981', // green - > 0.85
  medium: '#f59e0b', // orange - 0.65-0.85
  low: '#ef4444', // red - < 0.65
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence > 0.85) return CONFIDENCE_COLORS.high;
  if (confidence > 0.65) return CONFIDENCE_COLORS.medium;
  return CONFIDENCE_COLORS.low;
};

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence > 0.85) return 'High';
  if (confidence > 0.65) return 'Medium';
  return 'Low';
};

// Text extraction patterns
export const TEXT_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+\d{1,2}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  date: /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
  currency: /\$\s?\d+([,\.]\d{2,3})*(\.\d{2})?/g,
  url: /https?:\/\/[^\s]+/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  zipCode: /\b\d{5}(-\d{4})?\b/g,
};

// Export default config
export default OCR_CONFIG;

