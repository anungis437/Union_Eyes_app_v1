import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { cbaFootnotes, cbaClause, arbitrationDecisions } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";

/**
 * GET /api/cba/footnotes/[clauseId]
 * Get all footnotes for a clause (outgoing references and backlinks)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clauseId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clauseId } = params;

    // Get outgoing footnotes (this clause references others)
    const outgoingFootnotes = await db
      .select({
        footnote: cbaFootnotes,
        targetClause: cbaClause,
        targetDecision: arbitrationDecisions,
      })
      .from(cbaFootnotes)
      .leftJoin(cbaClause, eq(cbaFootnotes.targetClauseId, cbaClause.id))
      .leftJoin(arbitrationDecisions, eq(cbaFootnotes.targetDecisionId, arbitrationDecisions.id))
      .where(eq(cbaFootnotes.sourceClauseId, clauseId));

    // Get incoming footnotes (other clauses reference this one)
    const incomingFootnotes = await db
      .select({
        footnote: cbaFootnotes,
        sourceClause: cbaClause,
      })
      .from(cbaFootnotes)
      .leftJoin(cbaClause, eq(cbaFootnotes.sourceClauseId, cbaClause.id))
      .where(eq(cbaFootnotes.targetClauseId, clauseId));

    return NextResponse.json({
      outgoing: outgoingFootnotes,
      incoming: incomingFootnotes,
    });
  } catch (error) {
    console.error("Error fetching footnotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cba/footnotes/[clauseId]
 * Create a new footnote for a clause
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clauseId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clauseId } = params;
    const body = await request.json();

    const { 
      targetClauseId, 
      targetDecisionId, 
      footnoteText, 
      linkType,
      footnoteNumber,
      context,
      startOffset,
      endOffset,
    } = body;

    // Validate that at least one target is provided
    if (!targetClauseId && !targetDecisionId) {
      return NextResponse.json(
        { error: "Either targetClauseId or targetDecisionId must be provided" },
        { status: 400 }
      );
    }

    // Create footnote
    const [footnote] = await db
      .insert(cbaFootnotes)
      .values({
        sourceClauseId: clauseId,
        targetClauseId,
        targetDecisionId,
        footnoteText,
        linkType,
        footnoteNumber,
        context,
        startOffset,
        endOffset,
        createdBy: userId,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(footnote);
  } catch (error) {
    console.error("Error creating footnote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cba/footnotes/[clauseId]/[footnoteId]
 * Track footnote click
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clauseId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const footnoteId = searchParams.get("footnoteId");

    if (!footnoteId) {
      return NextResponse.json(
        { error: "Footnote ID required" },
        { status: 400 }
      );
    }

    // Increment click count
    await db
      .update(cbaFootnotes)
      .set({
        clickCount: sql`${cbaFootnotes.clickCount} + 1`,
      })
      .where(eq(cbaFootnotes.id, footnoteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating footnote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
