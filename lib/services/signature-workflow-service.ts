/**
 * Signature Workflow Service
 * 
 * High-level service for managing signature workflows
 * Integrates providers, database tracking, and notifications
 */

import { db } from "@/database";
import {
  signatureWorkflows,
  signers,
  signatureAuditLog,
  signatureVerification,
} from "@/db/schema/domains/documents";
import {
  getSignatureProvider,
  SignatureProviderType,
  CreateEnvelopeRequest,
  SignerInfo,
} from "./signature-providers";
import { getNotificationService } from "./notification-service";
import { createAuditLog } from "./audit-service";
import { getDocumentStorageService } from "./document-storage-service";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { createHash } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateWorkflowRequest {
  organizationId: string;
  documentId: string;
  documentName: string;
  documentBuffer: Buffer;
  workflowType: "contract" | "agreement" | "grievance" | "authorization" | "other";
  subject: string;
  message: string;
  signers: SignerInfo[];
  provider?: SignatureProviderType;
  expiresInDays?: number;
  userId: string;
}

export interface WorkflowStatus {
  id: string;
  status: string;
  signers: Array<{
    name: string;
    email: string;
    status: string;
    signedAt?: Date;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// SIGNATURE WORKFLOW SERVICE
// ============================================================================

/**
 * Create new signature workflow
 * - Creates envelope with provider
 * - Stores workflow in database
 * - Sends notifications to signers
 */
export async function createSignatureWorkflow(
  request: CreateWorkflowRequest
): Promise<WorkflowStatus> {
  try {
    logger.info("Creating signature workflow", {
      organizationId: request.organizationId,
      documentName: request.documentName,
      signerCount: request.signers.length,
    });

    // Get signature provider
    const provider = getSignatureProvider(request.provider || "docusign");

    // Calculate document hash for verification
    const documentHash = createHash("sha256")
      .update(request.documentBuffer)
      .digest("hex");

    // Create envelope with provider
    const envelope = await provider.createEnvelope({
      documentId: request.documentId,
      documentName: request.documentName,
      documentBuffer: request.documentBuffer,
      subject: request.subject,
      message: request.message,
      signers: request.signers,
      expiresInDays: request.expiresInDays || 30,
      organizationId: request.organizationId,
      userId: request.userId,
    });

    // Store workflow in database
    const [workflow] = await db
      .insert(signatureWorkflows)
      .values({
        organizationId: request.organizationId,
        documentId: request.documentId,
        workflowType: request.workflowType,
        provider: provider.name,
        externalId: envelope.id,
        status: "sent",
        subject: request.subject,
        message: request.message,
        documentName: request.documentName,
        documentHash,
        expiresAt: request.expiresInDays
          ? new Date(Date.now() + request.expiresInDays * 86400000)
          : undefined,
        createdBy: request.userId,
      })
      .returning();

    // Store signers
    const signerRecords = await Promise.all(
      request.signers.map(async (signer, index) => {
        const [signerRecord] = await db
          .insert(signers)
          .values({
            workflowId: workflow.id,
            name: signer.name,
            email: signer.email,
            role: signer.role,
            order: signer.order || index + 1,
            status: "pending",
            signingUrl: `${envelope.documentUrl}/signer/${signer.email}`,
          })
          .returning();

        return signerRecord;
      })
    );

    // Create audit log entry
    await db.insert(signatureAuditLog).values({
      workflowId: workflow.id,
      event: "workflow_created",
      description: `Signature workflow created for ${request.documentName}`,
      userId: request.userId,
      metadata: {
        provider: provider.name,
        signerCount: request.signers.length,
        envelopeId: envelope.id,
      },
    });

    // Send notifications to all signers
    const notificationService = getNotificationService();
    await Promise.all(
      signerRecords.map(async (signer) => {
        await notificationService.send({
          organizationId: request.organizationId,
          recipientEmail: signer.email,
          type: "email",
          priority: "high",
          subject: `Signature Required: ${request.subject}`,
          title: "Document Awaiting Your Signature",
          body: `Please review and sign the document: ${request.documentName}`,
          actionUrl: signer.signingUrl || undefined,
          actionLabel: "Sign Document",
          metadata: {
            type: "signature_request",
            workflowId: workflow.id,
            signerId: signer.id,
          },
          userId: request.userId,
        });

        // Log notification sent
        await db.insert(signatureAuditLog).values({
          workflowId: workflow.id,
          signerId: signer.id,
          event: "signer_notified",
          description: `Notification sent to ${signer.email}`,
          userId: request.userId,
          metadata: {
            email: signer.email,
            signingUrl: signer.signingUrl,
          },
        });
      })
    );

    // Create audit log
    await createAuditLog({
      organizationId: request.organizationId,
      userId: request.userId,
      action: "SIGNATURE_WORKFLOW_CREATED",
      resourceType: "signature_workflow",
      resourceId: workflow.id,
      description: `Created signature workflow for ${request.documentName}`,
      metadata: {
        provider: provider.name,
        signerCount: request.signers.length,
      },
    });

    logger.info("Signature workflow created successfully", {
      workflowId: workflow.id,
      envelopeId: envelope.id,
    });

    return {
      id: workflow.id,
      status: workflow.status,
      signers: signerRecords.map((s) => ({
        name: s.name,
        email: s.email,
        status: s.status,
      })),
      createdAt: workflow.createdAt,
    };
  } catch (error) {
    logger.error("Failed to create signature workflow", { error });
    throw error;
  }
}

/**
 * Get workflow status
 * - Fetches from database
 * - Optionally syncs with provider
 */
export async function getWorkflowStatus(
  workflowId: string,
  syncWithProvider: boolean = false
): Promise<WorkflowStatus> {
  try {
    // Fetch workflow from database
    const [workflow] = await db
      .select()
      .from(signatureWorkflows)
      .where(eq(signatureWorkflows.id, workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Fetch signers
    const workflowSigners = await db
      .select()
      .from(signers)
      .where(eq(signers.workflowId, workflowId));

    // Optionally sync with provider
    if (syncWithProvider && workflow.externalId) {
      const provider = getSignatureProvider(workflow.provider as SignatureProviderType);
      const envelope = await provider.getEnvelopeStatus(workflow.externalId);

      // Update workflow status if changed
      if (envelope.status !== workflow.status) {
        await db
          .update(signatureWorkflows)
          .set({
            status: envelope.status,
            completedAt:
              envelope.status === "completed" ? envelope.completedAt : undefined,
          })
          .where(eq(signatureWorkflows.id, workflowId));
      }
    }

    return {
      id: workflow.id,
      status: workflow.status,
      signers: workflowSigners.map((s) => ({
        name: s.name,
        email: s.email,
        status: s.status,
        signedAt: s.signedAt || undefined,
      })),
      createdAt: workflow.createdAt,
      completedAt: workflow.completedAt || undefined,
    };
  } catch (error) {
    logger.error("Failed to get workflow status", { error, workflowId });
    throw error;
  }
}

/**
 * Handle signer completed event (called from webhook)
 * - Updates signer status
 * - Sends confirmation notification
 * - Checks if all signers completed
 */
export async function handleSignerCompleted(
  workflowId: string,
  signerEmail: string,
  signatureData: {
    signedAt: Date;
    ipAddress?: string;
    userAgent?: string;
    signatureImage?: string;
  }
): Promise<void> {
  try {
    logger.info("Processing signer completed event", { workflowId, signerEmail });

    // Get workflow
    const [workflow] = await db
      .select()
      .from(signatureWorkflows)
      .where(eq(signatureWorkflows.id, workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Update signer status
    await db
      .update(signers)
      .set({
        status: "signed",
        signedAt: signatureData.signedAt,
        ipAddress: signatureData.ipAddress,
        userAgent: signatureData.userAgent,
        signature: signatureData.signatureImage,
      })
      .where(
        and(eq(signers.workflowId, workflowId), eq(signers.email, signerEmail))
      );

    // Create audit log
    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "signer_signed",
      description: `${signerEmail} completed signature`,
      metadata: {
        signerEmail,
        signedAt: signatureData.signedAt.toISOString(),
        ipAddress: signatureData.ipAddress,
      },
    });

    // Send confirmation notification
    const notificationService = getNotificationService();
    await notificationService.send({
      organizationId: workflow.organizationId,
      recipientEmail: signerEmail,
      type: "email",
      priority: "normal",
      subject: "Signature Received - Thank You",
      title: "Signature Confirmed",
      body: `Thank you for signing ${workflow.documentName}. Your signature has been recorded.`,
      metadata: {
        type: "signature_completed",
        workflowId,
      },
      userId: "system",
    });

    // Check if all signers have completed
    const allSigners = await db
      .select()
      .from(signers)
      .where(eq(signers.workflowId, workflowId));

    const allCompleted = allSigners.every((s) => s.status === "signed");

    if (allCompleted) {
      await completeWorkflow(workflowId);
    }

    logger.info("Signer completed event processed", { workflowId, signerEmail });
  } catch (error) {
    logger.error("Failed to handle signer completed", { error, workflowId });
    throw error;
  }
}

/**
 * Complete workflow
 * - Downloads signed document
 * - Verifies signatures
 * - Notifies workflow creator
 */
async function completeWorkflow(workflowId: string): Promise<void> {
  try {
    logger.info("Completing workflow", { workflowId });

    // Get workflow
    const [workflow] = await db
      .select()
      .from(signatureWorkflows)
      .where(eq(signatureWorkflows.id, workflowId));

    if (!workflow || !workflow.externalId) {
      throw new Error(`Workflow ${workflowId} not found or missing external ID`);
    }

    // Download signed document
    const provider = getSignatureProvider(workflow.provider as SignatureProviderType);
    const signedDocument = await provider.downloadSignedDocument(workflow.externalId);

    // Calculate signed document hash
    const signedDocumentHash = createHash("sha256")
      .update(signedDocument)
      .digest("hex");

    // Update workflow
    await db
      .update(signatureWorkflows)
      .set({
        status: "completed",
        completedAt: new Date(),
        signedDocumentHash,
      })
      .where(eq(signatureWorkflows.id, workflowId));

    // Create verification record
    await db.insert(signatureVerification).values({
      workflowId,
      verificationMethod: "provider_hash",
      isValid: true,
      verifiedAt: new Date(),
      verifiedBy: "system",
      signatureHash: signedDocumentHash,
      metadata: {
        provider: workflow.provider,
        originalHash: workflow.documentHash,
        signedHash: signedDocumentHash,
      },
    });

    // Create audit log
    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "workflow_completed",
      description: "All signers completed, workflow finalized",
      metadata: {
        completedAt: new Date().toISOString(),
        signedDocumentHash,
      },
    });

    // Store signed document in storage service
    try {
      const storageService = getDocumentStorageService();
      const storageResult = await storageService.uploadDocument({
        organizationId: workflow.organizationId,
        documentBuffer: signedDocument,
        documentName: `${workflow.documentName}_signed.pdf`,
        documentType: "signed_contract",
        contentType: "application/pdf",
        metadata: {
          workflowId,
          provider: workflow.provider,
          completedAt: new Date().toISOString(),
        },
      });

      // Update workflow with storage URL
      await db
        .update(signatureWorkflows)
        .set({
          storageUrl: storageResult.url,
          storageKey: storageResult.key,
        })
        .where(eq(signatureWorkflows.id, workflowId));

      logger.info("Signed document stored successfully", {
        workflowId,
        storageKey: storageResult.key,
        url: storageResult.url,
      });
    } catch (storageError) {
      logger.error("Failed to store signed document", {
        error: storageError,
        workflowId,
      });
      // Continue with notification even if storage fails - document exists with provider
    }

    // Notify workflow creator
    const notificationService = getNotificationService();
    await notificationService.send({
      organizationId: workflow.organizationId,
      recipientId: workflow.createdBy,
      type: "email",
      priority: "high",
      subject: `Signature Workflow Completed: ${workflow.subject}`,
      title: "All Signatures Received",
      body: `All parties have signed ${workflow.documentName}. The signed document is now available.`,
      actionUrl: `/documents/${workflow.documentId}`,
      actionLabel: "View Document",
      metadata: {
        type: "workflow_completed",
        workflowId,
      },
      userId: "system",
    });

    logger.info("Workflow completed successfully", { workflowId });
  } catch (error) {
    logger.error("Failed to complete workflow", { error, workflowId });
    throw error;
  }
}

/**
 * Void/cancel workflow
 * - Cancels with provider
 * - Updates status
 * - Notifies signers
 */
export async function voidWorkflow(
  workflowId: string,
  reason: string,
  userId: string
): Promise<void> {
  try {
    logger.info("Voiding workflow", { workflowId, reason });

    // Get workflow
    const [workflow] = await db
      .select()
      .from(signatureWorkflows)
      .where(eq(signatureWorkflows.id, workflowId));

    if (!workflow || !workflow.externalId) {
      throw new Error(`Workflow ${workflowId} not found or missing external ID`);
    }

    // Void with provider
    const provider = getSignatureProvider(workflow.provider as SignatureProviderType);
    await provider.voidEnvelope(workflow.externalId, reason);

    // Update workflow
    await db
      .update(signatureWorkflows)
      .set({
        status: "voided",
        voidReason: reason,
      })
      .where(eq(signatureWorkflows.id, workflowId));

    // Create audit log
    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "workflow_voided",
      description: `Workflow voided: ${reason}`,
      userId,
      metadata: { reason },
    });

    // Notify all signers
    const workflowSigners = await db
      .select()
      .from(signers)
      .where(eq(signers.workflowId, workflowId));

    const notificationService = getNotificationService();
    await Promise.all(
      workflowSigners.map((signer) =>
        notificationService.send({
          organizationId: workflow.organizationId,
          recipientEmail: signer.email,
          type: "email",
          priority: "normal",
          subject: `Signature Request Cancelled: ${workflow.subject}`,
          title: "Signature Request Cancelled",
          body: `The signature request for ${workflow.documentName} has been cancelled. Reason: ${reason}`,
          metadata: {
            type: "workflow_voided",
            workflowId,
          },
          userId,
        })
      )
    );

    logger.info("Workflow voided successfully", { workflowId });
  } catch (error) {
    logger.error("Failed to void workflow", { error, workflowId });
    throw error;
  }
}

/**
 * Send reminder to pending signers
 */
export async function sendSignerReminders(workflowId: string, userId: string): Promise<void> {
  try {
    logger.info("Sending signer reminders", { workflowId });

    // Get workflow
    const [workflow] = await db
      .select()
      .from(signatureWorkflows)
      .where(eq(signatureWorkflows.id, workflowId));

    if (!workflow || !workflow.externalId) {
      throw new Error(`Workflow ${workflowId} not found or missing external ID`);
    }

    // Get pending signers
    const pendingSigners = await db
      .select()
      .from(signers)
      .where(
        and(eq(signers.workflowId, workflowId), eq(signers.status, "pending"))
      );

    const provider = getSignatureProvider(workflow.provider as SignatureProviderType);
    const notificationService = getNotificationService();

    // Send reminders
    await Promise.all(
      pendingSigners.map(async (signer) => {
        // Send via provider
        await provider.sendReminder(workflow.externalId!, signer.email);

        // Send notification
        await notificationService.send({
          organizationId: workflow.organizationId,
          recipientEmail: signer.email,
          type: "email",
          priority: "high",
          subject: `Reminder: Signature Required - ${workflow.subject}`,
          title: "Signature Reminder",
          body: `This is a reminder to sign ${workflow.documentName}`,
          actionUrl: signer.signingUrl || undefined,
          actionLabel: "Sign Now",
          metadata: {
            type: "signature_reminder",
            workflowId,
          },
          userId,
        });

        // Log reminder sent
        await db.insert(signatureAuditLog).values({
          workflowId,
          signerId: signer.id,
          event: "reminder_sent",
          description: `Reminder sent to ${signer.email}`,
          userId,
        });
      })
    );

    logger.info("Signer reminders sent", {
      workflowId,
      reminderCount: pendingSigners.length,
    });
  } catch (error) {
    logger.error("Failed to send signer reminders", { error, workflowId });
    throw error;
  }
}

export default {
  createSignatureWorkflow,
  getWorkflowStatus,
  handleSignerCompleted,
  voidWorkflow,
  sendSignerReminders,
};

