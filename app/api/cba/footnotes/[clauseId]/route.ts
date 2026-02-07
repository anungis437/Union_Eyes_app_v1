import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { cbaFootnotes, cbaClause, arbitrationDecisions } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest, { params }: { params: { clauseId: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
  })
  })(request, { params });
};

export const POST = async (request: NextRequest, { params }: { params: { clauseId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
          createdBy: user.id,
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
  })
  })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { clauseId: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
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
  })
  })(request, { params });
};
