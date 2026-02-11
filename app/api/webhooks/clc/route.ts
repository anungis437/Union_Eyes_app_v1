/**
 * CLC Webhook Handler
 * 
 * Handles Canadian Labour Congress API webhook events
 * Processes remittance updates, member syncs, and status changes
 * Implements signature verification and delivery tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database";
import {
  clcWebhookLog,
  clcSyncLog,
  clcRemittanceMapping,
  clcApiConfig,
} from "@/db/schema/clc-sync-schema";
import { organizationMembers } from "@/db/schema/organization-members-schema";
import { createAuditLog } from "@/lib/services/audit-service";
import { postGLTransaction } from "@/lib/services/general-ledger-service";
import { getNotificationService } from "@/lib/services/notification-service";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { createHmac, timingSafeEqual } from "crypto";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
import { cacheGet, cacheSet } from "@/lib/services/cache-service";

// ============================================================================
// TYPES
// ============================================================================

export interface CLCWebhookPayload {
  event_type: string;
  event_id: string;
  timestamp: number;
  organization_id: string;
  data: Record<string, unknown>;
  signature: string;
}

export interface CLCRemittanceUpdate {
  remittance_id: string;
  status: "pending" | "completed" | "failed" | "rejected";
  amount: number;
  member_count: number;
  processed_at: number;
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify CLC webhook signature using HMAC-SHA256
 * @throws Error if signature is invalid
 */
function normalizeSignature(signature: string): string {
  return signature.startsWith("sha256=") ? signature.replace("sha256=", "") : signature;
}

function safeCompareSignature(a: string, b: string): boolean {
  const sigA = Buffer.from(a, "hex");
  const sigB = Buffer.from(b, "hex");
  if (sigA.length !== sigB.length) return false;
  return timingSafeEqual(sigA, sigB);
}

function verifyCLCWebhookSignature(
  rawBody: string,
  payload: CLCWebhookPayload,
  sharedSecret: string,
  providedSignature: string
): boolean {
  try {
    const normalizedSignature = normalizeSignature(providedSignature);

    // Preferred verification: raw body
    const expectedFromRaw = createHmac("sha256", sharedSecret)
      .update(rawBody)
      .digest("hex");

    if (safeCompareSignature(normalizedSignature, expectedFromRaw)) {
      return true;
    }

    // Fallback: normalized JSON without signature
    const payloadCopy = { ...payload };
    delete (payloadCopy as Partial<CLCWebhookPayload>).signature;
    const normalizedBody = JSON.stringify(payloadCopy);
    const expectedFromNormalized = createHmac("sha256", sharedSecret)
      .update(normalizedBody)
      .digest("hex");

    return safeCompareSignature(normalizedSignature, expectedFromNormalized);
  } catch (error) {
    logger.error("Failed to verify CLC webhook signature", { error });
    return false;
  }
}

function isTimestampValid(timestampSec: number): { valid: boolean; reason?: string } {
  const maxSkewSec = Number(process.env.CLC_WEBHOOK_MAX_SKEW_SEC || 300);
  const nowSec = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(timestampSec)) {
    return { valid: false, reason: "Invalid timestamp" };
  }

  if (timestampSec > nowSec + maxSkewSec) {
    return { valid: false, reason: "Timestamp is in the future" };
  }

  if (timestampSec < nowSec - maxSkewSec) {
    return { valid: false, reason: "Timestamp is too old" };
  }

  return { valid: true };
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * CLC Webhook Handler
 * POST /api/webhooks/clc
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting (using IP address as key for webhooks)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await checkRateLimit(
      `webhook-clc:${ip}`,
      RATE_LIMITS.WEBHOOK_CALLS
    );

    if (!rateLimitResult.allowed) {
      logger.warn("CLC webhook rate limit exceeded", { ip });
      return NextResponse.json(
        { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse request body (keep raw for signature verification)
    const rawBody = await request.text();
    let payload: CLCWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as CLCWebhookPayload;
    } catch (error) {
      logger.warn("CLC webhook invalid JSON", { error });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    logger.info("CLC webhook event received", {
      eventType: payload.event_type,
      eventId: payload.event_id,
    });

    // Get CLC API config for this organization
    const config = await db.query.clcApiConfig.findFirst({
      where: and(
        eq(clcApiConfig.organizationId, payload.organization_id),
        eq(clcApiConfig.isActive, true)
      ),
    });

    if (!config?.sharedSecret) {
      logger.warn("CLC config not found for organization", {
        organizationId: payload.organization_id,
      });
    }
    //   return NextResponse.json(
    //     { error: "Organization not found" },
    //     { status: 404 }
    //   );
    // }

    // For now, use environment variable
    const sharedSecret = process.env.CLC_WEBHOOK_SECRET || "";

    if (!sharedSecret) {
      logger.warn("CLC_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const signatureHeader = request.headers.get("x-clc-signature");
    const providedSignature = signatureHeader || payload.signature;

    if (!providedSignature) {
      logger.warn("CLC webhook signature missing", {
        eventType: payload.event_type,
        eventId: payload.event_id,
      });
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const timestampCheck = isTimestampValid(payload.timestamp);
    if (!timestampCheck.valid) {
      logger.warn("CLC webhook timestamp invalid", {
        eventType: payload.event_type,
        eventId: payload.event_id,
        reason: timestampCheck.reason,
      });
      return NextResponse.json(
        { error: timestampCheck.reason || "Invalid timestamp" },
        { status: 400 }
      );
    }

    // Replay protection
    const replayKey = `webhook:clc:${payload.event_id}`;
    const alreadyProcessed = await cacheGet<string>(replayKey, { namespace: "webhooks" });
    if (alreadyProcessed) {
      logger.info("CLC webhook replay detected", {
        eventType: payload.event_type,
        eventId: payload.event_id,
      });
      return NextResponse.json({ received: true, duplicate: true, eventId: payload.event_id });
    }

    // Verify signature
    if (!verifyCLCWebhookSignature(rawBody, payload, sharedSecret, providedSignature)) {
      logger.warn("CLC webhook signature verification failed", {
        eventType: payload.event_type,
      });

      // Still log the webhook attempt
      await db.insert(clcWebhookLog).values({
        organizationId: payload.organization_id,
        eventType: payload.event_type,
        eventId: payload.event_id,
        signatureValid: false,
        status: "failed",
        failureReason: "Invalid signature",
        payload: payload as any,
        timestamp: new Date(payload.timestamp * 1000),
      });

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Mark event as processed for replay protection (24 hours)
    await cacheSet(replayKey, "processed", { namespace: "webhooks", ttl: 86400 });

    // Log webhook receipt
    const [webhookLog] = await db
      .insert(clcWebhookLog)
      .values({
        organizationId: payload.organization_id,
        eventType: payload.event_type,
        eventId: payload.event_id,
        signatureValid: true,
        status: "pending",
        payload: payload as any,
        timestamp: new Date(payload.timestamp * 1000),
      })
      .returning();

    // Route to appropriate handler
    try {
      switch (payload.event_type) {
        case "remittance.completed":
          await handleRemittanceCompleted(payload);
          break;

        case "remittance.failed":
          await handleRemittanceFailed(payload);
          break;

        case "remittance.rejected":
          await handleRemittanceRejected(payload);
          break;

        case "member.synced":
          await handleMemberSynced(payload);
          break;

        case "member.added":
          await handleMemberAdded(payload);
          break;

        case "member.removed":
          await handleMemberRemoved(payload);
          break;

        case "sync.completed":
          await handleSyncCompleted(payload);
          break;

        case "sync.failed":
          await handleSyncFailed(payload);
          break;

        default:
          logger.warn("Unhandled CLC webhook event", {
            eventType: payload.event_type,
          });
      }

      // Mark webhook as processed
      await db
        .update(clcWebhookLog)
        .set({
          status: "completed",
          processedAt: new Date(),
        })
        .where(eq(clcWebhookLog.id, webhookLog.id));
    } catch (error) {
      logger.error("CLC webhook processing failed", { error });

      // Mark webhook as failed
      await db
        .update(clcWebhookLog)
        .set({
          status: "failed",
          failureReason: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(clcWebhookLog.id, webhookLog.id));

      throw error;
    }

    return NextResponse.json({ received: true, eventId: payload.event_id });
  } catch (error) {
    logger.error("CLC webhook handler failed", { error });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle remittance completed webhook
 * - Updates remittance status
 * - Reconciles with local payment records
 * - Posts GL transaction
 */
async function handleRemittanceCompleted(
  payload: CLCWebhookPayload
): Promise<void> {
  try {
    logger.info("Processing remittance completed", {
      remittanceId: payload.data.remittance_id,
    });

    const update = payload.data as CLCRemittanceUpdate;

    // Update remittance mapping
    await db
      .update(clcRemittanceMapping)
      .set({
        clcRemittanceId: update.remittance_id,
        status: "completed",
        completedAt: new Date(update.processed_at * 1000),
        memberCount: update.member_count,
        updatedAt: new Date(),
      })
      .where(eq(clcRemittanceMapping.organizationId, payload.organization_id))
      .catch((err) => {
        logger.error("Failed to update remittance mapping", { error: err, remittanceId: update.remittance_id });
      });

    // Post GL transaction for remittance payment received
    await postGLTransaction({
      organizationId: payload.organization_id,
      accountNumber: "1010", // Cash/Bank (debit)
      debitAmount: update.amount,
      creditAmount: 0,
      description: `CLC remittance payment received - ID ${update.remittance_id}`,
      sourceSystem: "clc",
      sourceRecordId: update.remittance_id,
      userId: "system",
    }).catch((err) => {
      logger.error("Failed to post GL debit transaction for remittance", { error: err, remittanceId: update.remittance_id });
    });

    // Credit the CLC payable account
    await postGLTransaction({
      organizationId: payload.organization_id,
      accountNumber: "2015", // CLC Payables (credit)
      debitAmount: 0,
      creditAmount: update.amount,
      description: `CLC remittance liability cleared - ID ${update.remittance_id}`,
      sourceSystem: "clc",
      sourceRecordId: update.remittance_id,
      userId: "system",
    }).catch((err) => {
      logger.error("Failed to post GL credit transaction for remittance", { error: err, remittanceId: update.remittance_id });
    });

    // Create audit log
    await createAuditLog({
      organizationId: payload.organization_id,
      userId: "system",
      action: "CLC_REMITTANCE_COMPLETED",
      resourceType: "clc_remittance",
      resourceId: update.remittance_id,
      description: `CLC remittance completed: ${update.amount} for ${update.member_count} members`,
      metadata: {
        remittanceId: update.remittance_id,
        amount: update.amount,
        memberCount: update.member_count,
      },
    });

    logger.info("Remittance completed processed", {
      remittanceId: update.remittance_id,
      amount: update.amount,
    });
  } catch (error) {
    logger.error("Failed to process remittance completed", { error });
    throw error;
  }
}

/**
 * Handle remittance failed webhook
 * - Updates remittance status to failed
 * - Creates alert for manual review
 */
async function handleRemittanceFailed(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing remittance failed", {
      remittanceId: payload.data.remittance_id,
    });

    const update = payload.data as CLCRemittanceUpdate;

    // Update remittance mapping
    await db
      .update(clcRemittanceMapping)
      .set({
        clcRemittanceId: update.remittance_id,
        status: "failed",
        failedAt: new Date(),
        errorMessage: payload.data.error_message,
        updatedAt: new Date(),
      })
      .where(eq(clcRemittanceMapping.organizationId, payload.organization_id))
      .catch((err) => {
        logger.error("Failed to update remittance mapping", { error: err, remittanceId: update.remittance_id });
      });

    // Send alert notification for manual review
    const notificationService = getNotificationService();
    const orgAdmins = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, payload.organization_id),
        eq(organizationMembers.role, "admin")
      ),
      limit: 5,
    });

    for (const admin of orgAdmins) {
      if (admin.email) {
        await notificationService.send({
          organizationId: payload.organization_id,
          recipientId: admin.id,
          recipientEmail: admin.email,
          type: "email",
          priority: "high",
          subject: "CLC Remittance Failed - Manual Review Required",
          body: `Remittance ${update.remittance_id} failed processing. Error: ${payload.data.error_message}. Please review and address this issue immediately.`,
          actionUrl: `/dashboard/clc/remittances/${update.remittance_id}`,
          actionLabel: "View Remittance",
          userId: "system",
        }).catch((err) => logger.error("Failed to send failed remittance notification", { error: err }));
      }
    }

    // Create audit log
    await createAuditLog({
      organizationId: payload.organization_id,
      userId: "system",
      action: "CLC_REMITTANCE_FAILED",
      resourceType: "clc_remittance",
      resourceId: update.remittance_id,
      description: `CLC remittance failed: ${payload.data.error_message}`,
      metadata: {
        remittanceId: update.remittance_id,
        errorMessage: payload.data.error_message,
      },
    });

    logger.info("Remittance failed processed", {
      remittanceId: update.remittance_id,
    });
  } catch (error) {
    logger.error("Failed to process remittance failed", { error });
    throw error;
  }
}

/**
 * Handle remittance rejected webhook
 * - Updates status to rejected
 * - Requires manual intervention
 */
async function handleRemittanceRejected(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing remittance rejected", {
      remittanceId: payload.data.remittance_id,
    });

    const update = payload.data as CLCRemittanceUpdate;

    // Mark as rejected and require manual review
    await db
      .update(clcRemittanceMapping)
      .set({
        clcRemittanceId: update.remittance_id,
        status: "rejected",
        failedAt: new Date(),
        errorMessage: payload.data.rejection_reason || "Remittance rejected by CLC",
        requiresManualReview: true,
        updatedAt: new Date(),
      })
      .where(eq(clcRemittanceMapping.organizationId, payload.organization_id))
      .catch((err) => {
        logger.error("Failed to update rejected remittance mapping", { error: err, remittanceId: update.remittance_id });
      });

    // Send urgent alert to all admins
    const notificationService = getNotificationService();
    const orgAdmins = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, payload.organization_id),
        eq(organizationMembers.role, "admin")
      ),
    });

    for (const admin of orgAdmins) {
      if (admin.email) {
        await notificationService.send({
          organizationId: payload.organization_id,
          recipientId: admin.id,
          recipientEmail: admin.email,
          type: "email",
          priority: "urgent",
          subject: "URGENT: CLC Remittance Rejected - Immediate Action Required",
          body: `Remittance ${update.remittance_id} has been REJECTED by CLC. Reason: ${payload.data.rejection_reason}. This requires immediate attention and manual intervention.`,
          actionUrl: `/dashboard/clc/remittances/${update.remittance_id}`,
          actionLabel: "Review Rejection",
          userId: "system",
        }).catch((err) => logger.error("Failed to send rejected remittance notification", { error: err }));
      }
    }

    // Create audit log
    await createAuditLog({
      organizationId: payload.organization_id,
      userId: "system",
      action: "CLC_REMITTANCE_REJECTED",
      resourceType: "clc_remittance",
      resourceId: update.remittance_id,
      description: `CLC remittance rejected: ${payload.data.rejection_reason}`,
      metadata: {
        remittanceId: update.remittance_id,
        rejectionReason: payload.data.rejection_reason,
        requiresManualReview: true,
      },
    });

    logger.info("Remittance rejected processed", {
      remittanceId: update.remittance_id,
    });
  } catch (error) {
    logger.error("Failed to process remittance rejected", { error });
    throw error;
  }
}

/**
 * Handle member synced webhook
 * - Updates member data from CLC
 */
async function handleMemberSynced(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing member synced", {
      memberId: payload.data.member_id,
    });

    // Update member data from CLC
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, payload.organization_id),
        eq(organizationMembers.externalId, payload.data.member_id)
      ),
    });

    if (existingMember) {
      // Reconcile with local member records
      await db.update(organizationMembers)
        .set({
          firstName: payload.data.first_name || existingMember.firstName,
          lastName: payload.data.last_name || existingMember.lastName,
          email: payload.data.email || existingMember.email,
          phone: payload.data.phone || existingMember.phone,
          membershipType: payload.data.membership_type || existingMember.membershipType,
          membershipStatus: payload.data.membership_status || existingMember.membershipStatus,
          updatedAt: new Date(),
          updatedBy: 'system',
        })
        .where(eq(organizationMembers.id, existingMember.id))
        .catch((err) => {
          logger.error("Failed to update member from CLC sync", { error: err, memberId: payload.data.member_id });
        });

      logger.info("Member data updated from CLC", {
        memberId: payload.data.member_id,
        email: payload.data.email,
      });

      // Create audit log
      await createAuditLog({
        organizationId: payload.organization_id,
        userId: "system",
        action: "MEMBER_UPDATED_FROM_CLC",
        resourceType: "member",
        resourceId: payload.data.member_id,
        description: `Member data synced from CLC: ${payload.data.first_name} ${payload.data.last_name}`,
      });
    } else {
      logger.warn("Member not found for update", {
        memberId: payload.data.member_id,
        organizationId: payload.organization_id,
      });
    }

    logger.info("Member synced processed", {
      memberId: payload.data.member_id,
    });
  } catch (error) {
    logger.error("Failed to process member synced", { error });
    throw error;
  }
}

/**
 * Handle member added webhook
 */
async function handleMemberAdded(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing member added from CLC", {
      memberId: payload.data.member_id,
    });

    // Create new member record if not exists
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, payload.organization_id),
        eq(organizationMembers.externalId, payload.data.member_id)
      ),
    });

    if (!existingMember) {
      try {
        await db.insert(organizationMembers).values({
          organizationId: payload.organization_id,
          externalId: payload.data.member_id,
          firstName: payload.data.first_name || '',
          lastName: payload.data.last_name || '',
          email: payload.data.email,
          phone: payload.data.phone,
          status: 'active',
          membershipType: payload.data.membership_type || 'regular',
          membershipStatus: 'active',
          joinDate: payload.data.join_date ? new Date(payload.data.join_date) : new Date(),
          createdBy: 'system',
        });

        logger.info("New member created from CLC sync", {
          memberId: payload.data.member_id,
          email: payload.data.email,
        });

        // Create audit log
        await createAuditLog({
          organizationId: payload.organization_id,
          userId: "system",
          action: "MEMBER_CREATED_FROM_CLC",
          resourceType: "member",
          resourceId: payload.data.member_id,
          description: `Member synced from CLC: ${payload.data.first_name} ${payload.data.last_name}`,
        });
      } catch (error) {
        logger.error("Failed to create member from CLC", { error, memberId: payload.data.member_id });
      }
    } else {
      logger.info("Member already exists, skipping creation", {
        memberId: payload.data.member_id,
      });
    }

    logger.info("Member added processed", {
      memberId: payload.data.member_id,
    });
  } catch (error) {
    logger.error("Failed to process member added", { error });
    throw error;
  }
}

/**
 * Handle member removed webhook
 */
async function handleMemberRemoved(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing member removed from CLC", {
      memberId: payload.data.member_id,
    });

    // Deactivate member record
    const updateResult = await db.update(organizationMembers)
      .set({
        status: 'inactive',
        membershipStatus: 'inactive',
        updatedAt: new Date(),
        updatedBy: 'system',
      })
      .where(
        and(
          eq(organizationMembers.organizationId, payload.organization_id),
          eq(organizationMembers.externalId, payload.data.member_id)
        )
      );

    // Create audit log
    await createAuditLog({
      organizationId: payload.organization_id,
      userId: "system",
      action: "MEMBER_REMOVED_FROM_CLC",
      resourceType: "member",
      resourceId: payload.data.member_id,
      description: `Member deactivated from CLC sync: ${payload.data.member_id}`,
    });

    logger.info("Member removed processed", {
      memberId: payload.data.member_id,
    });
  } catch (error) {
    logger.error("Failed to process member removed", { error });
    throw error;
  }
}

/**
 * Handle sync completed webhook
 * - Records full sync completion
 */
async function handleSyncCompleted(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing CLC sync completed");

    // Create sync log record
    await db.insert(clcSyncLog).values({
      organizationId: payload.organization_id,
      syncType: "full",
      status: "completed",
      recordsProcessed: payload.data.record_count?.toString() || "0",
      startedAt: payload.data.started_at ? new Date(payload.data.started_at * 1000) : new Date(),
      completedAt: new Date(),
      initiatedBy: "clc-webhook",
    }).catch((err) => {
      logger.error("Failed to create sync log", { error: err });
    });

    // Create audit log
    await createAuditLog({
      organizationId: payload.organization_id,
      userId: "system",
      action: "CLC_SYNC_COMPLETED",
      resourceType: "clc_sync",
      resourceId: payload.event_id,
      description: `CLC sync completed: ${payload.data.record_count || 0} records processed`,
    });

    logger.info("CLC sync completed processed");
  } catch (error) {
    logger.error("Failed to process sync completed", { error });
    throw error;
  }
}

/**
 * Handle sync failed webhook
 */
async function handleSyncFailed(payload: CLCWebhookPayload): Promise<void> {
  try {
    logger.info("Processing CLC sync failed", {
      reason: payload.data.error_message,
    });

    // Create failed sync log record
    await db.insert(clcSyncLog).values({
      organizationId: payload.organization_id,
      syncType: payload.data.sync_type || "full",
      status: "failed",
      recordsProcessed: "0",
      errorMessage: payload.data.error_message,
      errorDetails: payload.data.error_details,
      startedAt: payload.data.started_at ? new Date(payload.data.started_at * 1000) : new Date(),
      completedAt: new Date(),
      initiatedBy: "clc-webhook",
    }).catch((err) => {
      logger.error("Failed to create failed sync log", { error: err });
    });

    // Create audit log for failed sync
    await createAuditLog({
      organizationId: payload.organization_id,
      userId: "system",
      action: "CLC_SYNC_FAILED",
      resourceType: "clc_sync",
      resourceId: payload.event_id,
      description: `CLC sync failed: ${payload.data.error_message}`,
      metadata: {
        errorMessage: payload.data.error_message,
        errorDetails: payload.data.error_details,
      },
    });

    logger.info("CLC sync failed processed");
  } catch (error) {
    logger.error("Failed to process sync failed", { error });
    throw error;
  }
}

/**
 * Publish webhook delivery status back to CLC
 * Used for delivery tracking and status updates
 */
export async function acknowledgeCLCWebhook(
  eventId: string,
  status: "received" | "processing" | "completed" | "failed"
): Promise<void> {
  try {
    // Implement HTTP POST to CLC to acknowledge receipt
    const CLC_API_URL = process.env.CLC_API_URL || "https://api.clc-ctc.ca";
    const CLC_API_KEY = process.env.CLC_API_KEY;

    if (!CLC_API_KEY) {
      logger.warn("CLC_API_KEY not configured, skipping webhook acknowledgment");
      return;
    }

    const response = await fetch(`${CLC_API_URL}/webhooks/${eventId}/acknowledge`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLC_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, timestamp: Date.now() }),
    });

    if (!response.ok) {
      throw new Error(`CLC API returned ${response.status}: ${response.statusText}`);
    }

    logger.info("CLC webhook acknowledged", { eventId, status });
  } catch (error) {
    logger.error("Failed to acknowledge CLC webhook", { error, eventId });
  }
}

/**
 * Retry failed CLC webhook
 */
export async function retryCLCWebhook(eventId: string): Promise<void> {
  try {
    // Fetch webhook from clcWebhookLog
    const webhookLog = await db.query.clcWebhookLog.findFirst({
      where: eq(clcWebhookLog.eventId, eventId),
    });

    if (!webhookLog) {
      logger.error("Webhook log not found for retry", { eventId });
      return;
    }

    if (webhookLog.retryCount >= 5) {
      logger.warn("Max retry attempts reached", { eventId, retryCount: webhookLog.retryCount });
      return;
    }

    // Reprocess the webhook by calling the main handler logic
    const payload = JSON.parse(webhookLog.payload) as CLCWebhookPayload;
    
    // Route to appropriate handler based on event type
    switch (payload.event_type) {
      case "remittance.completed":
        await handleRemittanceCompleted(payload);
        break;
      case "remittance.failed":
        await handleRemittanceFailed(payload);
        break;
      case "remittance.rejected":
        await handleRemittanceRejected(payload);
        break;
      case "member.added":
        await handleMemberAdded(payload);
        break;
      case "member.removed":
        await handleMemberRemoved(payload);
        break;
      case "member.updated":
        await handleMemberUpdated(payload);
        break;
      case "sync.completed":
        await handleSyncCompleted(payload);
        break;
      case "sync.failed":
        await handleSyncFailed(payload);
        break;
      default:
        logger.warn("Unknown event type for retry", { eventType: payload.event_type });
    }

    // Update retry count and status
    await db.update(clcWebhookLog)
      .set({
        retryCount: (webhookLog.retryCount || 0) + 1,
        status: "completed",
        processedAt: new Date(),
      })
      .where(eq(clcWebhookLog.eventId, eventId));

    logger.info("CLC webhook retry succeeded", { eventId, retryCount: (webhookLog.retryCount || 0) + 1 });
  } catch (error) {
    logger.error("Failed to retry CLC webhook", { error, eventId });
  }
}

export default {
  POST,
  acknowledgeCLCWebhook,
  retryCLCWebhook,
};

