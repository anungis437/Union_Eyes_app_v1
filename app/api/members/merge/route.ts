/**
 * Members Merge API Route
 * 
 * Merge duplicate member records:
 * - POST: Merge two member records
 * - Consolidates data, activities, and history
 * - Creates audit trail
 * 
 * @module app/api/members/merge/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  claims,
  eventAttendees,
  auditLogs,
} from "@/db/schema";
import { organizationMembers } from "@/db/schema/organization-members-schema";
import { memberDocuments } from "@/db/schema/member-documents-schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const mergeSchema = z.object({
  primaryMemberId: z.string().uuid(),
  duplicateMemberId: z.string().uuid(),
  fieldSelections: z.record(z.enum(["primary", "duplicate"])),
  notes: z.string().min(10, "Notes must be at least 10 characters"),
});

/**
 * POST /api/members/merge
 * 
 * Merge two member records
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = mergeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { primaryMemberId, duplicateMemberId, fieldSelections, notes } = validation.data;

    // Prevent self-merge
    if (primaryMemberId === duplicateMemberId) {
      return NextResponse.json(
        { error: "Cannot merge a member with itself" },
        { status: 400 }
      );
    }

    // Fetch both members
    const [primaryMember] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, primaryMemberId));

    const [duplicateMember] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, duplicateMemberId));

    if (!primaryMember || !duplicateMember) {
      return NextResponse.json(
        { error: "One or both members not found" },
        { status: 404 }
      );
    }

    // Verify both belong to same organization
    if (primaryMember.organizationId !== orgId || duplicateMember.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Members must belong to the same organization" },
        { status: 403 }
      );
    }

    // Build merged data based on field selections
    const mergedData: any = {
      id: primaryMemberId,
      organizationId: orgId,
    };

    Object.entries(fieldSelections).forEach(([field, source]) => {
      const sourceMember = source === "primary" ? primaryMember : duplicateMember;
      mergedData[field] = sourceMember[field as keyof typeof sourceMember];
    });

    // Update primary member with merged data
    await db
      .update(organizationMembers)
      .set({
        ...mergedData,
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, primaryMemberId));

    // Transfer claims
    await db
      .update(claims)
      .set({ memberId: primaryMemberId })
      .where(eq(claims.memberId, duplicateMemberId));

    // Transfer documents
    await db
      .update(memberDocuments)
      .set({ userId: primaryMemberId })
      .where(eq(memberDocuments.userId, duplicateMemberId));

    // Transfer event attendance
    await db
      .update(eventAttendees)
      .set({ userId: primaryMemberId })
      .where(eq(eventAttendees.userId, duplicateMemberId));

    // Archive duplicate member instead of deleting
    await db
      .update(organizationMembers)
      .set({
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, duplicateMemberId));

    // Create audit log
    await db
      .insert(auditLogs)
      .values({
        organizationId: orgId || "",
        userId,
        action: "member_merge",
        resourceType: "member",
        resourceId: primaryMemberId,
        oldValues: duplicateMember,
        newValues: mergedData,
        metadata: {
          notes,
          mergedAt: new Date().toISOString(),
          fieldSelections,
        },
      });

    // Fetch updated member with consolidated counts
    const [updatedMember] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, primaryMemberId));

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: "Members merged successfully",
      details: {
        primaryMemberId,
        duplicateMemberId,
        transferredRecords: {
          claims: "transferred",
          documents: "transferred",
          eventAttendance: "transferred",
        },
      },
    });
  } catch (error) {
    console.error("Error merging members:", error);
    return NextResponse.json(
      {
        error: "Failed to merge members",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/members/merge/candidates
 * 
 * Find potential duplicate members
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // In production, implement sophisticated duplicate detection:
    // - Fuzzy name matching
    // - Similar email addresses
    // - Same SSN/employee ID
    // - Similar join dates and personal info
    
    const allMembers = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId || ""));

    // Simple duplicate detection (expand in production)
    const candidates: Array<{ primary: any; duplicates: any[] }> = [];
    
    // Example: Find members with exact same email
    const emailMap = new Map<string, any[]>();
    allMembers.forEach((member) => {
      if (member.email) {
        const existing = emailMap.get(member.email) || [];
        existing.push(member);
        emailMap.set(member.email, existing);
      }
    });

    emailMap.forEach((duplicates) => {
      if (duplicates.length > 1) {
        candidates.push({
          primary: duplicates[0],
          duplicates: duplicates.slice(1),
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: candidates,
      count: candidates.length,
    });
  } catch (error) {
    console.error("Error finding duplicate candidates:", error);
    return NextResponse.json(
      { error: "Failed to find duplicates" },
      { status: 500 }
    );
  }
}
