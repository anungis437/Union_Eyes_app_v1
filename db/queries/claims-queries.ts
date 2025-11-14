"use server";

import { db } from "@/db/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { claims, claimUpdates } from "../schema/claims-schema";

// Type for inserting a new claim
export type InsertClaim = typeof claims.$inferInsert;
export type SelectClaim = typeof claims.$inferSelect;

/**
 * Create a new claim
 */
export const createClaim = async (data: Omit<InsertClaim, 'claimId' | 'claimNumber' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Generate claim number (format: CASE-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of claims today to generate sequential number
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const todayCount = await db
      .select({ count: count() })
      .from(claims)
      .where(
        and(
          sql`${claims.createdAt} >= ${todayStart}`,
          sql`${claims.createdAt} < ${todayEnd}`
        )
      );
    
    const sequentialNum = (todayCount[0]?.count || 0) + 1;
    const claimNumber = `CASE-${dateStr}-${sequentialNum.toString().padStart(4, '0')}`;
    
    const [newClaim] = await db
      .insert(claims)
      .values({
        ...data,
        claimNumber,
      })
      .returning();
    
    console.log(`Created claim: ${claimNumber}`);
    return newClaim;
  } catch (error) {
    console.error("Error creating claim:", error);
    throw new Error("Failed to create claim");
  }
};

/**
 * Get all claims for a specific member
 */
export const getClaimsByMember = async (memberId: string) => {
  try {
    const memberClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.memberId, memberId))
      .orderBy(desc(claims.createdAt));
    
    return memberClaims;
  } catch (error) {
    console.error("Error fetching claims by member:", error);
    throw new Error("Failed to fetch claims");
  }
};

/**
 * Get all claims for a tenant (organization)
 */
export const getClaimsByTenant = async (tenantId: string, limit?: number) => {
  try {
    let query = db
      .select()
      .from(claims)
      .where(eq(claims.tenantId, tenantId))
      .orderBy(desc(claims.createdAt));
    
    if (limit) {
      query = query.limit(limit) as any;
    }
    
    const tenantClaims = await query;
    return tenantClaims;
  } catch (error) {
    console.error("Error fetching claims by tenant:", error);
    throw new Error("Failed to fetch claims");
  }
};

/**
 * Get a single claim by ID
 */
export const getClaimById = async (claimId: string) => {
  try {
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimId, claimId));
    
    return claim;
  } catch (error) {
    console.error("Error fetching claim:", error);
    throw new Error("Failed to fetch claim");
  }
};

/**
 * Update claim status
 */
export const updateClaimStatus = async (
  claimId: string, 
  newStatus: SelectClaim['status'],
  updatedBy: string,
  notes?: string
) => {
  try {
    // Update the claim
    const [updatedClaim] = await db
      .update(claims)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claimId))
      .returning();
    
    // Create an update record
    await db.insert(claimUpdates).values({
      claimId,
      updateType: 'status_change',
      message: notes || `Status changed to ${newStatus}`,
      createdBy: updatedBy,
    });
    
    return updatedClaim;
  } catch (error) {
    console.error("Error updating claim status:", error);
    throw new Error("Failed to update claim status");
  }
};

/**
 * Assign claim to a user
 */
export const assignClaim = async (
  claimId: string,
  assignedTo: string,
  assignedBy: string
) => {
  try {
    const [updatedClaim] = await db
      .update(claims)
      .set({
        assignedTo,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claimId))
      .returning();
    
    // Create an update record
    await db.insert(claimUpdates).values({
      claimId,
      updateType: 'assignment',
      message: `Claim assigned to user ${assignedTo}`,
      createdBy: assignedBy,
    });
    
    return updatedClaim;
  } catch (error) {
    console.error("Error assigning claim:", error);
    throw new Error("Failed to assign claim");
  }
};

/**
 * Get claims assigned to a specific user (for stewards/officers)
 */
export const getClaimsAssignedToUser = async (userId: string) => {
  try {
    const assignedClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.assignedTo, userId))
      .orderBy(desc(claims.priority), desc(claims.createdAt));
    
    return assignedClaims;
  } catch (error) {
    console.error("Error fetching assigned claims:", error);
    throw new Error("Failed to fetch assigned claims");
  }
};

/**
 * Get claim statistics for dashboard
 */
export const getClaimStatistics = async (tenantId: string) => {
  try {
    // Total active claims (not resolved or closed)
    const [activeClaims] = await db
      .select({ count: count() })
      .from(claims)
      .where(
        and(
          eq(claims.tenantId, tenantId),
          sql`${claims.status} NOT IN ('resolved', 'closed', 'rejected')`
        )
      );
    
    // Pending reviews (submitted or under review)
    const [pendingReviews] = await db
      .select({ count: count() })
      .from(claims)
      .where(
        and(
          eq(claims.tenantId, tenantId),
          sql`${claims.status} IN ('submitted', 'under_review')`
        )
      );
    
    // Resolved cases
    const [resolvedCases] = await db
      .select({ count: count() })
      .from(claims)
      .where(
        and(
          eq(claims.tenantId, tenantId),
          eq(claims.status, 'resolved')
        )
      );
    
    // High priority claims
    const [highPriorityClaims] = await db
      .select({ count: count() })
      .from(claims)
      .where(
        and(
          eq(claims.tenantId, tenantId),
          sql`${claims.priority} IN ('high', 'critical')`,
          sql`${claims.status} NOT IN ('resolved', 'closed', 'rejected')`
        )
      );
    
    return {
      activeClaims: activeClaims.count,
      pendingReviews: pendingReviews.count,
      resolvedCases: resolvedCases.count,
      highPriorityClaims: highPriorityClaims.count,
    };
  } catch (error) {
    console.error("Error fetching claim statistics:", error);
    throw new Error("Failed to fetch statistics");
  }
};

/**
 * Get recent claim updates/activity
 */
export const getRecentClaimUpdates = async (claimId: string) => {
  try {
    const updates = await db
      .select()
      .from(claimUpdates)
      .where(eq(claimUpdates.claimId, claimId))
      .orderBy(desc(claimUpdates.createdAt))
      .limit(20);
    
    return updates;
  } catch (error) {
    console.error("Error fetching claim updates:", error);
    throw new Error("Failed to fetch updates");
  }
};

/**
 * Add a note/comment to a claim
 */
export const addClaimUpdate = async (
  claimId: string,
  message: string,
  createdBy: string,
  updateType: string = 'note'
) => {
  try {
    const [newUpdate] = await db
      .insert(claimUpdates)
      .values({
        claimId,
        updateType,
        message,
        createdBy,
      })
      .returning();
    
    // Update last activity timestamp on the claim
    await db
      .update(claims)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claimId));
    
    return newUpdate;
  } catch (error) {
    console.error("Error adding claim update:", error);
    throw new Error("Failed to add update");
  }
};

/**
 * Delete a claim (soft delete by setting status to closed)
 */
export const deleteClaim = async (claimId: string) => {
  try {
    const [deletedClaim] = await db
      .update(claims)
      .set({
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claimId))
      .returning();
    
    return deletedClaim;
  } catch (error) {
    console.error("Error deleting claim:", error);
    throw new Error("Failed to delete claim");
  }
};
