/**
 * Signature Webhooks
 * POST /api/signatures/webhooks/docusign
 * POST /api/signatures/webhooks/hellosign
 * 
 * Handles webhook events from e-signature providers
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureWebhooksLog, signatureDocuments, documentSigners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AuditTrailService } from "@/lib/signature/signature-service";
import { createHmac } from "crypto";

/**
 * DocuSign Webhook Handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-docusign-signature-1");

    // Verify webhook signature
    const isValid = verifyDocuSignSignature(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const envelopeId = payload.data?.envelopeId;

    // Log webhook
    await db.insert(signatureWebhooksLog).values({
      provider: "docusign",
      eventType: event,
      providerDocumentId: envelopeId,
      payload,
      headers: Object.fromEntries(req.headers),
      processingStatus: "pending",
      signatureVerified: isValid,
    });

    // Process event
    await processDocuSignEvent(payload);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("DocuSign webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function verifyDocuSignSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.DOCUSIGN_WEBHOOK_SECRET) {
    return false;
  }

  const hmac = createHmac("sha256", process.env.DOCUSIGN_WEBHOOK_SECRET);
  hmac.update(body);
  const computed = hmac.digest("base64");

  return computed === signature;
}

async function processDocuSignEvent(payload: any) {
  const event = payload.event;
  const envelopeId = payload.data?.envelopeId;

  // Find document
  const document = await db.query.signatureDocuments.findFirst({
    where: eq(signatureDocuments.providerEnvelopeId, envelopeId),
  });

  if (!document) {
    console.error("Document not found for envelope:", envelopeId);
    return;
  }

  switch (event) {
    case "envelope-sent":
      await AuditTrailService.log({
        documentId: document.id,
        eventType: "document_sent",
        eventDescription: "Document sent to signers",
        metadata: { provider: "docusign", envelopeId },
      });
      break;

    case "envelope-delivered":
      await db
        .update(signatureDocuments)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(signatureDocuments.id, document.id));

      await AuditTrailService.log({
        documentId: document.id,
        eventType: "document_delivered",
        eventDescription: "Document delivered to signers",
        metadata: { provider: "docusign" },
      });
      break;

    case "recipient-completed":
      const recipientEmail = payload.data?.recipientEmail;
      
      await AuditTrailService.log({
        documentId: document.id,
        eventType: "signer_completed",
        eventDescription: `${recipientEmail} completed signing`,
        actorEmail: recipientEmail,
        metadata: { provider: "docusign" },
      });
      break;

    case "envelope-completed":
      await db
        .update(signatureDocuments)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureDocuments.id, document.id));

      await AuditTrailService.log({
        documentId: document.id,
        eventType: "document_completed",
        eventDescription: "All signers completed signing",
        metadata: { provider: "docusign" },
      });
      break;

    case "envelope-voided":
      const voidReason = payload.data?.voidedReason;

      await db
        .update(signatureDocuments)
        .set({
          status: "voided",
          voidedAt: new Date(),
          voidReason,
          updatedAt: new Date(),
        })
        .where(eq(signatureDocuments.id, document.id));

      await AuditTrailService.log({
        documentId: document.id,
        eventType: "document_voided",
        eventDescription: `Document voided: ${voidReason}`,
        metadata: { provider: "docusign" },
      });
      break;

    default:
      console.log("Unhandled DocuSign event:", event);
  }
}
