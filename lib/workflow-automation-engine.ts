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
import { getNotificationService } from "@/lib/services/notification-service";
import {
  sendGrievanceStageChangeNotification,
  sendGrievanceAssignedNotification,
  sendGrievanceResolvedNotification,
  sendGrievanceEscalationNotification,
  sendGrievanceDeadlineReminder,
} from "@/lib/services/grievance-notifications";

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
        eq(grievanceWorkflows.organizationId, tenantId),
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
          eq(grievanceWorkflows.organizationId, tenantId),
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
        organizationId: tenantId,
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
          organizationId: tenantId,
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
        organizationId: tenantId,
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
        eq(grievanceTransitions.organizationId, tenantId),
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
      where: and(eq(claims.claimId, claimId), eq(claims.organizationId, tenantId)),
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
      const deadlineDate = deadline.deadlineDate || new Date();
      const daysRemaining = Math.ceil(
        (new Date(deadlineDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return {
        type: deadline.deadlineType,
        date: new Date(deadlineDate),
        daysRemaining,
      };
    });

    // Check if any deadlines are overdue
    const isOverdue = upcomingDeadlines.some((d) => d.daysRemaining < 0);

    // Calculate days in current stage
    const transitionDate = currentTransition.transitionedAt || new Date();
    const daysInCurrentStage = Math.floor(
      (new Date().getTime() - new Date(transitionDate).getTime()) /
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
    where: and(eq(claims.claimId, claimId), eq(claims.organizationId, tenantId)),
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
    organizationId: tenantId,
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
  try {
    // Get claim details
    const claim = await db.query.claims.findFirst({
      where: eq(claims.claimId, claimId),
    });

    if (!claim) {
      logger.warn(`Cannot send stage notification: claim ${claimId} not found`);
      return;
    }

    // Get assignments for this claim
    const assignments = await db.query.grievanceAssignments.findMany({
      where: and(
        eq(grievanceAssignments.claimId, claimId),
        or(
          eq(grievanceAssignments.status, 'assigned'),
          eq(grievanceAssignments.status, 'in_progress')
        )
      ),
    });

    const notificationService = getNotificationService();

    // Notify assigned officers
    for (const assignment of assignments) {
      await notificationService.send({
        organizationId: tenantId,
        recipientUserId: assignment.assignedTo,
        type: 'email',
        priority: 'normal',
        title: `Grievance Stage ${action}`,
        body: `Claim ${claim.claimNumber} has ${action} stage: ${stage.name}`,
        actionUrl: `/grievances/${claimId}`,
        actionLabel: 'View Claim',
        metadata: {
          type: 'grievance_stage_notification',
          claimId,
          stageId: stage.id,
        },
        userId: assignment.assignedBy,
      });
    }

    logger.info(`Stage notification sent for claim ${claimId}`);
  } catch (error) {
    logger.error(`Failed to send stage notification for claim ${claimId}`, { error });
  }
}

async function sendActionNotification(
  claimId: string,
  config: Record<string, any>,
  tenantId: string
): Promise<void> {
  try {
    const notificationService = getNotificationService();
    
    const recipientId = config.recipient || config.recipientId;
    const recipientEmail = config.recipientEmail;
    
    if (!recipientId && !recipientEmail) {
      logger.warn(`No recipient specified for action notification on claim ${claimId}`);
      return;
    }

    await notificationService.send({
      organizationId: tenantId,
      recipientUserId: recipientId,
      recipientEmail: recipientEmail,
      type: config.notificationType || 'email',
      priority: config.priority || 'normal',
      title: config.title || 'Grievance Action Notification',
      body: config.message || 'An action has been triggered on a grievance',
      actionUrl: config.actionUrl || `/grievances/${claimId}`,
      actionLabel: config.actionLabel || 'View Details',
      metadata: {
        type: 'grievance_action_notification',
        claimId,
      },
      userId: config.userId || 'system',
    });

    logger.info(`Action notification sent for claim ${claimId}`);
  } catch (error) {
    logger.error(`Failed to send action notification for claim ${claimId}`, { error });
  }
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
    organizationId: tenantId,
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
  try {
    const notificationService = getNotificationService();
    
    const recipientEmail = config.recipientEmail || config.recipient;
    if (!recipientEmail) {
      logger.warn(`No recipient email specified for action email on claim ${claimId}`);
      return;
    }

    await notificationService.send({
      organizationId: tenantId,
      recipientEmail: recipientEmail,
      type: 'email',
      priority: config.priority || 'normal',
      subject: config.subject || 'Grievance Update',
      title: config.title || 'Grievance Update',
      body: config.body || config.message || 'You have a new grievance update',
      htmlBody: config.htmlBody,
      actionUrl: config.actionUrl,
      actionLabel: config.actionLabel,
      metadata: {
        type: 'grievance_action_email',
        claimId,
      },
      userId: config.userId || 'system',
    });

    logger.info(`Action email sent for claim ${claimId}`);
  } catch (error) {
    logger.error(`Failed to send action email for claim ${claimId}`, { error });
  }
}

async function generateActionDocument(
  claimId: string,
  config: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<void> {
  // Document generation can use the PDF/Excel generators we created
  try {
    const documentType = config.documentType || 'pdf';
    const templateType = config.template || 'generic';
    
    logger.info(`Generating ${documentType} document for claim ${claimId} using template ${templateType}`);
    
    // TODO: Implement document generation using pdf-generator/excel-generator
    // This would fetch claim data and generate a document based on the template
    // For now, just log that we would generate it
    logger.info(`Document generation triggered for claim ${claimId}`);
  } catch (error) {
    logger.error(`Failed to generate document for claim ${claimId}`, { error });
  }
}

async function sendTransitionRejectedNotification(
  claimId: string,
  requesterId: string,
  reason: string,
  tenantId: string
): Promise<void> {
  try {
    const notificationService = getNotificationService();
    
    await notificationService.send({
      organizationId: tenantId,
      recipientUserId: requesterId,
      type: 'email',
      priority: 'high',
      title: 'Stage Transition Rejected',
      body: `Your request to transition claim ${claimId} was rejected. Reason: ${reason}`,
      actionUrl: `/grievances/${claimId}`,
      actionLabel: 'View Claim',
      metadata: {
        type: 'grievance_transition_rejected',
        claimId,
        reason,
      },
      userId: 'system',
    });

    logger.info(`Transition rejected notification sent for claim ${claimId}`);
  } catch (error) {
    logger.error(`Failed to send transition rejected notification for claim ${claimId}`, { error });
  }
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
        try {
          const notificationService = getNotificationService();
          await notificationService.send({
            organizationId: deadline.organizationId,
            recipientUserId: deadline.escalateTo,
            type: 'email',
            priority: 'urgent',
            title: 'ESCALATION: Overdue Deadline',
            body: `Deadline "${deadline.deadlineType}" for claim ${deadline.claimId} is overdue and has been escalated to you.`,
            actionUrl: `/grievances/${deadline.claimId}`,
            actionLabel: 'Review Claim',
            metadata: {
              type: 'grievance_deadline_escalation',
              deadlineId: deadline.id,
              claimId: deadline.claimId,
            },
            userId: 'system',
          });
          logger.info(`Escalation notification sent for overdue deadline ${deadline.id}`);
        } catch (error) {
          logger.error(`Failed to send escalation notification for deadline ${deadline.id}`, { error });
        }
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
      const deadlineDate = deadline.deadlineDate || new Date();
      const daysUntilDeadline = Math.ceil(
        (new Date(deadlineDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Check if reminder should be sent
      if (deadline.reminderDays?.includes(daysUntilDeadline)) {
        try {
          // Get claim details for notification context
          const claim = await db.query.claims.findFirst({
            where: eq(claims.claimId, deadline.claimId),
          });

          if (claim && deadline.assignedTo) {
            const assignees = Array.isArray(deadline.assignedTo) 
              ? deadline.assignedTo 
              : [deadline.assignedTo];

            const notificationService = getNotificationService();
            for (const assignee of assignees) {
              await notificationService.send({
                organizationId: deadline.organizationId,
                recipientEmail: assignee,
                type: 'email',
                priority: daysUntilDeadline <= 1 ? 'urgent' : 'high',
                title: `Deadline Reminder: ${daysUntilDeadline} Day(s) Remaining`,
                body: `Reminder: Deadline "${deadline.deadlineType}" for claim ${claim.claimNumber} is due in ${daysUntilDeadline} day(s).`,
                actionUrl: `/grievances/${deadline.claimId}`,
                actionLabel: 'View Claim',
                metadata: {
                  type: 'grievance_deadline_reminder',
                  deadlineId: deadline.id,
                  claimId: deadline.claimId,
                  daysRemaining: daysUntilDeadline,
                },
                userId: 'system',
              });
            }
            logger.info(`Reminder sent for deadline ${deadline.id}, ${daysUntilDeadline} days remaining`);
          }
        } catch (error) {
          logger.error(`Failed to send reminder for deadline ${deadline.id}`, { error });
        }

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
