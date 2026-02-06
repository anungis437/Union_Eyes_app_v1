/**
 * Workflow Engine for Claims Management
 * 
 * Handles status transitions, validation, and deadline tracking
 */

import { db } from "../db/db";
import { claims, claimUpdates } from "../db/schema/claims-schema";
import { eq } from "drizzle-orm";
import { sendClaimStatusNotification } from "./claim-notifications";

// Define valid status transitions
export const STATUS_TRANSITIONS = {
  submitted: ["under_review", "assigned", "rejected"],
  under_review: ["investigation", "pending_documentation", "resolved", "rejected", "assigned"],
  assigned: ["investigation", "under_review", "pending_documentation"],
  investigation: ["pending_documentation", "under_review", "resolved", "rejected"],
  pending_documentation: ["under_review", "investigation", "resolved"],
  resolved: ["closed"],
  rejected: ["closed"],
  closed: [], // Terminal state - no transitions allowed
} as const;

export type ClaimStatus = keyof typeof STATUS_TRANSITIONS;

// Define SLA deadlines (in days) for each status
export const STATUS_DEADLINES = {
  submitted: 2, // Must be reviewed within 2 days
  under_review: 5, // Must complete review within 5 days
  assigned: 3, // Steward must start action within 3 days
  investigation: 10, // Investigation must complete within 10 days
  pending_documentation: 7, // Documentation must be provided within 7 days
  resolved: 30, // Must close within 30 days of resolution
  rejected: 30, // Must close within 30 days of rejection
  closed: 0, // No deadline for closed claims
} as const;

// Define priority multipliers for deadlines
export const PRIORITY_MULTIPLIERS = {
  critical: 0.5, // Half the normal deadline
  high: 0.75, // 75% of normal deadline
  medium: 1.0, // Normal deadline
  low: 1.5, // 50% more time
} as const;

export type ClaimPriority = keyof typeof PRIORITY_MULTIPLIERS;

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
  currentStatus: ClaimStatus,
  newStatus: ClaimStatus
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return (allowedTransitions as readonly ClaimStatus[]).includes(newStatus);
}

/**
 * Get allowed transitions for a given status
 */
export function getAllowedTransitions(status: ClaimStatus): readonly ClaimStatus[] {
  return STATUS_TRANSITIONS[status];
}

/**
 * Calculate deadline for a claim based on status and priority
 */
export function calculateDeadline(
  status: ClaimStatus,
  priority: ClaimPriority,
  fromDate: Date = new Date()
): Date {
  const baseDays = STATUS_DEADLINES[status];
  const multiplier = PRIORITY_MULTIPLIERS[priority];
  const adjustedDays = Math.ceil(baseDays * multiplier);
  
  const deadline = new Date(fromDate);
  deadline.setDate(deadline.getDate() + adjustedDays);
  
  return deadline;
}

/**
 * Check if a claim is overdue based on current status
 */
export function isClaimOverdue(
  status: ClaimStatus,
  priority: ClaimPriority,
  statusChangedAt: Date
): boolean {
  const deadline = calculateDeadline(status, priority, statusChangedAt);
  return new Date() > deadline;
}

/**
 * Get days remaining until deadline
 */
export function getDaysUntilDeadline(
  status: ClaimStatus,
  priority: ClaimPriority,
  statusChangedAt: Date
): number {
  const deadline = calculateDeadline(status, priority, statusChangedAt);
  const diffTime = deadline.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Update claim status with validation and audit trail
 */
export async function updateClaimStatus(
  claimNumber: string,
  newStatus: ClaimStatus,
  userId: string,
  notes?: string
): Promise<{ success: boolean; error?: string; claim?: any }> {
  try {
    // Get current claim
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber))
      .limit(1);

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    const currentStatus = claim.status as ClaimStatus;

    // Validate transition
    if (!isValidTransition(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${getAllowedTransitions(currentStatus).join(", ")}`,
      };
    }

    // Update claim status and timestamps
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set closed timestamp
    if (newStatus === "closed" && !claim.closedAt) {
      updateData.closedAt = new Date();
    }

    // Update progress based on status
    const progressMap: Record<ClaimStatus, number> = {
      submitted: 10,
      under_review: 25,
      assigned: 30,
      investigation: 50,
      pending_documentation: 60,
      resolved: 90,
      rejected: 100,
      closed: 100,
    };
    updateData.progress = progressMap[newStatus];

    // Perform the update
    const [updatedClaim] = await db
      .update(claims)
      .set(updateData)
      .where(eq(claims.claimId, claim.claimId))
      .returning();

    // Create audit trail entry
    await db.insert(claimUpdates).values({
      claimId: claim.claimId,
      updateType: "status_change",
      message: notes || `Status changed from '${currentStatus}' to '${newStatus}'`,
      createdBy: userId,
      isInternal: false,
      metadata: {
        previousStatus: currentStatus,
        newStatus,
        transitionAllowed: true,
      },
    });

    // Send email notification (async, don't block on email sending)
    sendClaimStatusNotification(claim.claimId, currentStatus, newStatus, notes).catch((error) => {
      console.error('Failed to send email notification:', error);
      // Don't fail the status update if email fails
    });

    return { success: true, claim: updatedClaim };
  } catch (error) {
    console.error("Error updating claim status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Assign claim to a steward
 */
export async function assignClaim(
  claimId: string,
  stewardId: string,
  assignedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimId, claimId))
      .limit(1);

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    // Update claim assignment
    await db
      .update(claims)
      .set({
        assignedTo: stewardId,
        assignedAt: new Date(),
        status: "assigned",
        updatedAt: new Date(),
        progress: 30,
      })
      .where(eq(claims.claimId, claimId));

    // Create audit trail
    await db.insert(claimUpdates).values({
      claimId,
      updateType: "assignment",
      message: `Claim assigned to steward`,
      createdBy: assignedBy,
      isInternal: true,
      metadata: {
        stewardId,
        previousStatus: claim.status,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error assigning claim:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get overdue claims
 */
export async function getOverdueClaims(): Promise<any[]> {
  try {
    const allClaims = await db.select().from(claims);
    
    const overdueClaims = allClaims.filter((claim) => {
      // Don't check closed claims
      if (claim.status === "closed") return false;
      
      // Use last activity date or created date
      const statusDate = claim.updatedAt || claim.createdAt;
      
      // Skip if no date available
      if (!statusDate) return false;
      
      return isClaimOverdue(
        claim.status as ClaimStatus,
        claim.priority as ClaimPriority,
        statusDate
      );
    });

    return overdueClaims;
  } catch (error) {
    console.error("Error getting overdue claims:", error);
    return [];
  }
}

/**
 * Get claims approaching deadline (within 1 day)
 */
export async function getClaimsApproachingDeadline(): Promise<any[]> {
  try {
    const allClaims = await db.select().from(claims);
    
    const approachingDeadline = allClaims.filter((claim) => {
      if (claim.status === "closed") return false;
      
      const statusDate = claim.updatedAt || claim.createdAt;
      
      // Skip if no date available
      if (!statusDate) return false;
      
      const daysRemaining = getDaysUntilDeadline(
        claim.status as ClaimStatus,
        claim.priority as ClaimPriority,
        statusDate
      );
      
      return daysRemaining > 0 && daysRemaining <= 1;
    });

    return approachingDeadline;
  } catch (error) {
    console.error("Error getting claims approaching deadline:", error);
    return [];
  }
}

/**
 * Add internal note to claim
 */
export async function addClaimNote(
  claimNumber: string,
  message: string,
  userId: string,
  isInternal: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get claim to get UUID
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimNumber, claimNumber))
      .limit(1);

    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    // Create note entry
    await db.insert(claimUpdates).values({
      claimId: claim.claimId,
      updateType: "note",
      message,
      createdBy: userId,
      isInternal,
      metadata: {},
    });

    // Update last activity timestamp
    await db
      .update(claims)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(claims.claimId, claim.claimId));

    return { success: true };
  } catch (error) {
    console.error("Error adding claim note:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get workflow status for a claim (deadline info, transitions, etc.)
 */
export function getClaimWorkflowStatus(claim: any) {
  const status = claim.status as ClaimStatus;
  const priority = claim.priority as ClaimPriority;
  const statusDate = claim.updatedAt || claim.createdAt;

  const deadline = calculateDeadline(status, priority, statusDate);
  const daysRemaining = getDaysUntilDeadline(status, priority, statusDate);
  const isOverdue = isClaimOverdue(status, priority, statusDate);
  const allowedTransitions = getAllowedTransitions(status);

  return {
    currentStatus: status,
    priority,
    deadline,
    daysRemaining,
    isOverdue,
    allowedTransitions,
    progress: claim.progress || 0,
    statusSince: statusDate,
  };
}
