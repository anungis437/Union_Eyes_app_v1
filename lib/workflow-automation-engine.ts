// ============================================================================
// WORKFLOW AUTOMATION ENGINE
// ============================================================================
// Description: State machine for grievance workflow management with automatic
//              transitions, SLA tracking, approval chains, and notifications
// Created: 2025-12-06
// ============================================================================

import { db } from "@/db/db";
import { eq, and, desc, asc, isNull, lte, gte, sql } from "drizzle-orm";
import {
  claims,
  grievanceWorkflows,
  grievanceStages,
  grievanceTransitions,
  grievanceDeadlines,
  grievanceAssignments,
  type GrievanceWorkflow,
  type GrievanceStage,
  type InsertGrievanceTransition,
  type GrievanceTransition,
  type WorkflowStageConfig,
  type StageCondition,
  type StageAction,
} from "@/db/schema";

// ============================================================================
// TYPES
// ============================================================================

export type TransitionResult = {
  success: boolean;
  transitionId?: string;
  error?: string;
  requiresApproval?: boolean;
  nextStage?: GrievanceStage;
  actionsTriggered?: string[];
};

export type WorkflowStatus = {
  currentStage: GrievanceStage | null;
  workflow: GrievanceWorkflow | null;
  progress: number; // 0-100%
  stagesCompleted: number;
  totalStages: number;
  upcomingDeadlines: Array<{
    type: string;
    date: Date;
    daysRemaining: number;
  }>;
  isOverdue: boolean;
  daysInCurrentStage: number;
};

export type ApprovalRequest = {
  transitionId: string;
  claimId: string;
  fromStage: string;
  toStage: string;
  requestedBy: string;
  requestedAt: Date;
  reason?: string;
};

// ============================================================================
// WORKFLOW INITIALIZATION
// ============================================================================

/**
 * Initialize workflow for a new grievance/claim
 */
export async function initializeWorkflow(
  claimId: string,
  grievanceType: string,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  try {
    // Find appropriate workflow for this grievance type
    const workflow = await db.query.grievanceWorkflows.findFirst({
      where: and(
        eq(grievanceWorkflows.tenantId, tenantId),
        eq(grievanceWorkflows.grievanceType, grievanceType),
        eq(grievanceWorkflows.status, "active")
      ),
      with: {
        stages: {
          orderBy: [asc(grievanceStages.orderIndex)],
        },
      },
    });

    if (!workflow) {
      // Try to find default workflow
      const defaultWorkflow = await db.query.grievanceWorkflows.findFirst({
        where: and(
          eq(grievanceWorkflows.tenantId, tenantId),
          eq(grievanceWorkflows.isDefault, true),
          eq(grievanceWorkflows.status, "active")
        ),
        with: {
          stages: {
            orderBy: [asc(grievanceStages.orderIndex)],
          },
        },
      });

      if (!defaultWorkflow) {
        return { success: false, error: "No workflow found for grievance type" };
      }

      // Use default workflow
      return await startWorkflow(claimId, defaultWorkflow.id, tenantId, userId);
    }

    return await startWorkflow(claimId, workflow.id, tenantId, userId);
  } catch (error) {
    console.error("Error initializing workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Start workflow by transitioning to first stage
 */
async function startWorkflow(
  claimId: string,
  workflowId: string,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  try {
    // Get first stage of workflow
    const firstStage = await db.query.grievanceStages.findFirst({
      where: and(
        eq(grievanceStages.workflowId, workflowId),
        eq(grievanceStages.orderIndex, 0)
      ),
    });

    if (!firstStage) {
      return { success: false, error: "No stages defined in workflow" };
    }

    // Create initial transition to first stage
    const [transition] = await db
      .insert(grievanceTransitions)
      .values({
        tenantId,
        claimId,
        fromStageId: null, // No previous stage
        toStageId: firstStage.id,
        triggerType: "manual",
        reason: "Workflow initialization",
        transitionedBy: userId,
        transitionedAt: new Date(),
      })
      .returning();

    // Execute entry actions for first stage
    await executeStageActions(firstStage.entryActions as StageAction[], claimId, tenantId, userId);

    // Create SLA deadline if defined
    if (firstStage.slaDays) {
      await createStageDeadline(claimId, firstStage.id, firstStage.slaDays, tenantId);
    }

    // Send notifications if configured
    if (firstStage.notifyOnEntry) {
      await sendStageNotification(claimId, firstStage, "entered", tenantId);
    }

    return { success: true, workflowId };
  } catch (error) {
    console.error("Error starting workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// STAGE TRANSITIONS
// ============================================================================

/**
 * Transition grievance to next stage (manual or automatic)
 */
export async function transitionToStage(
  claimId: string,
  toStageId: string,
  tenantId: string,
  userId: string,
  options: {
    reason?: string;
    notes?: string;
    requiresApproval?: boolean;
    triggerType?: "manual" | "automatic" | "deadline" | "approval";
  } = {}
): Promise<TransitionResult> {
  try {
    // Get current stage
    const currentTransition = await db.query.grievanceTransitions.findFirst({
      where: eq(grievanceTransitions.claimId, claimId),
      orderBy: [desc(grievanceTransitions.transitionedAt)],
    });

    const currentStageId = currentTransition?.toStageId;

    // Get target stage details
    const toStage = await db.query.grievanceStages.findFirst({
      where: eq(grievanceStages.id, toStageId),
    });

    if (!toStage) {
      return { success: false, error: "Target stage not found" };
    }

    // Check if approval required
    if (toStage.requireApproval && !options.requiresApproval) {
      // Create pending transition requiring approval
      const [pendingTransition] = await db
        .insert(grievanceTransitions)
        .values({
          tenantId,
          claimId,
          fromStageId: currentStageId || null,
          toStageId,
          triggerType: options.triggerType || "manual",
          reason: options.reason,
          notes: options.notes,
          transitionedBy: userId,
          requiresApproval: true,
        })
        .returning();

      return {
        success: true,
        transitionId: pendingTransition.id,
        requiresApproval: true,
        nextStage: toStage,
      };
    }

    // Execute exit actions for current stage
    if (currentStageId) {
      const currentStage = await db.query.grievanceStages.findFirst({
        where: eq(grievanceStages.id, currentStageId),
      });
      
      if (currentStage) {
        await executeStageActions(
          currentStage.exitActions as StageAction[],
          claimId,
          tenantId,
          userId
        );
      }
    }

    // Create transition record
    const [transition] = await db
      .insert(grievanceTransitions)
      .values({
        tenantId,
        claimId,
        fromStageId: currentStageId || null,
        toStageId,
        triggerType: options.triggerType || "manual",
        reason: options.reason,
        notes: options.notes,
        transitionedBy: userId,
        transitionedAt: new Date(),
        requiresApproval: false,
      })
      .returning();

    // Execute entry actions for new stage
    const actionsTriggered = await executeStageActions(
      toStage.entryActions as StageAction[],
      claimId,
      tenantId,
      userId
    );

    // Create SLA deadline if defined
    if (toStage.slaDays) {
      await createStageDeadline(claimId, toStage.id, toStage.slaDays, tenantId);
    }

    // Send notifications
    if (toStage.notifyOnEntry) {
      await sendStageNotification(claimId, toStage, "entered", tenantId);
    }

    // Update claim progress
    await updateClaimProgress(claimId, tenantId);

    // Check if auto-transition to next stage is configured
    if (toStage.autoTransition && toStage.nextStageId) {
      // Schedule auto-transition (could be delayed or conditional)
      await scheduleAutoTransition(claimId, toStage.id, toStage.nextStageId, tenantId);
    }

    return {
      success: true,
      transitionId: transition.id,
      nextStage: toStage,
      actionsTriggered,
    };
  } catch (error) {
    console.error("Error transitioning stage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Approve pending transition
 */
export async function approveTransition(
  transitionId: string,
  tenantId: string,
  approverId: string
): Promise<TransitionResult> {
  try {
    // Get pending transition
    const transition = await db.query.grievanceTransitions.findFirst({
      where: and(
        eq(grievanceTransitions.id, transitionId),
        eq(grievanceTransitions.tenantId, tenantId),
        eq(grievanceTransitions.requiresApproval, true),
        isNull(grievanceTransitions.approvedBy)
      ),
    });

    if (!transition) {
      return { success: false, error: "Pending transition not found" };
    }

    // Update transition with approval
    await db
      .update(grievanceTransitions)
      .set({
        requiresApproval: false,
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(grievanceTransitions.id, transitionId));

    // Execute the transition
    return await transitionToStage(
      transition.claimId,
      transition.toStageId,
      tenantId,
      approverId,
      {
        reason: transition.reason || undefined,
        notes: transition.notes || undefined,
        requiresApproval: true, // Skip approval check since already approved
        triggerType: "approval",
      }
    );
  } catch (error) {
    console.error("Error approving transition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Reject pending transition
 */
export async function rejectTransition(
  transitionId: string,
  tenantId: string,
  rejectorId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update transition with rejection
    await db
      .update(grievanceTransitions)
      .set({
        requiresApproval: false,
        notes: sql`${grievanceTransitions.notes} || ' | Rejected: ' || ${reason}`,
        metadata: sql`jsonb_set(${grievanceTransitions.metadata}, '{rejected}', 'true'::jsonb)`,
      })
      .where(eq(grievanceTransitions.id, transitionId));

    // Send rejection notification
    const transition = await db.query.grievanceTransitions.findFirst({
      where: eq(grievanceTransitions.id, transitionId),
    });

    if (transition) {
      await sendTransitionRejectedNotification(
        transition.claimId,
        transition.transitionedBy,
        reason,
        tenantId
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error rejecting transition:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// WORKFLOW STATUS & PROGRESS
// ============================================================================

/**
 * Get current workflow status for a grievance
 */
export async function getWorkflowStatus(
  claimId: string,
  tenantId: string
): Promise<WorkflowStatus | null> {
  try {
    // Get claim details
    const claim = await db.query.claims.findFirst({
      where: and(eq(claims.claimId, claimId), eq(claims.tenantId, tenantId)),
    });

    if (!claim) return null;

    // Get current transition
    const currentTransition = await db.query.grievanceTransitions.findFirst({
      where: eq(grievanceTransitions.claimId, claimId),
      orderBy: [desc(grievanceTransitions.transitionedAt)],
      with: {
        toStage: {
          with: {
            workflow: true,
          },
        },
      },
    });

    if (!currentTransition || !currentTransition.toStage) {
      return {
        currentStage: null,
        workflow: null,
        progress: 0,
        stagesCompleted: 0,
        totalStages: 0,
        upcomingDeadlines: [],
        isOverdue: false,
        daysInCurrentStage: 0,
      };
    }

    const currentStage = currentTransition.toStage;
    const workflow = currentTransition.toStage.workflow;

    // Get all stages in workflow
    const allStages = await db.query.grievanceStages.findMany({
      where: eq(grievanceStages.workflowId, workflow!.id),
      orderBy: [asc(grievanceStages.orderIndex)],
    });

    // Count completed stages
    const completedStages = allStages.filter(
      (stage) => stage.orderIndex < currentStage.orderIndex
    ).length;

    // Calculate progress percentage
    const progress = Math.round((completedStages / allStages.length) * 100);

    // Get upcoming deadlines
    const deadlines = await db.query.grievanceDeadlines.findMany({
      where: and(
        eq(grievanceDeadlines.claimId, claimId),
        isNull(grievanceDeadlines.isMet)
      ),
      orderBy: [asc(grievanceDeadlines.deadlineDate)],
    });

    const upcomingDeadlines = deadlines.map((deadline) => {
      const daysRemaining = Math.ceil(
        (new Date(deadline.deadlineDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return {
        type: deadline.deadlineType,
        date: new Date(deadline.deadlineDate),
        daysRemaining,
      };
    });

    // Check if any deadlines are overdue
    const isOverdue = upcomingDeadlines.some((d) => d.daysRemaining < 0);

    // Calculate days in current stage
    const daysInCurrentStage = Math.floor(
      (new Date().getTime() - new Date(currentTransition.transitionedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      currentStage,
      workflow,
      progress,
      stagesCompleted: completedStages,
      totalStages: allStages.length,
      upcomingDeadlines,
      isOverdue,
      daysInCurrentStage,
    };
  } catch (error) {
    console.error("Error getting workflow status:", error);
    return null;
  }
}

/**
 * Update claim progress based on workflow completion
 */
async function updateClaimProgress(claimId: string, tenantId: string): Promise<void> {
  try {
    const status = await getWorkflowStatus(claimId, tenantId);
    if (status) {
      await db
        .update(claims)
        .set({ progress: status.progress })
        .where(eq(claims.claimId, claimId));
    }
  } catch (error) {
    console.error("Error updating claim progress:", error);
  }
}

// ============================================================================
// STAGE ACTIONS & AUTOMATION
// ============================================================================

/**
 * Execute actions configured for stage entry/exit
 */
async function executeStageActions(
  actions: StageAction[],
  claimId: string,
  tenantId: string,
  userId: string
): Promise<string[]> {
  const executedActions: string[] = [];

  for (const action of actions) {
    try {
      switch (action.action_type) {
        case "notify":
          await sendActionNotification(claimId, action.action_config, tenantId);
          executedActions.push(`notify:${action.action_config.recipient || "all"}`);
          break;

        case "assign":
          await autoAssignOfficer(
            claimId,
            action.action_config.role,
            action.action_config.criteria,
            tenantId,
            userId
          );
          executedActions.push(`assign:${action.action_config.role}`);
          break;

        case "create_deadline":
          await createActionDeadline(
            claimId,
            action.action_config.type,
            action.action_config.days,
            tenantId
          );
          executedActions.push(`deadline:${action.action_config.type}`);
          break;

        case "send_email":
          await sendActionEmail(claimId, action.action_config, tenantId);
          executedActions.push(`email:${action.action_config.template}`);
          break;

        case "create_document":
          await generateActionDocument(claimId, action.action_config, tenantId, userId);
          executedActions.push(`document:${action.action_config.template}`);
          break;

        default:
          console.warn(`Unknown action type: ${action.action_type}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action.action_type}:`, error);
    }
  }

  return executedActions;
}

/**
 * Schedule automatic transition based on conditions
 */
async function scheduleAutoTransition(
  claimId: string,
  currentStageId: string,
  nextStageId: string,
  tenantId: string
): Promise<void> {
  // Get stage conditions
  const stage = await db.query.grievanceStages.findFirst({
    where: eq(grievanceStages.id, currentStageId),
  });

  if (!stage) return;

  const conditions = stage.conditions as StageCondition[];

  // Check if conditions are met
  const conditionsMet = await evaluateConditions(claimId, conditions, tenantId);

  if (conditionsMet) {
    // Execute transition
    await transitionToStage(claimId, nextStageId, tenantId, "system", {
      triggerType: "automatic",
      reason: "Auto-transition conditions met",
    });
  }
}

/**
 * Evaluate transition conditions
 */
async function evaluateConditions(
  claimId: string,
  conditions: StageCondition[],
  tenantId: string
): Promise<boolean> {
  if (conditions.length === 0) return true;

  // Get claim data
  const claim = await db.query.claims.findFirst({
    where: and(eq(claims.claimId, claimId), eq(claims.tenantId, tenantId)),
  });

  if (!claim) return false;

  // Evaluate each condition
  for (const condition of conditions) {
    const fieldValue = (claim as any)[condition.field];

    switch (condition.operator) {
      case "equals":
        if (fieldValue !== condition.value) return false;
        break;
      case "not_equals":
        if (fieldValue === condition.value) return false;
        break;
      case "greater_than":
        if (!(fieldValue > condition.value)) return false;
        break;
      case "less_than":
        if (!(fieldValue < condition.value)) return false;
        break;
      case "contains":
        if (!String(fieldValue).includes(condition.value)) return false;
        break;
    }
  }

  return true;
}

// ============================================================================
// HELPER FUNCTIONS (Stubs - to be implemented)
// ============================================================================

async function createStageDeadline(
  claimId: string,
  stageId: string,
  days: number,
  tenantId: string
): Promise<void> {
  await db.insert(grievanceDeadlines).values({
    tenantId,
    claimId,
    stageId,
    deadlineType: "stage_completion",
    deadlineDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    calculatedFrom: "stage_entry",
    daysFromSource: days,
  });
}

async function sendStageNotification(
  claimId: string,
  stage: GrievanceStage,
  action: string,
  tenantId: string
): Promise<void> {
  // TODO: Integrate with notification system
  console.log(`Notification: Claim ${claimId} ${action} stage ${stage.name}`);
}

async function sendActionNotification(
  claimId: string,
  config: Record<string, any>,
  tenantId: string
): Promise<void> {
  // TODO: Implement notification sending
  console.log(`Action notification for claim ${claimId}`);
}

async function autoAssignOfficer(
  claimId: string,
  role: string,
  criteria: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<void> {
  // TODO: Implement intelligent assignment (Week 2)
  console.log(`Auto-assign officer for claim ${claimId} with role ${role}`);
}

async function createActionDeadline(
  claimId: string,
  type: string,
  days: number,
  tenantId: string
): Promise<void> {
  await db.insert(grievanceDeadlines).values({
    tenantId,
    claimId,
    deadlineType: type,
    deadlineDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    calculatedFrom: "action_triggered",
    daysFromSource: days,
  });
}

async function sendActionEmail(
  claimId: string,
  config: Record<string, any>,
  tenantId: string
): Promise<void> {
  // TODO: Integrate with email system
  console.log(`Send email for claim ${claimId}`);
}

async function generateActionDocument(
  claimId: string,
  config: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<void> {
  // TODO: Implement document generation (Week 2)
  console.log(`Generate document for claim ${claimId}`);
}

async function sendTransitionRejectedNotification(
  claimId: string,
  requesterId: string,
  reason: string,
  tenantId: string
): Promise<void> {
  // TODO: Integrate with notification system
  console.log(`Transition rejected for claim ${claimId}: ${reason}`);
}

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Process overdue deadlines and trigger escalations
 * Should be run as a cron job every hour
 */
export async function processOverdueDeadlines(): Promise<void> {
  try {
    const overdueDeadlines = await db.query.grievanceDeadlines.findMany({
      where: and(
        isNull(grievanceDeadlines.isMet),
        lte(grievanceDeadlines.deadlineDate, new Date().toISOString().split("T")[0]),
        eq(grievanceDeadlines.escalateOnMiss, true),
        isNull(grievanceDeadlines.escalatedAt)
      ),
    });

    for (const deadline of overdueDeadlines) {
      // Mark as escalated
      await db
        .update(grievanceDeadlines)
        .set({ escalatedAt: new Date() })
        .where(eq(grievanceDeadlines.id, deadline.id));

      // Send escalation notification
      if (deadline.escalateTo) {
        // TODO: Send notification to escalation recipient
        console.log(`Escalating overdue deadline ${deadline.id} to ${deadline.escalateTo}`);
      }
    }
  } catch (error) {
    console.error("Error processing overdue deadlines:", error);
  }
}

/**
 * Send deadline reminders
 * Should be run as a cron job daily
 */
export async function sendDeadlineReminders(): Promise<void> {
  try {
    const allDeadlines = await db.query.grievanceDeadlines.findMany({
      where: and(
        isNull(grievanceDeadlines.isMet),
        gte(grievanceDeadlines.deadlineDate, new Date().toISOString().split("T")[0])
      ),
    });

    for (const deadline of allDeadlines) {
      const daysUntilDeadline = Math.ceil(
        (new Date(deadline.deadlineDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Check if reminder should be sent
      if (deadline.reminderDays?.includes(daysUntilDeadline)) {
        // TODO: Send reminder notification
        console.log(`Sending reminder for deadline ${deadline.id}, ${daysUntilDeadline} days remaining`);

        // Update last reminder sent timestamp
        await db
          .update(grievanceDeadlines)
          .set({ lastReminderSentAt: new Date() })
          .where(eq(grievanceDeadlines.id, deadline.id));
      }
    }
  } catch (error) {
    console.error("Error sending deadline reminders:", error);
  }
}
