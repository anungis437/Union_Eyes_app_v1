import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { claimUpdates, claims, profilesTable } from "@/db/schema";
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

    const claimNumber = params.id;

    // Get claim with member info
    const claim = await db
      .select({
        id: claims.claimId,
        tenantId: claims.tenantId,
        memberId: claims.memberId,
        assignedTo: claims.assignedTo,
      })
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber))
      .limit(1);

    if (claim.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claimData = claim[0];

    // Get member info to check ownership
    const member = await db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, claimData.memberId))
      .limit(1);

    const isOwner = member.length > 0 && member[0].userId === userId;

    // Check if user is assigned steward
    let isSteward = false;
    if (claimData.assignedTo) {
      const steward = await db
        .select({ userId: profilesTable.userId })
        .from(profilesTable)
        .where(eq(profilesTable.userId, claimData.assignedTo))
        .limit(1);

      isSteward = steward.length > 0 && steward[0].userId === userId;
    }

    // User must be owner or assigned steward
    if (!isOwner && !isSteward) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get workflow history with user emails
    const historyRecords = await db
      .select({
        id: claimUpdates.updateId,
        updateType: claimUpdates.updateType,
        message: claimUpdates.message,
        createdBy: claimUpdates.createdBy,
        createdAt: claimUpdates.createdAt,
        createdByEmail: profilesTable.email,
      })
      .from(claimUpdates)
      .leftJoin(
        profilesTable,
        eq(claimUpdates.createdBy, profilesTable.userId)
      )
      .where(eq(claimUpdates.claimId, claimData.id))
      .orderBy(desc(claimUpdates.createdAt));

    const history = historyRecords.map((record) => ({
      id: record.id,
      updateType: record.updateType,
      message: record.message,
      createdBy: record.createdBy,
      createdByEmail: record.createdByEmail || "Unknown",
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
