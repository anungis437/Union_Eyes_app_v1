/**
 * Signature Provider Webhook Handler
 * 
 * Handles webhook callbacks from DocuSign, HelloSign, and Adobe Sign
 * Processes signature events and updates workflow status
 */

import { withRLSContext } from '@/lib/db/with-rls-context';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database";
import { signatureAuditLog } from "@/db/schema/domains/documents";
import { signatureWorkflows } from "@/db/schema/domains/documents/workflows";
import { profiles } from "@/db/schema/domains/member/profiles";
import { eq } from "drizzle-orm";
import {
  handleSignerCompleted,
  getWorkflowStatus,
} from "@/lib/services/signature-workflow-service";
import { getNotificationService } from "@/lib/services/notification-service";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// ============================================================================
// DOCUSIGN WEBHOOK HANDLER
// ============================================================================

/**
 * Verify DocuSign HMAC signature
 */
function verifyDocuSignSignature(payload: string, signature: string): boolean {
  try {
    const secret = process.env.DOCUSIGN_WEBHOOK_SECRET || "";
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64");

    return signature === expectedSignature;
  } catch (error) {
    logger.error("Failed to verify DocuSign signature", { error });
    return false;
  }
}

/**
 * Handle DocuSign webhook
 * POST /api/webhooks/docusign
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting (using IP address as key for webhooks)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await checkRateLimit(
      `webhook-signatures:${ip}`,
      RATE_LIMITS.WEBHOOK_CALLS
    );

    if (!rateLimitResult.allowed) {
      logger.warn("Signature webhook rate limit exceeded", { ip });
      return NextResponse.json(
        { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.text();
    const signature = request.headers.get("x-docusign-signature-1") || "";

    // Verify signature
    if (!verifyDocuSignSignature(body, signature)) {
      logger.warn("DocuSign webhook signature verification failed");
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Invalid signature'
    );
    }

    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON payload'
      );
    }
    logger.info("DocuSign webhook received", { event: payload.event });

    // Extract workflow ID from envelope custom fields
    const workflowId = payload.envelopeId; // Or extract from custom fields
    const event = payload.event;

    // Handle different events
    switch (event) {
      case "envelope-sent":
        await handleEnvelopeSent(workflowId, payload);
        break;

      case "recipient-signed":
        await handleRecipientSigned(workflowId, payload);
        break;

      case "envelope-completed":
        await handleEnvelopeCompleted(workflowId, payload);
        break;

      case "envelope-declined":
        await handleEnvelopeDeclined(workflowId, payload);
        break;

      case "envelope-voided":
        await handleEnvelopeVoided(workflowId, payload);
        break;

      default:
        logger.warn("Unhandled DocuSign event", { event });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("DocuSign webhook handler failed", { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Webhook processing failed',
      error
    );
  }
}

// ============================================================================
// HELLOSIGN WEBHOOK HANDLER
// ============================================================================

/**
 * Verify HelloSign HMAC signature
 */
function verifyHelloSignSignature(
  eventTime: string,
  eventType: string,
  eventHash: string,
  signature: string
): boolean {
  try {
    const apiKey = process.env.HELLOSIGN_API_KEY || "";
    const data = `${eventTime}${eventType}${eventHash}`;
    const expectedSignature = createHmac("sha256", apiKey)
      .update(data)
      .digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    logger.error("Failed to verify HelloSign signature", { error });
    return false;
  }
}

/**
 * Handle HelloSign webhook
 * POST /api/webhooks/hellosign
 */
export async function handleHelloSignWebhook(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const json = formData.get("json") as string;
    let payload: any;
    try {
      payload = JSON.parse(json);
    } catch (error) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON payload'
      );
    }

    logger.info("HelloSign webhook received", { event: payload.event.event_type });

    // Verify signature
    const signature = request.headers.get("x-hellosign-signature") || "";
    if (
      !verifyHelloSignSignature(
        payload.event.event_time,
        payload.event.event_type,
        payload.event.event_hash,
        signature
      )
    ) {
      logger.warn("HelloSign webhook signature verification failed");
      return standardErrorResponse(
      ErrorCode.AUTH_REQUIRED,
      'Invalid signature'
    );
    }

    const workflowId = payload.signature_request.signature_request_id;
    const eventType = payload.event.event_type;

    // Handle different events
    switch (eventType) {
      case "signature_request_sent":
        await handleEnvelopeSent(workflowId, payload);
        break;

      case "signature_request_signed":
        await handleRecipientSigned(workflowId, payload);
        break;

      case "signature_request_all_signed":
        await handleEnvelopeCompleted(workflowId, payload);
        break;

      case "signature_request_declined":
        await handleEnvelopeDeclined(workflowId, payload);
        break;

      case "signature_request_cancelled":
        await handleEnvelopeVoided(workflowId, payload);
        break;

      default:
        logger.warn("Unhandled HelloSign event", { eventType });
    }

    return NextResponse.json({ hello_signature: "HelloAPI" });
  } catch (error) {
    logger.error("HelloSign webhook handler failed", { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Webhook processing failed',
      error
    );
  }
}

// ============================================================================
// ADOBE SIGN WEBHOOK HANDLER
// ============================================================================

/**
 * Verify Adobe Sign webhook
 */
function verifyAdobeSignWebhook(payload: any, Record<string, unknown>, clientId: string): boolean {
  try {
    // Adobe Sign uses client ID verification
    return payload.webhookInfo?.applicationId === clientId;
  } catch (error) {
    logger.error("Failed to verify Adobe Sign webhook", { error });
    return false;
  }
}

/**
 * Handle Adobe Sign webhook
 * POST /api/webhooks/adobe-sign
 */
export async function handleAdobeSignWebhook(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const payload = await request.json();
    logger.info("Adobe Sign webhook received", { event: payload.event });

    const clientId = process.env.ADOBE_SIGN_CLIENT_ID || "";
    if (!verifyAdobeSignWebhook(payload, clientId)) {
      logger.warn("Adobe Sign webhook verification failed");
      return standardErrorResponse(
        ErrorCode.AUTH_ERROR,
        "Invalid webhook"
      );
    }

    const workflowId = payload.agreement?.id || payload.agreementId;
    const event = payload.event;

    // Handle different events
    switch (event) {
      case "AGREEMENT_CREATED":
        await handleEnvelopeSent(workflowId, payload);
        break;

      case "AGREEMENT_ACTION_COMPLETED":
        await handleRecipientSigned(workflowId, payload);
        break;

      case "AGREEMENT_ALL_PARTICIPANTS_SIGNED":
        await handleEnvelopeCompleted(workflowId, payload);
        break;

      case "AGREEMENT_REJECTED":
        await handleEnvelopeDeclined(workflowId, payload);
        break;

      case "AGREEMENT_CANCELLED":
        await handleEnvelopeVoided(workflowId, payload);
        break;

      default:
        logger.warn("Unhandled Adobe Sign event", { event });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Adobe Sign webhook handler failed", { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Webhook processing failed',
      error
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle envelope sent event
 */
async function handleEnvelopeSent(workflowId: string, payload: Record<string, unknown>) Record<string, unknown>): Promise<void> {
  try {
    logger.info("Processing envelope sent", { workflowId });

    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "envelope_sent",
      description: "Envelope sent to recipients",
      metadata: {
        provider: payload.provider || "unknown",
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to handle envelope sent", { error, workflowId });
  }
}

/**
 * Handle recipient signed event
 */
async function async function handleRecipientSigned(
  workflowId: string,
  payload: any Record<string, unknown>
): Promise<void> {
  try {
    logger.info("Processing recipient signed", { workflowId });

    // Extract signer info (format varies by provider)
    const signerEmail =
      payload.recipientEmail ||
      payload.signature?.signerEmailAddress ||
      payload.participantEmail;

    const signedAt = new Date(
      payload.completedDateTime ||
        payload.signature?.statusDate ||
        payload.timestamp ||
        Date.now()
    );

    // Handle signer completion
    await handleSignerCompleted(workflowId, signerEmail, {
      signedAt,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    });
  } catch (error) {
    logger.error("Failed to handle recipient signed", { error, workflowId });
  }
}

/**
 * Handle envelope completed event
 */
async function async function handleEnvelopeCompleted(
  workflowId: string,
  payload: any Record<string, unknown>
): Promise<void> {
  try {
    logger.info("Processing envelope completed", { workflowId });

    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "envelope_completed",
      description: "All recipients signed, envelope completed",
      metadata: {
        completedAt: new Date().toISOString(),
        provider: payload.provider || "unknown",
      },
    });

    // Workflow completion is handled in handleSignerCompleted
    // when last signer completes
  } catch (error) {
    logger.error("Failed to handle envelope completed", { error, workflowId });
  }
}

/**
 * Handle envelope declined event
 */
async function async function handleEnvelopeDeclined(
  workflowId: string,
  payload: any Record<string, unknown>
): Promise<void> {
  try {
    logger.info("Processing envelope declined", { workflowId });

    const signerEmail =
      payload.recipientEmail ||
      payload.signature?.signerEmailAddress ||
      payload.participantEmail;

    const declineReason = payload.declineReason || payload.reason || "No reason provided";

    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "signer_declined",
      description: `Signer ${signerEmail} declined: ${declineReason}`,
      metadata: {
        signerEmail,
        declineReason,
        declinedAt: new Date().toISOString(),
      },
    });

    // Send notification to workflow creator about decline
    try {
      const notificationService = getNotificationService();
      
      // Get workflow details to find creator
      const workflow = await withRLSContext(async (tx) => {
      return await tx.query.signatureWorkflows.findFirst({
        where: eq(signatureWorkflows.id, workflowId),
      });
    });

      if (workflow && workflow.createdBy) {
        // Get creator's email from profiles
        const creator = await withRLSContext(async (tx) => {
      return await tx.query.profiles.findFirst({
          where: eq(profiles.userId, workflow.createdBy),
        });
    });

        if (creator && creator.email) {
          await notificationService.send({
            organizationId: workflow.organizationId || 'unknown',
            recipientId: workflow.createdBy,
            recipientEmail: creator.email,
            type: 'email',
            priority: 'high',
            subject: 'Signature Request Declined',
            body: `Signer ${signerEmail} has declined your signature request.

Reason: ${declineReason}

Please review the workflow and take appropriate action.`,
            actionUrl: `/workflows/signatures/${workflowId}`,
            actionLabel: 'View Workflow',
            userId: 'system',
          }).catch((err) => {
            logger.error('Failed to send decline notification', { error: err, workflowId });
          });

          logger.info('Decline notification sent to creator', {
            workflowId,
            creator: creator.email,
            signer: signerEmail,
          });
        }
      }
    } catch (notificationError) {
      logger.error('Failed to send workflow decline notification', {
        error: notificationError,
        workflowId,
      });
    }
  } catch (error) {
    logger.error("Failed to handle envelope declined", { error, workflowId });
  }
}

/**
 * Handle envelope voided event
 */
async function async function handleEnvelopeVoided(
  workflowId: string,
  payload: any Record<string, unknown>
): Promise<void> {
  try {
    logger.info("Processing envelope voided", { workflowId });

    const voidReason = payload.voidedReason || payload.reason || "Cancelled by sender";

    await db.insert(signatureAuditLog).values({
      workflowId,
      event: "envelope_voided",
      description: `Envelope voided: ${voidReason}`,
      metadata: {
        voidReason,
        voidedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to handle envelope voided", { error, workflowId });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const docusignWebhook = { POST };
export const hellosignWebhook = { POST: handleHelloSignWebhook };
export const adobeSignWebhook = { POST: handleAdobeSignWebhook };

