/**
 * Signature Service
 * 
 * High-level service for managing e-signatures with full audit trail
 */

import { db } from "@/db";
import {
  signatureDocuments,
  documentSigners,
  signatureAuditTrail,
  type NewSignatureDocument,
  type NewDocumentSigner,
  type NewSignatureAuditTrail,
} from "@/db/schema";
import SignatureProviderFactory, {
  type CreateEnvelopeRequest,
} from "./providers";
import { eq, and, desc } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * Signature Document Service
 */
export class SignatureService {
  /**
   * Create and send a document for signature
   */
  static async createSignatureRequest(data: {
    tenantId: string;
    title: string;
    description?: string;
    documentType: string;
    file: Buffer;
    fileName: string;
    sentBy: string;
    signers: Array<{
      userId?: string;
      email: string;
      name: string;
      role?: string;
      signingOrder?: number;
    }>;
    provider?: "docusign" | "hellosign" | "internal";
    expirationDays?: number;
    requireAuthentication?: boolean;
    sequentialSigning?: boolean;
    metadata?: any;
  }): Promise<typeof signatureDocuments.$inferSelect> {
    // Calculate file hash for integrity
    const fileHash = createHash("sha256").update(data.file).digest("hex");

    // Get provider
    const provider = data.provider
      ? SignatureProviderFactory.getProvider(data.provider)
      : SignatureProviderFactory.getDefaultProvider();

    // Create envelope with provider
    const envelope = await provider.createEnvelope({
      document: {
        name: data.fileName,
        content: data.file,
        fileType: data.fileName.split(".").pop() || "pdf",
      },
      signers: data.signers.map((s) => ({
        email: s.email,
        name: s.name,
        role: s.role,
        order: s.signingOrder,
      })),
      subject: data.title,
      message: data.description,
      expirationDays: data.expirationDays || 30,
    });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expirationDays || 30));

    // Create document record
    const [document] = await db
      .insert(signatureDocuments)
      .values({
        tenantId: data.tenantId,
        title: data.title,
        description: data.description,
        documentType: data.documentType,
        fileUrl: `/signatures/documents/${envelope.envelopeId}`, // TODO: Upload to storage
        fileName: data.fileName,
        fileSizeBytes: data.file.length,
        fileHash,
        provider: provider.name as any,
        providerDocumentId: envelope.envelopeId,
        providerEnvelopeId: envelope.envelopeId,
        status: "sent",
        sentBy: data.sentBy,
        sentAt: new Date(),
        expiresAt,
        requireAuthentication: data.requireAuthentication || false,
        sequentialSigning: data.sequentialSigning || false,
        metadata: data.metadata,
      })
      .returning();

    // Create signer records
    const signerRecords = await Promise.all(
      data.signers.map(async (signer, index) => {
        const providerSigner = envelope.signers[index];

        const [signerRecord] = await db
          .insert(documentSigners)
          .values({
            documentId: document.id,
            userId: signer.userId,
            email: signer.email,
            name: signer.name,
            role: signer.role,
            signingOrder: signer.signingOrder || index + 1,
            status: "sent",
            sentAt: new Date(),
            providerSignerId: providerSigner.signerId,
          })
          .returning();

        return signerRecord;
      })
    );

    // Create audit trail entry
    await AuditTrailService.log({
      documentId: document.id,
      eventType: "document_created",
      eventDescription: `Document "${data.title}" created and sent for signature`,
      actorUserId: data.sentBy,
      metadata: {
        provider: provider.name,
        signerCount: data.signers.length,
      },
    });

    await AuditTrailService.log({
      documentId: document.id,
      eventType: "document_sent",
      eventDescription: `Document sent to ${data.signers.length} signer(s)`,
      actorUserId: data.sentBy,
    });

    return document;
  }

  /**
   * Get document status
   */
  static async getDocumentStatus(documentId: string) {
    const document = await db.query.signatureDocuments.findFirst({
      where: eq(signatureDocuments.id, documentId),
      with: {
        signers: true,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Optionally sync with provider for latest status
    if (document.providerEnvelopeId && document.status !== "completed") {
      await this.syncDocumentStatus(documentId);
    }

    return document;
  }

  /**
   * Sync document status with provider
   */
  static async syncDocumentStatus(documentId: string) {
    const document = await db.query.signatureDocuments.findFirst({
      where: eq(signatureDocuments.id, documentId),
    });

    if (!document || !document.providerEnvelopeId) {
      return;
    }

    try {
      const provider = SignatureProviderFactory.getProvider(
        document.provider as any
      );
      const status = await provider.getEnvelopeStatus(
        document.providerEnvelopeId
      );

      // Update document status
      if (status.status !== document.status) {
        await db
          .update(signatureDocuments)
          .set({
            status: status.status as any,
            updatedAt: new Date(),
            completedAt:
              status.status === "completed" ? new Date() : undefined,
          })
          .where(eq(signatureDocuments.id, documentId));

        await AuditTrailService.log({
          documentId,
          eventType: "status_changed",
          eventDescription: `Document status changed to ${status.status}`,
          metadata: { previousStatus: document.status, newStatus: status.status },
        });
      }

      // Update signer statuses
      // TODO: Match and update signer records
    } catch (error) {
      console.error("Failed to sync document status:", error);
    }
  }

  /**
   * Record signature
   */
  static async recordSignature(data: {
    signerId: string;
    signatureImageUrl: string;
    signatureType: "electronic" | "digital" | "wet";
    ipAddress?: string;
    userAgent?: string;
    geolocation?: any;
  }) {
    const [updated] = await db
      .update(documentSigners)
      .set({
        status: "signed",
        signedAt: new Date(),
        signatureType: data.signatureType,
        signatureImageUrl: data.signatureImageUrl,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        geolocation: data.geolocation,
        updatedAt: new Date(),
      })
      .where(eq(documentSigners.id, data.signerId))
      .returning();

    if (!updated) {
      throw new Error("Signer not found");
    }

    await AuditTrailService.log({
      documentId: updated.documentId,
      signerId: updated.id,
      eventType: "document_signed",
      eventDescription: `${updated.name} signed the document`,
      actorEmail: updated.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      geolocation: data.geolocation,
      metadata: {
        signatureType: data.signatureType,
      },
    });

    // Check if all signers have signed
    await this.checkCompletion(updated.documentId);

    return updated;
  }

  /**
   * Check if document is complete
   */
  private static async checkCompletion(documentId: string) {
    const signers = await db.query.documentSigners.findMany({
      where: eq(documentSigners.documentId, documentId),
    });

    const allSigned = signers.every((s) => s.status === "signed");

    if (allSigned) {
      await db
        .update(signatureDocuments)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureDocuments.id, documentId));

      await AuditTrailService.log({
        documentId,
        eventType: "document_completed",
        eventDescription: "All signers have completed signing",
      });
    }
  }

  /**
   * Void document
   */
  static async voidDocument(
    documentId: string,
    voidedBy: string,
    reason: string
  ) {
    const document = await db.query.signatureDocuments.findFirst({
      where: eq(signatureDocuments.id, documentId),
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Void with provider
    if (document.providerEnvelopeId) {
      try {
        const provider = SignatureProviderFactory.getProvider(
          document.provider as any
        );
        await provider.voidEnvelope(document.providerEnvelopeId, reason);
      } catch (error) {
        console.error("Failed to void with provider:", error);
      }
    }

    // Update document
    await db
      .update(signatureDocuments)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidedBy,
        voidReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(signatureDocuments.id, documentId));

    await AuditTrailService.log({
      documentId,
      eventType: "document_voided",
      eventDescription: `Document voided: ${reason}`,
      actorUserId: voidedBy,
      metadata: { reason },
    });
  }

  /**
   * Send reminder to signer
   */
  static async sendReminder(signerId: string) {
    const signer = await db.query.documentSigners.findFirst({
      where: eq(documentSigners.id, signerId),
    });

    if (!signer) {
      throw new Error("Signer not found");
    }

    // TODO: Send email reminder
    // await sendEmail({
    //   to: signer.email,
    //   subject: "Reminder: Document awaiting your signature",
    //   body: ...
    // });

    await AuditTrailService.log({
      documentId: signer.documentId,
      signerId,
      eventType: "reminder_sent",
      eventDescription: `Reminder sent to ${signer.name}`,
      actorEmail: signer.email,
    });
  }

  /**
   * Get documents for user
   */
  static async getUserDocuments(userId: string, tenantId: string) {
    // Documents sent by user
    const sent = await db
      .select()
      .from(signatureDocuments)
      .where(
        and(
          eq(signatureDocuments.sentBy, userId),
          eq(signatureDocuments.tenantId, tenantId)
        )
      )
      .orderBy(desc(signatureDocuments.createdAt));

    // Documents to be signed by user
    const toSign = await db
      .select({
        document: signatureDocuments,
        signer: documentSigners,
      })
      .from(documentSigners)
      .innerJoin(
        signatureDocuments,
        eq(documentSigners.documentId, signatureDocuments.id)
      )
      .where(
        and(
          eq(documentSigners.userId, userId),
          eq(signatureDocuments.tenantId, tenantId)
        )
      )
      .orderBy(desc(signatureDocuments.createdAt));

    return { sent, toSign };
  }
}

/**
 * Audit Trail Service
 */
export class AuditTrailService {
  static async log(data: {
    documentId: string;
    signerId?: string;
    eventType: string;
    eventDescription: string;
    actorUserId?: string;
    actorEmail?: string;
    actorRole?: string;
    ipAddress?: string;
    userAgent?: string;
    geolocation?: any;
    metadata?: any;
  }) {
    await db.insert(signatureAuditTrail).values({
      ...data,
      timestamp: new Date(),
    });
  }

  static async getDocumentAudit(documentId: string) {
    return await db
      .select()
      .from(signatureAuditTrail)
      .where(eq(signatureAuditTrail.documentId, documentId))
      .orderBy(signatureAuditTrail.timestamp);
  }

  static async getSignerAudit(signerId: string) {
    return await db
      .select()
      .from(signatureAuditTrail)
      .where(eq(signatureAuditTrail.signerId, signerId))
      .orderBy(signatureAuditTrail.timestamp);
  }

  /**
   * Generate audit report for legal compliance
   */
  static async generateAuditReport(documentId: string) {
    const document = await db.query.signatureDocuments.findFirst({
      where: eq(signatureDocuments.id, documentId),
      with: {
        signers: true,
      },
    });

    const auditLog = await this.getDocumentAudit(documentId);

    return {
      document: {
        id: document?.id,
        title: document?.title,
        fileHash: document?.fileHash,
        createdAt: document?.createdAt,
        completedAt: document?.completedAt,
        status: document?.status,
      },
      signers: document?.signers.map((s) => ({
        name: s.name,
        email: s.email,
        signedAt: s.signedAt,
        ipAddress: s.ipAddress,
        signatureType: s.signatureType,
      })),
      auditTrail: auditLog.map((entry) => ({
        timestamp: entry.timestamp,
        event: entry.eventType,
        description: entry.eventDescription,
        actor: entry.actorEmail || entry.actorUserId,
        ipAddress: entry.ipAddress,
      })),
      generatedAt: new Date(),
    };
  }
}

export default SignatureService;
