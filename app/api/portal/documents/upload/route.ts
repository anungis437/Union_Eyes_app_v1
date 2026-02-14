import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Member Document Upload API Route
 * Upload personal documents to Vercel Blob Storage
 */
import { put } from '@vercel/blob';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberDocuments } from '@/db/schema/domains/documents';
import { logger } from '@/lib/logger';
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
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

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Authenticate user
      // Parse form data
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];

      // Validate inputs
      const portalUploadSchema = z.object({
        files: z.array(
          z.object({
            name: z.string().min(1, "File name is required"),
            size: z.number().max(MAX_FILE_SIZE, `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`),
            type: z.enum(ALLOWED_TYPES as [string, ...string[]], {
              errorMap: () => ({ message: "File type not allowed" })
            })
          })
        ).min(1, "At least one file is required").max(10, "Maximum 10 files allowed")
      });

      const validation = portalUploadSchema.safeParse({
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
      });

      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validation.error.errors[0]?.message || "Validation failed"
        );
      }

      if (!files || files.length === 0) {
        return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'No files provided');
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
        userId: userId,
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
  }
  })(request);
};

