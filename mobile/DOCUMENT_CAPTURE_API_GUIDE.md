# Document Capture API Integration Guide

## Overview

This guide explains how to integrate the mobile document capture system with your backend API.

## API Endpoints Required

### 1. Document Upload

**POST** `/api/documents/upload`

Upload a document with multiple pages and metadata.

**Request Format**: `multipart/form-data`

**Headers**:

```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Body Parameters**:

```typescript
{
  title: string;              // Document title
  type: DocumentType;         // Document type enum
  description?: string;       // Optional description
  claimId?: string;          // Optional claim ID
  tags: string[];            // Array of tags (JSON string)
  metadata: string;          // Document metadata (JSON string)
  ocrText?: string;          // Extracted OCR text
  pages: File[];             // Array of image files
  page_0_metadata: string;   // Page 0 metadata (JSON)
  page_1_metadata: string;   // Page 1 metadata (JSON)
  // ... more page metadata as needed
}
```

**Response**:

```typescript
{
  id: string;                // Server-generated document ID
  url: string;               // Document URL
  thumbnailUrl?: string;     // Thumbnail URL
  status: DocumentStatus;    // Processing status
  pages: [{
    id: string;
    url: string;
    thumbnailUrl: string;
    order: number;
  }];
}
```

**Example Backend Implementation** (Node.js/Express):

```typescript
import multer from 'multer';
import { Router } from 'express';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/documents/upload', upload.array('pages', 20), async (req, res) => {
  try {
    const { title, type, description, claimId, tags, metadata, ocrText } = req.body;

    const files = req.files as Express.Multer.File[];

    // Process each page
    const pages = await Promise.all(
      files.map(async (file, index) => {
        const pageMetadata = JSON.parse(req.body[`page_${index}_metadata`]);

        // Store file (S3, local, etc.)
        const url = await storeFile(file);
        const thumbnailUrl = await generateThumbnail(file);

        return {
          id: generateId(),
          url,
          thumbnailUrl,
          order: pageMetadata.order,
          filter: pageMetadata.filter,
          ocrResult: pageMetadata.ocrResult,
        };
      })
    );

    // Create document record
    const document = await db.documents.create({
      userId: req.user.id,
      title,
      type,
      description,
      claimId,
      tags: JSON.parse(tags),
      metadata: JSON.parse(metadata),
      ocrText,
      pages,
      status: 'completed',
    });

    res.json({
      id: document.id,
      url: document.url,
      thumbnailUrl: pages[0].thumbnailUrl,
      status: document.status,
      pages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 2. OCR Processing (Server-side)

**POST** `/api/ocr/process`

Process image for text extraction using server-side OCR.

**Request Format**: `multipart/form-data`

**Body Parameters**:

```typescript
{
  image: File;               // Image file
  language?: string;         // Language code (default: 'en')
  detectTables?: boolean;    // Enable table detection
  detectHandwriting?: boolean; // Enable handwriting recognition
}
```

**Response**:

```typescript
{
  text: string;              // Extracted text
  blocks: OCRBlock[];        // Text blocks with positions
  language: string;          // Detected language
  confidence: number;        // Overall confidence (0-1)
  languageConfidence: number; // Language detection confidence
  processingTime: number;    // Processing time in ms
}
```

**Example Backend Implementation**:

```typescript
import Tesseract from 'tesseract.js';
import { Router } from 'express';
import multer from 'multer';

const upload = multer({ dest: 'temp/' });
const router = Router();

router.post('/ocr/process', upload.single('image'), async (req, res) => {
  try {
    const { language = 'eng', detectTables, detectHandwriting } = req.body;
    const imagePath = req.file.path;

    const startTime = Date.now();

    // Use Tesseract or other OCR service
    const { data } = await Tesseract.recognize(imagePath, language, {
      logger: (m) => console.log(m),
    });

    const processingTime = Date.now() - startTime;

    // Convert to our format
    const blocks = data.blocks.map((block) => ({
      text: block.text,
      confidence: block.confidence / 100,
      boundingBox: {
        left: block.bbox.x0,
        top: block.bbox.y0,
        width: block.bbox.x1 - block.bbox.x0,
        height: block.bbox.y1 - block.bbox.y0,
      },
      paragraphs: block.paragraphs.map((para) => ({
        text: para.text,
        confidence: para.confidence / 100,
        boundingBox: convertBBox(para.bbox),
        words: para.words.map((word) => ({
          text: word.text,
          confidence: word.confidence / 100,
          boundingBox: convertBBox(word.bbox),
        })),
      })),
      recognizedLanguages: [language],
    }));

    res.json({
      text: data.text,
      blocks,
      language: data.lang || 'en',
      confidence: data.confidence / 100,
      languageConfidence: 0.95,
      processingTime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Get Documents

**GET** `/api/documents`

Retrieve user's documents with filtering.

**Query Parameters**:

```typescript
{
  limit?: number;            // Max results (default: 50)
  offset?: number;           // Pagination offset
  type?: DocumentType;       // Filter by type
  status?: DocumentStatus;   // Filter by status
  claimId?: string;          // Filter by claim
  search?: string;           // Full-text search
  dateFrom?: string;         // Date range start
  dateTo?: string;           // Date range end
}
```

**Response**:

```typescript
{
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}
```

### 4. Get Document by ID

**GET** `/api/documents/:id`

Get single document with all details.

**Response**:

```typescript
{
  id: string;
  title: string;
  type: DocumentType;
  description?: string;
  status: DocumentStatus;
  pages: DocumentPage[];
  createdAt: string;
  updatedAt: string;
  uploadedAt?: string;
  tags: string[];
  metadata: object;
  ocrText?: string;
  language?: string;
  confidence?: number;
  userId: string;
  claimId?: string;
}
```

### 5. Update Document

**PATCH** `/api/documents/:id`

Update document metadata.

**Body**:

```typescript
{
  title?: string;
  description?: string;
  tags?: string[];
  status?: DocumentStatus;
  ocrText?: string;
}
```

**Response**: Updated document object

### 6. Delete Document

**DELETE** `/api/documents/:id`

Delete document and all associated files.

**Response**:

```typescript
{
  success: boolean;
  message: string;
}
```

## Mobile Service Configuration

Update `mobile/src/services/api.ts`:

```typescript
import axios from 'axios';
import { getToken } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiService = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiService.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.log('Unauthorized - redirect to login');
    }
    return Promise.reject(error);
  }
);

export default apiService;
```

## Data Models

### Backend Database Schema

**Documents Table** (PostgreSQL example):

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  claim_id UUID REFERENCES claims(id),
  tags TEXT[],
  metadata JSONB,
  ocr_text TEXT,
  language VARCHAR(10),
  confidence DECIMAL(3,2),
  file_size BIGINT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  uploaded_at TIMESTAMP,
  processed_at TIMESTAMP,

  INDEX idx_documents_user_id (user_id),
  INDEX idx_documents_claim_id (claim_id),
  INDEX idx_documents_type (type),
  INDEX idx_documents_status (status),
  INDEX idx_documents_created_at (created_at)
);

CREATE TABLE document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  size BIGINT,
  order INTEGER NOT NULL,
  filter VARCHAR(50),
  ocr_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_pages_document_id (document_id),
  INDEX idx_pages_order (document_id, order)
);

-- Full-text search
CREATE INDEX idx_documents_ocr_text ON documents
  USING gin(to_tsvector('english', ocr_text));
```

## Webhook Events (Optional)

If using async processing, implement webhooks:

### Document Processing Complete

**POST** `<client_webhook_url>`

```typescript
{
  event: 'document.processing.complete',
  documentId: string,
  status: 'completed' | 'failed',
  ocrText?: string,
  confidence?: number,
  error?: string,
  timestamp: string,
}
```

## Security Considerations

### 1. Authentication

```typescript
// Verify JWT token
router.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

### 2. Authorization

```typescript
// Check document ownership
router.get('/documents/:id', async (req, res) => {
  const document = await db.documents.findOne({
    id: req.params.id,
    userId: req.user.id, // Ensure user owns document
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json(document);
});
```

### 3. File Validation

```typescript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 20, // Max 20 pages
  },
  fileFilter,
});
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per window
  message: 'Too many uploads, please try again later',
});

router.post('/documents/upload', uploadLimiter, upload.array('pages'), ...);
```

## File Storage Options

### 1. AWS S3

```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `documents/${Date.now()}-${file.originalname}`,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}
```

### 2. Google Cloud Storage

```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE,
});

const bucket = storage.bucket(process.env.GCS_BUCKET);

async function uploadToGCS(file: Express.Multer.File): Promise<string> {
  const blob = bucket.file(`documents/${Date.now()}-${file.originalname}`);

  await blob.save(fs.readFileSync(file.path), {
    metadata: {
      contentType: file.mimetype,
    },
  });

  return `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
}
```

## Testing the API

### Using curl

**Upload Document**:

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Receipt" \
  -F "type=receipt" \
  -F "tags=[\"expense\",\"2024\"]" \
  -F "metadata={\"capturedWith\":\"camera\"}" \
  -F "pages=@/path/to/image1.jpg" \
  -F "pages=@/path/to/image2.jpg" \
  -F "page_0_metadata={\"order\":0,\"filter\":\"original\"}" \
  -F "page_1_metadata={\"order\":1,\"filter\":\"bw\"}"
```

**Get Documents**:

```bash
curl -X GET "http://localhost:3000/api/documents?limit=10&type=receipt" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Process OCR**:

```bash
curl -X POST http://localhost:3000/api/ocr/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/document.jpg" \
  -F "language=eng"
```

## Performance Optimization

### 1. Async Processing

```typescript
import Queue from 'bull';

const ocrQueue = new Queue('ocr-processing', {
  redis: process.env.REDIS_URL,
});

// Add to queue
router.post('/documents/upload', async (req, res) => {
  // ... save document

  // Queue OCR processing
  await ocrQueue.add({
    documentId: document.id,
    pages: document.pages,
  });

  res.json({ id: document.id, status: 'processing' });
});

// Process queue
ocrQueue.process(async (job) => {
  const { documentId, pages } = job.data;

  for (const page of pages) {
    const ocrResult = await processOCR(page.url);
    await db.pages.update(page.id, { ocrResult });
  }

  // Send webhook
  await sendWebhook('document.processing.complete', documentId);
});
```

### 2. Caching

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

router.get('/documents/:id', async (req, res) => {
  const cacheKey = `document:${req.params.id}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Fetch from DB
  const document = await db.documents.findById(req.params.id);

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(document));

  res.json(document);
});
```

### 3. Image Optimization

```typescript
import sharp from 'sharp';

async function optimizeImage(inputPath: string): Promise<Buffer> {
  return sharp(inputPath)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function generateThumbnail(inputPath: string): Promise<Buffer> {
  return sharp(inputPath)
    .resize(200, 200, {
      fit: 'cover',
    })
    .jpeg({ quality: 70 })
    .toBuffer();
}
```

## Error Handling

```typescript
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files (max 20)' });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});
```

## Monitoring

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

router.post('/documents/upload', async (req, res) => {
  logger.info('Document upload started', {
    userId: req.user.id,
    fileCount: req.files.length,
  });

  // ... process upload

  logger.info('Document upload completed', {
    userId: req.user.id,
    documentId: document.id,
    processingTime: Date.now() - startTime,
  });
});
```

### Metrics

```typescript
import prometheus from 'prom-client';

const uploadCounter = new prometheus.Counter({
  name: 'documents_uploaded_total',
  help: 'Total number of documents uploaded',
});

const uploadDuration = new prometheus.Histogram({
  name: 'document_upload_duration_seconds',
  help: 'Duration of document uploads',
});

router.post('/documents/upload', async (req, res) => {
  const end = uploadDuration.startTimer();

  try {
    // ... process upload
    uploadCounter.inc();
    end();
  } catch (error) {
    end();
    throw error;
  }
});
```

---

This API integration guide provides everything needed to connect your mobile document capture system to a backend API with production-ready features including security, performance optimization, and monitoring.
