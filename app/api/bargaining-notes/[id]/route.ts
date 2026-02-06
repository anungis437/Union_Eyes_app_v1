/**
 * Bargaining Note API Routes - Individual note operations
 * GET /api/bargaining-notes/[id] - Get note by ID
 * PATCH /api/bargaining-notes/[id] - Update note
 * DELETE /api/bargaining-notes/[id] - Delete note
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getBargainingNoteById, 
  updateBargainingNote, 
  deleteBargainingNote,
  addAttachmentToNote
} from "@/lib/services/bargaining-notes-service";

/**
 * GET /api/bargaining-notes/[id]
 * Fetch a single bargaining note
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}

/**
 * PATCH /api/bargaining-notes/[id]
 * Update bargaining note
 * 
 * Body: Partial BargainingNote object
 * Special action: addAttachment - add an attachment to the note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}

/**
 * DELETE /api/bargaining-notes/[id]
 * Delete a bargaining note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}
