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

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { id } = params;

      // Fetch note
      const note = await getBargainingNoteById(id);

      if (!note) {
        return NextResponse.json({ error: "Bargaining note not found" }, { status: 404 });
      }

      return NextResponse.json({ note });
    } catch (error) {
      console.error("Error fetching bargaining note:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { id } = params;
      const body = await request.json();

      // Check for special action: addAttachment
      if (body.action === "addAttachment" && body.attachment) {
        const { filename, url, fileType } = body.attachment;

        if (!filename || !url || !fileType) {
          return NextResponse.json(
            { error: "filename, url, and fileType are required for attachment" },
            { status: 400 }
          );
        }

        const updatedNote = await addAttachmentToNote(id, {
          filename,
          url,
          fileType
        });

        if (!updatedNote) {
          return NextResponse.json({ error: "Bargaining note not found" }, { status: 404 });
        }

        return NextResponse.json({ note: updatedNote });
      }

      // Regular update
      const updatedNote = await updateBargainingNote(id, {
        ...body,
        lastModifiedBy: userId,
      });

      if (!updatedNote) {
        return NextResponse.json({ error: "Bargaining note not found" }, { status: 404 });
      }

      return NextResponse.json({ note: updatedNote });
    } catch (error) {
      console.error("Error updating bargaining note:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
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
        return NextResponse.json({ error: "Bargaining note not found" }, { status: 404 });
      }

      return NextResponse.json({ 
        message: "Bargaining note deleted successfully",
        deleted: true 
      });
    } catch (error) {
      console.error("Error deleting bargaining note:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request, { params });
};
