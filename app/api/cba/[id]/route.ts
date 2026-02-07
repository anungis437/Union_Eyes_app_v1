import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { collectiveAgreements, cbaClause, cbaContacts, cbaVersionHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
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
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
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
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
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
    })(request, { params });
};
