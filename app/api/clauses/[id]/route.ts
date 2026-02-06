/**
 * Clause API Routes - Individual clause operations
 * GET /api/clauses/[id] - Get clause by ID
 * PATCH /api/clauses/[id] - Update clause
 * DELETE /api/clauses/[id] - Delete clause
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  getClauseById, 
  updateClause, 
  deleteClause,
  getClauseHierarchy
} from "@/lib/services/clause-service";

/**
 * GET /api/clauses/[id]
 * Fetch a single clause with optional hierarchy
 * 
 * Query params:
 * - includeHierarchy: boolean
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

    const includeHierarchy = searchParams.get("includeHierarchy") === "true";

    if (includeHierarchy) {
      const hierarchy = await getClauseHierarchy(id);
      
      if (!hierarchy.clause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      return NextResponse.json(hierarchy);
    }

    // Fetch clause
    const clause = await getClauseById(id);

    if (!clause) {
      return NextResponse.json({ error: "Clause not found" }, { status: 404 });
    }

    return NextResponse.json({ clause });
  } catch (error) {
    console.error("Error fetching clause:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clauses/[id]
 * Update clause
 * 
 * Body: Partial Clause object
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

    // Update clause
    const updatedClause = await updateClause(id, body);

    if (!updatedClause) {
      return NextResponse.json({ error: "Clause not found" }, { status: 404 });
    }

    return NextResponse.json({ clause: updatedClause });
  } catch (error) {
    console.error("Error updating clause:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clauses/[id]
 * Delete a clause
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

    const success = await deleteClause(id);
    
    if (!success) {
      return NextResponse.json({ error: "Clause not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Clause deleted successfully",
      deleted: true 
    });
  } catch (error) {
    console.error("Error deleting clause:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
