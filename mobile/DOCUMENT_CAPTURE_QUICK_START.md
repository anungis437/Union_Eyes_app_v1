# Document Capture with OCR - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd mobile
pnpm install
```

This will install all required packages including:

- expo-camera, expo-image-picker, expo-image-manipulator
- @react-native-ml-kit/text-recognition
- tesseract.js
- zustand for state management

### 2. Configure Environment

Create or update `.env` file in `mobile/` directory:

```env
EXPO_PUBLIC_API_URL=https://your-api-url.com
EXPO_PUBLIC_OCR_API_KEY=your_ocr_api_key_here
```

### 3. Platform Setup

#### iOS

```bash
cd ios
pod install
cd ..
```

Add to `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan documents</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select images</string>
```

#### Android

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 4. Run the App

```bash
# iOS
pnpm ios

# Android
pnpm android

# Expo Go
pnpm start
```

## 📱 Basic Usage

### Scan a Document

1. **Open Documents Tab** - Navigate to Documents screen
2. **Tap FAB Button** - Blue camera button in bottom-right
3. **Select Document Type** - Choose from Claim, Receipt, Invoice, etc.
4. **Enable OCR** - Toggle "Extract Text (OCR)" switch
5. **Take Photo** - Tap "Take Photo" or "Choose from Gallery"
6. **Wait for Processing** - OCR runs automatically

### Edit a Document

1. **Capture or select document**
2. **Tap to edit** - Opens editor screen
3. **Apply filters** - B&W, Grayscale, Enhance, Original
4. **Rotate if needed** - 90° rotation button
5. **Add more pages** - Tap "+" button
6. **Save** - Tap "Save" in header

### View OCR Results

1. **After scanning** - Results screen appears automatically
2. **Edit text** - Tap edit button to modify extracted text
3. **Copy text** - Tap "Copy" to copy to clipboard
4. **Share** - Tap "Share" to send via apps
5. **Export** - Choose TXT or PDF format

## 🔍 Advanced Features

### Multi-Page Documents

```typescript
// Capture multiple pages
const document = await captureDocument(DocumentType.CONTRACT, {
  runOCR: true,
  title: 'Multi-page Contract',
});

// Add more pages later
await pickFromGallery(DocumentType.CONTRACT, {
  allowsMultiple: true,
  runOCR: true,
});
```

### Custom OCR Options

```typescript
import { OCRProvider } from '@/src/types/documents';
import ocrService from '@/src/services/ocr';

// Use specific provider
const result = await ocrService.processImage(imageUri, {
  provider: OCRProvider.ML_KIT,
  language: 'es', // Spanish
  detectTables: true,
  detectHandwriting: true,
});

console.log('Text:', result.text);
console.log('Confidence:', result.confidence);
console.log('Language:', result.language);
```

### Batch Processing

```typescript
import ocrService from '@/src/services/ocr';

const imageUris = ['uri1', 'uri2', 'uri3'];
const results = await ocrService.batchProcess(imageUris, {
  provider: OCRProvider.ML_KIT,
});

results.forEach((result, index) => {
  console.log(`Page ${index + 1}:`, result.text);
});
```

### Upload with Progress

```typescript
const { uploadDocument, uploadProgress } = useDocumentUpload();

// Upload with progress tracking
await uploadDocument(document);

// Monitor progress
const progress = uploadProgress.get(document.id);
console.log(`Upload progress: ${progress}%`);
```

### Search Documents

```typescript
const { searchQuery, setSearchQuery, results } = useDocumentSearch();

// Search by text (searches title, description, OCR content)
setSearchQuery('receipt medical');

// Results update automatically
console.log(`Found ${results.length} documents`);
```

### Filter Documents

```typescript
const { filterDocuments } = useDocuments();

const filtered = filterDocuments({
  types: [DocumentType.RECEIPT, DocumentType.INVOICE],
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31'),
  hasOCR: true,
});
```

## 🎯 Common Use Cases

### 1. Receipt Scanning for Expense Claims

```typescript
// Capture receipt
const receipt = await captureDocument(DocumentType.RECEIPT, {
  runOCR: true,
  title: 'Lunch Receipt',
});

// Extract amounts
const amounts = ocrService.extractStructuredData(receipt.ocrText!).amounts;
console.log('Found amounts:', amounts);

// Upload for reimbursement
await uploadDocument(receipt);
```

### 2. Medical Record Management

```typescript
// Scan medical document
const medical = await captureDocument(DocumentType.MEDICAL_RECORD, {
  runOCR: true,
  title: 'Lab Results',
});

// Search for specific terms
const words = ocrService.searchInResult(medical.pages[0].ocrResult!, 'blood pressure');
```

### 3. Contract Processing

```typescript
// Multi-page contract
const contract = await pickFromGallery(DocumentType.CONTRACT, {
  allowsMultiple: true,
  runOCR: true,
});

// Extract contact info
const data = ocrService.extractStructuredData(contract.ocrText!);
console.log('Emails:', data.emails);
console.log('Phones:', data.phones);
console.log('Dates:', data.dates);
```

## 🔧 Customization

### Change OCR Provider Priority

Edit `mobile/src/config/ocr.ts`:

```typescript
export const OCR_CONFIG: OCRConfig = {
  defaultProvider: OCRProvider.SERVER, // Use server by default
  fallbackProvider: OCRProvider.ML_KIT, // Fallback to ML Kit
  // ... other config
};
```

### Add New Document Type

1. Add to enum in `mobile/src/types/documents.ts`:

```typescript
export enum DocumentType {
  // ... existing types
  PASSPORT = 'passport',
  YOUR_NEW_TYPE = 'your_new_type',
}
```

1. Add to scanner UI in `mobile/app/scanner/index.tsx`:

```typescript
const documentTypes = [
  // ... existing types
  { type: DocumentType.YOUR_NEW_TYPE, icon: 'document', label: 'New Type' },
];
```

### Add Custom Filter

Edit `mobile/src/services/camera.ts`:

```typescript
async applyFilter(uri: string, filter: string): Promise<string> {
  // Add your custom filter logic
  if (filter === 'sepia') {
    // Apply sepia filter
  }
  return manipulatedUri;
}
```

## 📊 Performance Tips

### 1. Optimize Image Quality

```typescript
// Use medium quality for faster processing
const document = await captureDocument(DocumentType.RECEIPT, {
  quality: 'medium', // vs 'high' or 'low'
});
```

### 2. Enable Compression

Images are automatically compressed before upload. Adjust in `document-upload.ts`:

```typescript
const COMPRESSION_QUALITY = 0.8; // 80% quality
```

### 3. Batch Upload Limit

Control concurrent uploads in `document-upload.ts`:

```typescript
const maxConcurrent = 3; // Upload 3 files at once
```

### 4. OCR Caching

OCR results are cached automatically. Clear cache if needed:

```typescript
// Cache settings in mobile/src/config/ocr.ts
export const OCR_CACHE = {
  enabled: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100 * 1024 * 1024, // 100 MB
};
```

## 🐛 Troubleshooting

### Camera Not Opening

**Problem**: Camera permission denied
**Solution**:

```typescript
const { requestPermission } = useCameraPermissions();
await requestPermission();
```

### OCR Not Working

**Problem**: No text extracted
**Solutions**:

- Ensure good lighting
- Use B&W filter for better contrast
- Check language matches document
- Try different OCR provider

### Upload Failing

**Problem**: Network error
**Solution**:

```typescript
// Check network status
import networkStatus from '@/src/services/network-status';
const isOnline = await networkStatus.isConnected();
```

### Slow Performance

**Problem**: Large image files
**Solutions**:

- Use 'medium' quality setting
- Enable compression
- Process fewer pages simultaneously

## 📚 API Reference

### Key Services

- `cameraService` - Camera and image manipulation
- `ocrService` - Text extraction
- `documentUploadService` - Upload management
- `documentsStore` - State management

### Key Hooks

- `useDocuments()` - CRUD operations
- `useDocumentCapture()` - Capture with OCR
- `useOCRProcess()` - OCR processing
- `useDocumentUpload()` - Upload with progress

### Key Types

- `Document` - Main document type
- `OCRResult` - OCR response
- `UploadTask` - Upload status
- `DocumentFilters` - Filter options

## 🎓 Best Practices

1. **Always handle permissions** before camera access
2. **Use appropriate quality** settings for use case
3. **Enable OCR** for searchable documents
4. **Add metadata** (tags, description) for better organization
5. **Handle errors gracefully** with user-friendly messages
6. **Test on real devices** (camera doesn't work in simulators)
7. **Monitor performance** with large documents (>10 pages)
8. **Use offline mode** for privacy-sensitive documents

## 🔗 Related Documentation

- [Full Implementation Summary](./DOCUMENT_CAPTURE_OCR_SUMMARY.md)
- [Type Definitions](./src/types/documents.ts)
- [OCR Configuration](./src/config/ocr.ts)
- [Services Documentation](./src/services/)

## 💡 Tips & Tricks

### Quick Scan

```typescript
// One-liner for quick receipt scan
const doc = await captureDocument(DocumentType.RECEIPT, { runOCR: true });
```

### Background Processing

```typescript
// Start OCR and continue with other tasks
processImage(uri).then((result) => {
  console.log('OCR completed:', result.text);
});
```

### Structured Data

```typescript
// Extract structured info from receipts
const { amounts, dates } = ocrService.extractStructuredData(ocrText);
```

## 🆘 Getting Help

- Check error messages in console
- Review TypeScript types for correct usage
- Test with sample documents first
- Enable debug logging in services
- Check network connectivity
- Verify API endpoints and keys

---

## Next Steps

1. ✅ Run the app: `pnpm start`
2. ✅ Scan your first document
3. ✅ Test OCR extraction
4. ✅ Explore edit features
5. ✅ Try multi-page scanning

Happy scanning! 📸
