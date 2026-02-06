/**
 * Precedent API Routes - Individual precedent operations
 * GET /api/precedents/[id] - Get precedent by ID
 * PATCH /api/precedents/[id] - Update precedent
 * DELETE /api/precedents/[id] - Delete precedent
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getPrecedentById, 
  updatePrecedent, 
  deletePrecedent,
  getRelatedPrecedents
} from "@/lib/services/precedent-service";

/**
 * GET /api/precedents/[id]
 * Fetch a single precedent
 * 
 * Query params:
 * - includeFullText: boolean
 * - includeRelated: boolean
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
    const { searchParams } = new URL(request.url);

    const includeFullText = searchParams.get("includeFullText") !== "false"; // Default true
    const includeRelated = searchParams.get("includeRelated") === "true";

    // Fetch precedent
    const precedent = await getPrecedentById(id, { 
      includeFullText,
      includeSummary: true
    });

    if (!precedent) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    const response: any = { precedent };

    // Optionally fetch related precedents
    if (includeRelated) {
      const related = await getRelatedPrecedents(id);
      response.relatedPrecedents = related;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching precedent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/precedents/[id]
 * Update precedent
 * 
 * Body: Partial ArbitrationDecision object
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

    // Update precedent
    const updatedPrecedent = await updatePrecedent(id, body);

    if (!updatedPrecedent) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    return NextResponse.json({ precedent: updatedPrecedent });
  } catch (error) {
    console.error("Error updating precedent:", error);
    
    // Handle unique constraint violations
    if ((error as any)?.code === "23505") {
      return NextResponse.json(
        { error: "Case number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/precedents/[id]
 * Delete a precedent
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

    const success = await deletePrecedent(id);
    
    if (!success) {
      return NextResponse.json({ error: "Precedent not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Precedent deleted successfully",
      deleted: true 
    });
  } catch (error) {
    console.error("Error deleting precedent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
