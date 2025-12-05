/**
 * Member Document Upload API Route
 * Upload personal documents to Vercel Blob Storage
 */
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { memberDocuments } from '@/db/schema/member-documents-schema';
import { logger } from '@/lib/logger';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    // Validate inputs
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        logger.warn('File size exceeds maximum', {
          userId,
          fileName: file.name,
          fileSize: file.size,
        });
        continue;
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        logger.warn('File type not allowed', {
          userId,
          fileName: file.name,
          fileType: file.type,
        });
        continue;
      }

      // Upload to Vercel Blob Storage
      const blob = await put(`portal/${userId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      });

      // Save document metadata to database
      const [document] = await db
        .insert(memberDocuments)
        .values({
          userId,
          fileName: file.name,
          fileUrl: blob.url,
          fileSize: file.size,
          fileType: file.type,
          category: 'General', // Default category
          uploadedAt: new Date(),
        })
        .returning();

      uploadedDocuments.push({
        id: document.id,
        name: document.fileName,
        type: document.fileType,
        category: document.category || 'General',
        uploadDate: document.uploadedAt,
        size: document.fileSize,
        url: document.fileUrl,
      });

      logger.info('Document uploaded successfully', {
        userId,
        documentId: document.id,
        fileName: file.name,
      });
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
    });
  } catch (error) {
    logger.error('Failed to upload documents', error as Error, {
      userId: (await auth()).userId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
