import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { claimUpdatesTable, claimsTable, membersTable } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimId = params.id;

    // Get claim with member info
    const claim = await db
      .select({
        id: claimsTable.id,
        tenantId: claimsTable.tenantId,
        memberId: claimsTable.memberId,
        assignedTo: claimsTable.assignedTo,
      })
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);

    if (claim.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claimData = claim[0];

    // Get member info to check ownership
    const member = await db
      .select({ clerkUserId: membersTable.clerkUserId })
      .from(membersTable)
      .where(eq(membersTable.id, claimData.memberId))
      .limit(1);

    const isOwner = member.length > 0 && member[0].clerkUserId === userId;

    // Check if user is assigned steward
    let isSteward = false;
    if (claimData.assignedTo) {
      const steward = await db
        .select({ clerkUserId: membersTable.clerkUserId })
        .from(membersTable)
        .where(eq(membersTable.id, claimData.assignedTo))
        .limit(1);

      isSteward = steward.length > 0 && steward[0].clerkUserId === userId;
    }

    // User must be owner or assigned steward
    if (!isOwner && !isSteward) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get workflow history with user names
    const historyRecords = await db
      .select({
        id: claimUpdatesTable.id,
        previousStatus: claimUpdatesTable.previousStatus,
        newStatus: claimUpdatesTable.newStatus,
        notes: claimUpdatesTable.notes,
        changedBy: claimUpdatesTable.changedBy,
        createdAt: claimUpdatesTable.createdAt,
        changedByName: membersTable.fullName,
        changedByEmail: membersTable.email,
      })
      .from(claimUpdatesTable)
      .leftJoin(
        membersTable,
        eq(claimUpdatesTable.changedBy, membersTable.id)
      )
      .where(eq(claimUpdatesTable.claimId, claimId))
      .orderBy(desc(claimUpdatesTable.createdAt));

    const history = historyRecords.map((record) => ({
      id: record.id,
      previousStatus: record.previousStatus,
      newStatus: record.newStatus,
      notes: record.notes,
      changedBy: record.changedBy,
      changedByName: record.changedByName || "Unknown User",
      changedByEmail: record.changedByEmail,
      createdAt: record.createdAt,
    }));

    return NextResponse.json({
      history,
      totalEvents: history.length,
    });
  } catch (error) {
    console.error("Error fetching workflow history:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow history" },
      { status: 500 }
    );
  }
}
