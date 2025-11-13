import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { claims } from '@/db/schema/claims-schema';
import { eq } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const claimId = formData.get('claimId') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!claimId) {
      return NextResponse.json(
        { error: 'claimId is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Verify claim exists and user has access
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimId, claimId))
      .limit(1);

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
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
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claimId));

    return NextResponse.json({
      success: true,
      attachment,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve attachments for a claim
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('claimId');

    if (!claimId) {
      return NextResponse.json(
        { error: 'claimId is required' },
        { status: 400 }
      );
    }

    // Fetch claim
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimId, claimId))
      .limit(1);

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
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
    console.error('Fetch attachments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove an attachment
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('claimId');
    const fileUrl = searchParams.get('fileUrl');

    if (!claimId || !fileUrl) {
      return NextResponse.json(
        { error: 'claimId and fileUrl are required' },
        { status: 400 }
      );
    }

    // Fetch claim
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimId, claimId))
      .limit(1);

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
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
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claimId));

    // Note: We don't delete from Vercel Blob to maintain audit trail
    // Files can be manually cleaned up if needed

    return NextResponse.json({
      success: true,
      message: 'Attachment removed from claim',
    });

  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
