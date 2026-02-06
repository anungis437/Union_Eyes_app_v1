/**
 * Seed Test Data API Endpoint
 * 
 * Creates sample data for testing dashboard functionality
 * POST /api/admin/seed-test-data
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { claims, organizationMembers, profiles } from "@/db/schema";
import { v4 as uuidv4 } from 'uuid';
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ 
        error: "organizationId is required" 
      }, { status: 400 });
    }

    console.log(`[Seed] Creating test data for organization: ${organizationId}`);

    // Get the current user's profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, userId))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ 
        error: "User profile not found" 
      }, { status: 404 });
    }

    // Create 4 additional sample members
    const memberIds: string[] = [userProfile.id];
    
    for (let i = 1; i <= 4; i++) {
      const memberId = uuidv4();
      const clerkUserId = `sample_${Date.now()}_${i}`;
      
      // Create profile
      await db.insert(profiles).values({
        id: memberId,
        clerkUserId: clerkUserId,
        firstName: `Test Member`,
        lastName: `${i}`,
        email: `testmember${i}@example.com`,
        phoneNumber: `555-010${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      // Add to organization
      await db.insert(organizationMembers).values({
        id: uuidv4(),
        organizationId: organizationId,
        profileId: memberId,
        role: i === 1 ? 'steward' : 'member',
        joinedAt: new Date(),
        createdAt: new Date(),
      }).onConflictDoNothing();

      memberIds.push(memberId);
    }

    // Create sample claims
    const claimStatuses = ['submitted', 'under_review', 'under_review', 'resolved', 'resolved', 'submitted'];
    const claimPriorities = ['high', 'medium', 'critical', 'low', 'medium', 'high'];
    const claimTypes = ['discipline', 'grievance', 'safety', 'contract', 'wage', 'benefits'];
    
    const createdClaims = [];
    for (let i = 0; i < 6; i++) {
      const claimId = uuidv4();
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - (15 - i * 2));
      
      const claim = {
        id: claimId,
        claimNumber: `CLM-2026-${String(Date.now()).slice(-6)}${i}`,
        organizationId: organizationId,
        claimantId: memberIds[i % memberIds.length],
        title: `Test ${claimTypes[i].charAt(0).toUpperCase() + claimTypes[i].slice(1)} Claim ${i + 1}`,
        description: `This is a test ${claimTypes[i]} claim for dashboard testing.`,
        type: claimTypes[i],
        status: claimStatuses[i],
        priority: claimPriorities[i],
        location: 'Test Location - Floor ' + (i + 1),
        incidentDate: new Date(createdDate.getTime() - 86400000 * 3),
        createdAt: createdDate,
        updatedAt: createdDate,
      };
      
      await db.insert(claims).values(claim);
      createdClaims.push(claim);
    }

    return NextResponse.json({
      success: true,
      message: "Test data created successfully",
      data: {
        organizationId,
        membersCreated: 4,
        claimsCreated: 6,
        breakdown: {
          active: 3,
          pendingReview: 2,
          resolved: 2,
          highPriority: 2,
        }
      }
    });

  } catch (error) {
    console.error("[Seed API] Error:", error);
    return NextResponse.json({
      error: "Failed to create test data",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
