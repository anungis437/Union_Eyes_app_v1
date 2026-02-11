import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Bargaining Note API Routes - Individual note operations
 * GET /api/bargaining-notes/[id] - Get note by ID
 * PATCH /api/bargaining-notes/[id] - Update note
 * DELETE /api/bargaining-notes/[id] - Delete note
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getBargainingNoteById, 
  updateBargainingNote, 
  deleteBargainingNote,
  addAttachmentToNote
} from "@/lib/services/bargaining-notes-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { id } = params;

      // Fetch note
      const note = await getBargainingNoteById(id);

      if (!note) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Bargaining note not found'
    );
      }

      return NextResponse.json({ note });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};


const bargaining-notesSchema = z.object({
  filename: z.string().min(1, 'filename is required'),
  url: z.string().url('Invalid URL'),
  fileType: z.unknown().optional(),
  action: z.unknown().optional(),
  attachment: z.unknown().optional(),
});

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { id } = params;
      const body = await request.json();
    // Validate request body
    const validation = bargaining-notesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { filename, url, fileType, action, attachment } = validation.data;

      // Check for special action: addAttachment
      if (body.action === "addAttachment" && body.attachment) {
        const { filename, url, fileType } = body.attachment;

        if (!filename || !url || !fileType) {
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'filename, url, and fileType are required for attachment'
      // TODO: Migrate additional details: url, and fileType are required for attachment"
    );
        }

        const updatedNote = await addAttachmentToNote(id, {
          filename,
          url,
          fileType
        });

        if (!updatedNote) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Bargaining note not found'
    );
        }

        return NextResponse.json({ note: updatedNote });
      }

      // Regular update
      const updatedNote = await updateBargainingNote(id, {
        ...body,
        lastModifiedBy: userId,
      });

      if (!updatedNote) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Bargaining note not found'
    );
      }

      return NextResponse.json({ note: updatedNote });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { id } = params;

      const success = await deleteBargainingNote(id);
      
      if (!success) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Bargaining note not found'
    );
      }

      return NextResponse.json({ 
        message: "Bargaining note deleted successfully",
        deleted: true 
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};
