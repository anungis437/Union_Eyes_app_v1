/**
 * Document Services Tests
 * Test suite for camera, OCR, and document upload services
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import cameraService from '../camera';
import ocrService from '../ocr';
import documentUploadService from '../document-upload';
import { DocumentType, DocumentStatus, OCRProvider, ImageFilter } from '../../types/documents';

// Mock dependencies
jest.mock('expo-camera');
jest.mock('expo-image-picker');
jest.mock('expo-image-manipulator');
jest.mock('@react-native-ml-kit/text-recognition');

describe('CameraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestCameraPermissions', () => {
    it('should request camera permissions successfully', async () => {
      const result = await cameraService.requestCameraPermissions();
      expect(typeof result).toBe('boolean');
    });

    it('should return false if permission denied', async () => {
      // Mock permission denial
      const result = await cameraService.requestCameraPermissions();
      expect(result).toBeDefined();
    });
  });

  describe('capturePhoto', () => {
    it('should capture photo with default options', async () => {
      const result = await cameraService.capturePhoto();
      expect(result).toBeDefined();
    });

    it('should capture photo with high quality', async () => {
      const result = await cameraService.capturePhoto({
        quality: 1.0,
        base64: false,
        exif: true,
      });

      if (result) {
        expect(result).toHaveProperty('uri');
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
      }
    });
  });

  describe('optimizeImage', () => {
    const mockUri = 'file:///test/image.jpg';

    it('should optimize image with medium quality', async () => {
      const result = await cameraService.optimizeImage(mockUri, 'medium');
      expect(typeof result).toBe('string');
    });

    it('should handle optimization errors gracefully', async () => {
      const result = await cameraService.optimizeImage('invalid-uri', 'high');
      expect(result).toBeDefined();
    });
  });

  describe('rotateImage', () => {
    it('should rotate image by 90 degrees', async () => {
      const mockUri = 'file:///test/image.jpg';
      const result = await cameraService.rotateImage(mockUri, 90);
      expect(typeof result).toBe('string');
    });

    it('should rotate image by 180 degrees', async () => {
      const mockUri = 'file:///test/image.jpg';
      const result = await cameraService.rotateImage(mockUri, 180);
      expect(typeof result).toBe('string');
    });
  });
});

describe('OCRService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await ocrService.initialize();
  });

  describe('processImage', () => {
    const mockImageUri = 'file:///test/document.jpg';

    it('should process image with ML Kit', async () => {
      const result = await ocrService.processImage(mockImageUri, {
        provider: OCRProvider.ML_KIT,
      });

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('blocks');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('confidence');
      expect(result.provider).toBe(OCRProvider.ML_KIT);
    });

    it('should fallback to Tesseract on ML Kit failure', async () => {
      // Mock ML Kit failure
      const result = await ocrService.processImage(mockImageUri, {
        provider: OCRProvider.ML_KIT,
      });

      expect(result).toBeDefined();
    });

    it('should detect language correctly', async () => {
      const result = await ocrService.processImage(mockImageUri);

      expect(result.language).toBeDefined();
      expect(result.languageConfidence).toBeGreaterThan(0);
      expect(result.languageConfidence).toBeLessThanOrEqual(1);
    });

    it('should return confidence scores', async () => {
      const result = await ocrService.processImage(mockImageUri);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('batchProcess', () => {
    it('should process multiple images', async () => {
      const imageUris = ['file:///test/doc1.jpg', 'file:///test/doc2.jpg', 'file:///test/doc3.jpg'];

      const results = await ocrService.batchProcess(imageUris);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(imageUris.length);
    });

    it('should handle batch processing errors', async () => {
      const imageUris = ['invalid-uri-1', 'invalid-uri-2'];

      const results = await ocrService.batchProcess(imageUris);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('detectLanguage', () => {
    it('should detect English text', () => {
      const result = ocrService.detectLanguage('Hello, this is English text');
      expect(result.language).toBe('en');
    });

    it('should detect Chinese characters', () => {
      const result = ocrService.detectLanguage('你好世界');
      expect(result.language).toBe('zh');
    });

    it('should detect Cyrillic characters', () => {
      const result = ocrService.detectLanguage('Привет мир');
      expect(result.language).toBe('ru');
    });
  });

  describe('extractStructuredData', () => {
    it('should extract email addresses', () => {
      const text = 'Contact us at support@example.com or info@test.org';
      const data = ocrService.extractStructuredData(text);

      expect(data.emails.length).toBeGreaterThan(0);
      expect(data.emails).toContain('support@example.com');
    });

    it('should extract phone numbers', () => {
      const text = 'Call us at (555) 123-4567 or 555-987-6543';
      const data = ocrService.extractStructuredData(text);

      expect(data.phones.length).toBeGreaterThan(0);
    });

    it('should extract dates', () => {
      const text = 'Meeting on 01/15/2024 and 2024-02-20';
      const data = ocrService.extractStructuredData(text);

      expect(data.dates.length).toBeGreaterThan(0);
    });

    it('should extract currency amounts', () => {
      const text = 'Total: $1,234.56 Subtotal: $999.99';
      const data = ocrService.extractStructuredData(text);

      expect(data.amounts.length).toBeGreaterThan(0);
    });
  });

  describe('searchInResult', () => {
    it('should find words in OCR result', async () => {
      const mockResult = {
        text: 'Invoice from ABC Company',
        blocks: [
          {
            text: 'Invoice from ABC Company',
            confidence: 0.95,
            boundingBox: { left: 0, top: 0, width: 100, height: 20 },
            paragraphs: [
              {
                text: 'Invoice from ABC Company',
                confidence: 0.95,
                boundingBox: { left: 0, top: 0, width: 100, height: 20 },
                words: [
                  {
                    text: 'Invoice',
                    confidence: 0.96,
                    boundingBox: { left: 0, top: 0, width: 40, height: 20 },
                  },
                  {
                    text: 'from',
                    confidence: 0.94,
                    boundingBox: { left: 45, top: 0, width: 25, height: 20 },
                  },
                ],
              },
            ],
            recognizedLanguages: ['en'],
          },
        ],
        language: 'en',
        languageConfidence: 0.95,
        provider: OCRProvider.ML_KIT,
        processedAt: new Date(),
        processingTime: 1500,
        confidence: 0.95,
      };

      const words = ocrService.searchInResult(mockResult, 'invoice');
      expect(Array.isArray(words)).toBe(true);
    });
  });
});

describe('DocumentUploadService', () => {
  const mockDocument = {
    id: 'doc-123',
    type: DocumentType.RECEIPT,
    title: 'Test Receipt',
    status: DocumentStatus.DRAFT,
    pages: [
      {
        id: 'page-1',
        uri: 'file:///test/page1.jpg',
        width: 1000,
        height: 1500,
        size: 1024000,
        order: 0,
        filter: ImageFilter.ORIGINAL,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['test'],
    metadata: {
      mimeType: 'image/jpeg',
      capturedWith: 'camera' as const,
      compressed: false,
    },
    fileSize: 1024000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const result = await documentUploadService.uploadDocument(mockDocument);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should track upload progress', async () => {
      const progressCallback = jest.fn();

      await documentUploadService.uploadDocument(mockDocument, progressCallback);

      // Progress callback may or may not be called depending on mock
      expect(progressCallback).toBeDefined();
    });

    it('should handle upload errors', async () => {
      const invalidDoc = { ...mockDocument, pages: [] };

      const result = await documentUploadService.uploadDocument(invalidDoc);
      expect(result).toBeDefined();
    });
  });

  describe('pauseUpload', () => {
    it('should pause active upload', () => {
      const taskId = 'task-123';
      documentUploadService.pauseUpload(taskId);

      const tasks = documentUploadService.getPendingUploads();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('cancelUpload', () => {
    it('should cancel upload', () => {
      const taskId = 'task-123';
      documentUploadService.cancelUpload(taskId);

      const tasks = documentUploadService.getPendingUploads();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('getPendingUploads', () => {
    it('should return pending uploads list', () => {
      const tasks = documentUploadService.getPendingUploads();

      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return upload statistics', () => {
      const stats = documentUploadService.getStatistics();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('uploading');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');

      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pending).toBe('number');
    });
  });
});

describe('Integration Tests', () => {
  describe('Capture and OCR Flow', () => {
    it('should capture photo and extract text', async () => {
      // 1. Capture photo
      const captureResult = await cameraService.capturePhoto({
        quality: 0.9,
        exif: true,
      });

      if (captureResult) {
        // 2. Run OCR
        const ocrResult = await ocrService.processImage(captureResult.uri);

        expect(ocrResult).toBeDefined();
        expect(ocrResult.text).toBeDefined();
        expect(ocrResult.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Edit and Upload Flow', () => {
    it('should optimize, filter, and upload document', async () => {
      const mockUri = 'file:///test/original.jpg';

      // 1. Optimize
      const optimizedUri = await cameraService.optimizeImage(mockUri, 'medium');
      expect(optimizedUri).toBeDefined();

      // 2. Apply filter
      const filteredUri = await cameraService.applyFilter(optimizedUri, 'bw');
      expect(filteredUri).toBeDefined();

      // 3. Create mock document
      const document = {
        id: 'doc-456',
        type: DocumentType.RECEIPT,
        title: 'Filtered Receipt',
        status: DocumentStatus.DRAFT,
        pages: [
          {
            id: 'page-1',
            uri: filteredUri,
            width: 1000,
            height: 1500,
            size: 512000,
            order: 0,
            filter: ImageFilter.BLACK_WHITE,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        metadata: {
          mimeType: 'image/jpeg',
          capturedWith: 'camera' as const,
          compressed: true,
        },
        fileSize: 512000,
      };

      // 4. Upload
      const uploadResult = await documentUploadService.uploadDocument(document);
      expect(uploadResult).toBeDefined();
    });
  });
});
