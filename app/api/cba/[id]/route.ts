import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { collectiveAgreements, cbaClause, cbaContacts, cbaVersionHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/cba/[id]
 * Fetch a single CBA with all related data (clauses, contacts, version history)
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

    // Fetch CBA
    const [cba] = await db
      .select()
      .from(collectiveAgreements)
      .where(eq(collectiveAgreements.id, id))
      .limit(1);

    if (!cba) {
      return NextResponse.json({ error: "CBA not found" }, { status: 404 });
    }

    // Fetch all clauses for this CBA
    const clauses = await db
      .select()
      .from(cbaClause)
      .where(eq(cbaClause.cbaId, id))
      .orderBy(cbaClause.orderIndex, desc(cbaClause.clauseNumber));

    // Fetch contacts
    const contacts = await db
      .select()
      .from(cbaContacts)
      .where(eq(cbaContacts.cbaId, id));

    // Fetch version history
    const versionHistory = await db
      .select()
      .from(cbaVersionHistory)
      .where(eq(cbaVersionHistory.cbaId, id))
      .orderBy(desc(cbaVersionHistory.createdAt));

    return NextResponse.json({
      cba,
      clauses,
      contacts,
      versionHistory,
    });
  } catch (error) {
    console.error("Error fetching CBA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cba/[id]
 * Update CBA metadata
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

    // Update CBA
    const [updatedCba] = await db
      .update(collectiveAgreements)
      .set({
        ...body,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(collectiveAgreements.id, id))
      .returning();

    if (!updatedCba) {
      return NextResponse.json({ error: "CBA not found" }, { status: 404 });
    }

    return NextResponse.json(updatedCba);
  } catch (error) {
    console.error("Error updating CBA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cba/[id]
 * Delete a CBA (cascades to clauses, contacts, version history)
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

    // Delete CBA (cascade will handle related records)
    const [deletedCba] = await db
      .delete(collectiveAgreements)
      .where(eq(collectiveAgreements.id, id))
      .returning();

    if (!deletedCba) {
      return NextResponse.json({ error: "CBA not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Error deleting CBA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
