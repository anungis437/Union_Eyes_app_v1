/**
 * OCR Service
 * Text extraction from images using multiple OCR providers
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import { createWorker } from 'tesseract.js';
import {
  OCRResult,
  OCRProvider,
  OCROptions,
  OCRBlock,
  OCRParagraph,
  OCRWord,
  BoundingBox,
} from '../types/documents';
import { OCR_CONFIG, LANGUAGE_MAPPINGS, PERFORMANCE_THRESHOLDS } from '../config/ocr';
import apiService from './api';
import { Platform } from 'react-native';

class OCRService {
  private tesseractWorker: any = null;
  private isInitialized = false;
  private processingQueue: Map<string, Promise<OCRResult>> = new Map();

  /**
   * Initialize OCR service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Tesseract worker for fallback
      if (OCR_CONFIG.providers.tesseract.enabled && Platform.OS !== 'ios') {
        // Note: Tesseract.js works best on web and Android
        // For iOS, rely on ML Kit
      }

      this.isInitialized = true;
      console.log('OCR Service initialized');
    } catch (error) {
      console.error('Error initializing OCR service:', error);
    }
  }

  /**
   * Process image with OCR
   */
  async processImage(imageUri: string, options: OCROptions = {}): Promise<OCRResult> {
    // Check if already processing this image
    if (this.processingQueue.has(imageUri)) {
      return this.processingQueue.get(imageUri)!;
    }

    const processingPromise = this._processImage(imageUri, options);
    this.processingQueue.set(imageUri, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(imageUri);
    }
  }

  /**
   * Internal processing method
   */
  private async _processImage(imageUri: string, options: OCROptions = {}): Promise<OCRResult> {
    const startTime = Date.now();
    const provider = options.provider || OCR_CONFIG.defaultProvider;

    try {
      let result: OCRResult;

      switch (provider) {
        case OCRProvider.ML_KIT:
          result = await this.processWithMLKit(imageUri, options);
          break;

        case OCRProvider.TESSERACT:
          result = await this.processWithTesseract(imageUri, options);
          break;

        case OCRProvider.SERVER:
          result = await this.processWithServer(imageUri, options);
          break;

        default:
          throw new Error(`Unknown OCR provider: ${provider}`);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      // Log performance
      if (processingTime > PERFORMANCE_THRESHOLDS.slowProcessing) {
        console.warn(`Slow OCR processing: ${processingTime}ms with ${provider}`);
      }

      return result;
    } catch (error) {
      console.error(`OCR processing failed with ${provider}:`, error);

      // Try fallback provider
      if (provider !== OCR_CONFIG.fallbackProvider) {
        console.log(`Trying fallback provider: ${OCR_CONFIG.fallbackProvider}`);
        return this.processWithFallback(imageUri, options);
      }

      throw error;
    }
  }

  /**
   * Process with Google ML Kit (on-device, fast)
   */
  private async processWithMLKit(imageUri: string, options: OCROptions): Promise<OCRResult> {
    try {
      if (!OCR_CONFIG.providers.mlKit.enabled) {
        throw new Error('ML Kit is not enabled');
      }

      const result = await TextRecognition.recognize(imageUri);

      // Convert ML Kit result to our format
      const blocks: OCRBlock[] = result.blocks.map((block) => ({
        text: block.text,
        confidence: 0.8,
        boundingBox: this.convertMLKitBoundingBox(block.frame),
        paragraphs: block.lines.map(
          (line): OCRParagraph => ({
            text: line.text,
            confidence: 0.8,
            boundingBox: this.convertMLKitBoundingBox(line.frame),
            words: line.elements.map(
              (element): OCRWord => ({
                text: element.text,
                confidence: 0.8, // ML Kit doesn't provide word-level confidence
                boundingBox: this.convertMLKitBoundingBox(element.frame),
              })
            ),
          })
        ),
        recognizedLanguages: block.recognizedLanguages.map((lang) => lang.languageCode),
      }));

      const text = result.text;
      const language = result.blocks[0]?.recognizedLanguages[0]?.languageCode || 'en';
      const languageConfidence = 0.8;

      // Calculate average confidence
      const avgConfidence =
        blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length || 0;

      return {
        text,
        blocks,
        language,
        languageConfidence,
        provider: OCRProvider.ML_KIT,
        processedAt: new Date(),
        processingTime: 0, // Will be set by caller
        confidence: avgConfidence,
      };
    } catch (error) {
      console.error('ML Kit OCR failed:', error);
      throw error;
    }
  }

  /**
   * Process with Tesseract.js (fallback, slower but works offline)
   */
  private async processWithTesseract(imageUri: string, options: OCROptions): Promise<OCRResult> {
    try {
      if (!OCR_CONFIG.providers.tesseract.enabled) {
        throw new Error('Tesseract is not enabled');
      }

      // Initialize worker if not already done
      if (!this.tesseractWorker) {
        this.tesseractWorker = await createWorker();
        const language = this.getTesseractLanguage(options.language || 'en');
        await this.tesseractWorker.loadLanguage(language);
        await this.tesseractWorker.initialize(language);
      }

      const { data } = await this.tesseractWorker.recognize(imageUri);

      // Convert Tesseract result to our format
      const blocks: OCRBlock[] = data.blocks.map((block: any) => ({
        text: block.text,
        confidence: block.confidence / 100,
        boundingBox: this.convertTesseractBoundingBox(block.bbox),
        paragraphs: block.paragraphs.map(
          (para: any): OCRParagraph => ({
            text: para.text,
            confidence: para.confidence / 100,
            boundingBox: this.convertTesseractBoundingBox(para.bbox),
            words: para.words.map(
              (word: any): OCRWord => ({
                text: word.text,
                confidence: word.confidence / 100,
                boundingBox: this.convertTesseractBoundingBox(word.bbox),
              })
            ),
          })
        ),
        recognizedLanguages: [data.lang || 'eng'],
      }));

      return {
        text: data.text,
        blocks,
        language: this.getLanguageCode(data.lang || 'eng'),
        languageConfidence: data.confidence / 100,
        provider: OCRProvider.TESSERACT,
        processedAt: new Date(),
        processingTime: 0,
        confidence: data.confidence / 100,
      };
    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      throw error;
    }
  }

  /**
   * Process with server-side OCR (most accurate, requires internet)
   */
  private async processWithServer(imageUri: string, options: OCROptions): Promise<OCRResult> {
    try {
      if (!OCR_CONFIG.providers.server.enabled) {
        throw new Error('Server OCR is not enabled');
      }

      // Upload image and get OCR result
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'document.jpg',
      } as any);

      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.detectTables) {
        formData.append('detectTables', 'true');
      }
      if (options.detectHandwriting) {
        formData.append('detectHandwriting', 'true');
      }

      const response = await apiService.post(OCR_CONFIG.providers.server.endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(OCR_CONFIG.providers.server.apiKey && {
            'X-API-Key': OCR_CONFIG.providers.server.apiKey,
          }),
        },
        timeout: OCR_CONFIG.providers.server.timeout,
      });

      const data = response.data;

      return {
        text: data.text,
        blocks: data.blocks,
        language: data.language,
        languageConfidence: data.languageConfidence,
        provider: OCRProvider.SERVER,
        processedAt: new Date(),
        processingTime: data.processingTime || 0,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error('Server OCR failed:', error);
      throw error;
    }
  }

  /**
   * Process with fallback provider
   */
  private async processWithFallback(imageUri: string, options: OCROptions): Promise<OCRResult> {
    return this._processImage(imageUri, {
      ...options,
      provider: OCR_CONFIG.fallbackProvider,
    });
  }

  /**
   * Batch process multiple images
   */
  async batchProcess(imageUris: string[], options: OCROptions = {}): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    // Process in parallel with limit
    const batchSize = 3; // Process 3 at a time
    for (let i = 0; i < imageUris.length; i += batchSize) {
      const batch = imageUris.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((uri) =>
          this.processImage(uri, options).catch((err) => {
            console.error('Batch OCR failed for image:', uri, err);
            return null;
          })
        )
      );

      results.push(...batchResults.filter((r): r is OCRResult => r !== null));
    }

    return results;
  }

  /**
   * Detect language from text
   */
  detectLanguage(text: string): { language: string; confidence: number } {
    // Simple language detection based on character sets
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasCyrillic = /[\u0400-\u04FF]/.test(text);
    const hasCJK = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const hasArabic = /[\u0600-\u06FF]/.test(text);

    if (hasCJK) return { language: 'zh', confidence: 0.8 };
    if (hasCyrillic) return { language: 'ru', confidence: 0.8 };
    if (hasArabic) return { language: 'ar', confidence: 0.8 };
    if (hasLatin) return { language: 'en', confidence: 0.7 };

    return { language: 'unknown', confidence: 0.5 };
  }

  /**
   * Extract specific information (emails, phones, dates, etc.)
   */
  extractStructuredData(text: string): {
    emails: string[];
    phones: string[];
    dates: string[];
    amounts: string[];
    urls: string[];
  } {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b(\+\d{1,2}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
    const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g;
    const amountRegex = /\$\s?\d+([,\.]\d{2,3})*(\.\d{2})?/g;
    const urlRegex = /https?:\/\/[^\s]+/g;

    return {
      emails: text.match(emailRegex) || [],
      phones: text.match(phoneRegex) || [],
      dates: text.match(dateRegex) || [],
      amounts: text.match(amountRegex) || [],
      urls: text.match(urlRegex) || [],
    };
  }

  /**
   * Search text in OCR result
   */
  searchInResult(result: OCRResult, query: string): OCRWord[] {
    const words: OCRWord[] = [];
    const lowerQuery = query.toLowerCase();

    for (const block of result.blocks) {
      for (const paragraph of block.paragraphs) {
        for (const word of paragraph.words) {
          if (word.text.toLowerCase().includes(lowerQuery)) {
            words.push(word);
          }
        }
      }
    }

    return words;
  }

  /**
   * Convert ML Kit bounding box to our format
   */
  private convertMLKitBoundingBox(frame: any): BoundingBox {
    return {
      left: frame.x || 0,
      top: frame.y || 0,
      width: frame.width || 0,
      height: frame.height || 0,
    };
  }

  /**
   * Convert Tesseract bounding box to our format
   */
  private convertTesseractBoundingBox(bbox: any): BoundingBox {
    return {
      left: bbox.x0,
      top: bbox.y0,
      width: bbox.x1 - bbox.x0,
      height: bbox.y1 - bbox.y0,
    };
  }

  /**
   * Get Tesseract language code
   */
  private getTesseractLanguage(languageCode: string): string {
    const mapping = LANGUAGE_MAPPINGS[languageCode];
    return mapping?.tesseract || 'eng';
  }

  /**
   * Get standard language code from Tesseract
   */
  private getLanguageCode(tesseractLang: string): string {
    const entry = Object.entries(LANGUAGE_MAPPINGS).find(
      ([_, mapping]) => mapping.tesseract === tesseractLang
    );
    return entry?.[0] || 'en';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.tesseractWorker) {
        await this.tesseractWorker.terminate();
        this.tesseractWorker = null;
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error cleaning up OCR service:', error);
    }
  }
}

export default new OCRService();

