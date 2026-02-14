import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { put } from '@vercel/blob';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { claims } from '@/db/schema/domains/claims';
import { eq } from 'drizzle-orm';
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

interface AttachmentMetadata {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Authenticate user
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const claimId = formData.get('claimId') as string;

      // Validate inputs
      const claimUploadSchema = z.object({
        file: z.object({
          name: z.string().min(1, "File name is required"),
          size: z.number().max(MAX_FILE_SIZE, `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`),
          type: z.enum(ALLOWED_TYPES as [string, ...string[]], {
            errorMap: () => ({ message: "File type not allowed" })
          })
        }),
        claimId: z.string().uuid("Invalid claim ID")
      });

      const validation = claimUploadSchema.safeParse({
        file: file ? { name: file.name, size: file.size, type: file.type } : null,
        claimId
      });

      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          validation.error.errors[0]?.message || "Validation failed"
        );
      }

      if (!file) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "No file provided"
        );
      }

      // Verify claim exists and user has access
      const [claim] = await db
        .select()
        .from(claims)
        .where(eq(claims.claimId, claimId))
        .limit(1);

      if (!claim) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Claim not found'
    );
      }

      // Verify user owns the claim or is assigned to it
      if (claim.memberId !== userId && claim.assignedTo !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized to upload files to this claim' },
          { status: 403 }
        );
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `claims/${claimId}/${timestamp}-${sanitizedFileName}`;

      // Upload to Vercel Blob
      const blob = await put(uniqueFileName, file, {
        access: 'public',
        addRandomSuffix: false,
      });

      // Create attachment metadata
      const attachment: AttachmentMetadata = {
        url: blob.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId,
      };

      // Get current attachments array
      const currentAttachments = (claim.attachments as AttachmentMetadata[]) || [];
      
      // Add new attachment
      const updatedAttachments = [...currentAttachments, attachment];

      // Update claim with new attachments array
      await db
        .update(claims)
        .set({
          attachments: updatedAttachments,
          updatedAt: new Date(),
        })
        .where(eq(claims.claimId, claimId));

      return NextResponse.json({
        success: true,
        attachment,
        message: 'File uploaded successfully',
      });

    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to upload file',
      error
    );
    }
    })(request);
};

// GET endpoint to retrieve attachments for a claim
export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const claimId = searchParams.get('claimId');

      if (!claimId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'claimId is required'
    );
      }

      // Fetch claim
      const [claim] = await db
        .select()
        .from(claims)
        .where(eq(claims.claimId, claimId))
        .limit(1);

      if (!claim) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Claim not found'
    );
      }

      // Verify user has access
      if (claim.memberId !== userId && claim.assignedTo !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        attachments: claim.attachments || [],
        claimId,
      });

    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch attachments',
      error
    );
    }
    })(request);
};

// DELETE endpoint to remove an attachment
export const DELETE = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const claimId = searchParams.get('claimId');
      const fileUrl = searchParams.get('fileUrl');

      if (!claimId || !fileUrl) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'claimId and fileUrl are required'
    );
      }

      // Fetch claim
      const [claim] = await db
        .select()
        .from(claims)
        .where(eq(claims.claimId, claimId))
        .limit(1);

      if (!claim) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Claim not found'
    );
      }

      // Verify user has access
      if (claim.memberId !== userId && claim.assignedTo !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Remove attachment from array
      const currentAttachments = (claim.attachments as AttachmentMetadata[]) || [];
      const updatedAttachments = currentAttachments.filter(
        (att) => att.url !== fileUrl
      );

      // Update claim
      await db
        .update(claims)
        .set({
          attachments: updatedAttachments,
          updatedAt: new Date(),
        })
        .where(eq(claims.claimId, claimId));

      // Note: We don&apos;t delete from Vercel Blob to maintain audit trail
      // Files can be manually cleaned up if needed

      return NextResponse.json({
        success: true,
        message: 'Attachment removed from claim',
      });

    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete attachment',
      error
    );
    }
    })(request);
};

