/**
 * Document Upload API Route
 * POST /api/documents/upload - Upload document files
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { createDocument } from "@/lib/services/document-service";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
import { put } from "@vercel/blob";

/**
 * Maximum file size: 50MB
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Allowed MIME types
 */
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

/**
 * POST /api/documents/upload
 * Upload a document file
 * 
 * Accepts multipart/form-data with:
 * - file: File (required)
 * - tenantId: string (required)
 * - folderId: string (optional)
 * - name: string (optional - defaults to filename)
 * - description: string (optional)
 * - tags: string[] (optional)
 * - category: string (optional)
 * - isConfidential: boolean (optional)
 * - accessLevel: string (optional)
 */
export const POST = withRoleAuth('member', async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `doc-upload:${userId}`,
      RATE_LIMITS.DOCUMENT_UPLOAD
    );

    if (!rateLimitResult.allowed) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/upload',
        method: 'POST',
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        dataType: 'DOCUMENTS',
        details: { 
          resetIn: rateLimitResult.resetIn 
        },
      });
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many upload requests. Please try again in ${rateLimitResult.resetIn} seconds.`,
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;
    const folderId = formData.get("folderId") as string | null;
    const name = (formData.get("name") as string) || file?.name;
    const description = formData.get("description") as string | null;
    const tagsString = formData.get("tags") as string | null;
    const tags = tagsString ? JSON.parse(tagsString) : null;
    const category = formData.get("category") as string | null;
    const isConfidential = formData.get("isConfidential") === "true";
    const accessLevel = (formData.get("accessLevel") as string) || "standard";

    // Validation
    if (!file) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/upload',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'File is required' },
      });
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!tenantId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/upload',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'tenantId is required' },
      });
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Verify organization ID matches context
    if (tenantId !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/upload',
        method: 'POST',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch' },
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/upload',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { 
          reason: 'File too large',
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE 
        },
      });
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/upload',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { 
          reason: 'Invalid file type',
          fileType: file.type 
        },
      });
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob Storage
    const blob = await put(
      `documents/${organizationId}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      }
    );

    // Create document record
    const document = await createDocument({
      tenantId,
      folderId: folderId || null,
      name,
      fileUrl: blob.url,
      fileSize: file.size,
      fileType: file.name.split(".").pop() || "unknown",
      mimeType: file.type,
      description: description || null,
      tags: tags || null,
      category: category || null,
      contentText: null,
      isConfidential,
      accessLevel: accessLevel as "standard" | "restricted" | "confidential",
      uploadedBy: userId,
      metadata: {
        originalFileName: file.name,
        uploadedAt: new Date().toISOString(),
        blobKey: blob.pathname,
      },
    });

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/documents/upload',
      method: 'POST',
      eventType: 'success',
      severity: 'medium',
      dataType: 'DOCUMENTS',
      details: {
        tenantId,
        documentId: document.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/documents/upload',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
