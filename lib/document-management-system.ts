// ============================================================================
// DOCUMENT MANAGEMENT SYSTEM
// ============================================================================
// Description: Version control, e-signature integration, OCR, full-text search,
//              and retention policy management for grievance documents
// Created: 2025-12-06
// ============================================================================

import { db } from "@/db/db";
import { eq, and, desc, asc, isNull, or, sql, ilike } from "drizzle-orm";
import {
  grievanceDocuments,
  claims,
  type InsertGrievanceDocument,
  type GrievanceDocument,
  type SignatureData,
} from "@/db/schema";
import { put } from "@vercel/blob";

// ============================================================================
// TYPES
// ============================================================================

export type DocumentUploadOptions = {
  category?: string;
  tags?: string[];
  isConfidential?: boolean;
  accessLevel?: "public" | "standard" | "confidential" | "restricted";
  requiresSignature?: boolean;
  retentionPeriodDays?: number;
  description?: string;
};

export type DocumentVersion = {
  version: number;
  documentId: string;
  uploadedBy: string;
  uploadedAt: Date;
  fileSize: number;
  changes?: string;
  status: string;
};

export type DocumentSearchResult = {
  document: GrievanceDocument;
  relevance: number;
  matchedFields: string[];
  excerpt?: string;
};

export type ESignatureRequest = {
  documentId: string;
  signerUserId: string;
  signerEmail: string;
  signerName: string;
  dueDate?: Date;
  message?: string;
  provider: "docusign" | "adobe_sign" | "internal";
};

export type ESignatureStatus = {
  documentId: string;
  status: "pending" | "sent" | "signed" | "declined" | "expired" | "voided";
  signedAt?: Date;
  signedBy?: string;
  provider?: string;
  envelopeId?: string;
  viewUrl?: string;
};

export type RetentionPolicy = {
  documentType: string;
  retentionDays: number;
  autoArchive: boolean;
  autoDelete: boolean;
};

// ============================================================================
// DOCUMENT UPLOAD & MANAGEMENT
// ============================================================================

/**
 * Upload new document to grievance
 */
export async function uploadDocument(
  claimId: string,
  tenantId: string,
  file: File,
  documentType: string,
  uploadedBy: string,
  options: DocumentUploadOptions = {}
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // Upload file to blob storage
    const blob = await put(`grievances/${claimId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // Create document record
    const [document] = await db
      .insert(grievanceDocuments)
      .values({
        organizationId: tenantId,
        claimId,
        documentName: file.name,
        documentType,
        filePath: blob.url,
        fileSize: file.size,
        mimeType: file.type,
        version: 1,
        isLatestVersion: true,
        versionStatus: "draft",
        description: options.description,
        tags: options.tags || [],
        category: options.category,
        isConfidential: options.isConfidential || false,
        accessLevel: options.accessLevel || "standard",
        requiresSignature: options.requiresSignature || false,
        retentionPeriodDays: options.retentionPeriodDays,
        uploadedBy,
        uploadedAt: new Date(),
      })
      .returning();

    // If OCR is needed for PDFs/images, queue OCR processing
    if (
      file.type === "application/pdf" ||
      file.type.startsWith("image/")
    ) {
      await queueOCRProcessing(document.id, blob.url);
    }

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("Error uploading document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload new version of existing document
 */
export async function uploadDocumentVersion(
  parentDocumentId: string,
  tenantId: string,
  file: File,
  uploadedBy: string,
  changes?: string
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // Get parent document
    const parentDoc = await db.query.grievanceDocuments.findFirst({
      where: and(
        eq(grievanceDocuments.id, parentDocumentId),
        eq(grievanceDocuments.organizationId, tenantId)
      ),
    });

    if (!parentDoc) {
      return { success: false, error: "Parent document not found" };
    }

    // Upload new file
    const blob = await put(
      `grievances/${parentDoc.claimId}/${file.name}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      }
    );

    // Get next version number
    const latestVersion = await db.query.grievanceDocuments.findFirst({
      where: eq(grievanceDocuments.parentDocumentId, parentDocumentId),
      orderBy: [desc(grievanceDocuments.version)],
    });

    const nextVersion = latestVersion?.version ? latestVersion.version + 1 : (parentDoc.version || 0) + 1;

    // Mark all previous versions as not latest
    await db
      .update(grievanceDocuments)
      .set({ isLatestVersion: false })
      .where(
        or(
          eq(grievanceDocuments.id, parentDocumentId),
          eq(grievanceDocuments.parentDocumentId, parentDocumentId)
        )
      );

    // Create new version
    const [newVersion] = await db
      .insert(grievanceDocuments)
      .values({
        organizationId: tenantId,
        claimId: parentDoc.claimId,
        documentName: file.name,
        documentType: parentDoc.documentType,
        filePath: blob.url,
        fileSize: file.size,
        mimeType: file.type,
        version: nextVersion,
        parentDocumentId,
        isLatestVersion: true,
        versionStatus: "draft",
        description: changes || parentDoc.description,
        tags: parentDoc.tags,
        category: parentDoc.category,
        isConfidential: parentDoc.isConfidential,
        accessLevel: parentDoc.accessLevel,
        requiresSignature: parentDoc.requiresSignature,
        retentionPeriodDays: parentDoc.retentionPeriodDays,
        uploadedBy,
        uploadedAt: new Date(),
      })
      .returning();

    // Queue OCR if needed
    if (
      file.type === "application/pdf" ||
      file.type.startsWith("image/")
    ) {
      await queueOCRProcessing(newVersion.id, blob.url);
    }

    return { success: true, documentId: newVersion.id };
  } catch (error) {
    console.error("Error uploading document version:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Get document version history
 */
export async function getDocumentVersions(
  documentId: string,
  tenantId: string
): Promise<DocumentVersion[]> {
  try {
    // Get root document
    const rootDoc = await db.query.grievanceDocuments.findFirst({
      where: and(
        eq(grievanceDocuments.id, documentId),
        eq(grievanceDocuments.organizationId, tenantId)
      ),
    });

    if (!rootDoc) return [];

    // Determine if this is a parent or child document
    const parentId = rootDoc.parentDocumentId || rootDoc.id;

    // Get all versions
    const versions = await db.query.grievanceDocuments.findMany({
      where: or(
        eq(grievanceDocuments.id, parentId),
        eq(grievanceDocuments.parentDocumentId, parentId)
      ),
      orderBy: [desc(grievanceDocuments.version)],
    });

    return versions.map((v) => ({
      version: v.version || 1,
      documentId: v.id,
      uploadedBy: v.uploadedBy,
      uploadedAt: v.uploadedAt ? new Date(v.uploadedAt) : new Date(),
      fileSize: Number(v.fileSize) || 0,
      changes: v.description || undefined,
      status: v.versionStatus || "draft",
    }));
  } catch (error) {
    console.error("Error getting document versions:", error);
    return [];
  }
}

/**
 * Restore previous version as latest
 */
export async function restoreDocumentVersion(
  versionId: string,
  tenantId: string,
  restoredBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const versionDoc = await db.query.grievanceDocuments.findFirst({
      where: and(
        eq(grievanceDocuments.id, versionId),
        eq(grievanceDocuments.organizationId, tenantId)
      ),
    });

    if (!versionDoc) {
      return { success: false, error: "Version not found" };
    }

    const parentId = versionDoc.parentDocumentId || versionDoc.id;

    // Mark all versions as not latest
    await db
      .update(grievanceDocuments)
      .set({ isLatestVersion: false })
      .where(
        or(
          eq(grievanceDocuments.id, parentId),
          eq(grievanceDocuments.parentDocumentId, parentId)
        )
      );

    // Mark restored version as latest
    await db
      .update(grievanceDocuments)
      .set({
        isLatestVersion: true,
        versionStatus: "approved",
      })
      .where(eq(grievanceDocuments.id, versionId));

    return { success: true };
  } catch (error) {
    console.error("Error restoring document version:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Restore failed",
    };
  }
}

// ============================================================================
// DOCUMENT SEARCH
// ============================================================================

/**
 * Search documents by name, content, or metadata
 */
export async function searchDocuments(
  tenantId: string,
  query: string,
  filters: {
    claimId?: string;
    documentType?: string;
    category?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    uploadedBy?: string;
  } = {}
): Promise<DocumentSearchResult[]> {
  try {
    let whereConditions = and(
      eq(grievanceDocuments.organizationId, tenantId),
      eq(grievanceDocuments.isLatestVersion, true)
    );

    // Apply filters
    if (filters.claimId) {
      whereConditions = and(whereConditions, eq(grievanceDocuments.claimId, filters.claimId));
    }
    if (filters.documentType) {
      whereConditions = and(
        whereConditions,
        eq(grievanceDocuments.documentType, filters.documentType)
      );
    }
    if (filters.uploadedBy) {
      whereConditions = and(
        whereConditions,
        eq(grievanceDocuments.uploadedBy, filters.uploadedBy)
      );
    }

    // Search by query (name, description, OCR text)
    const documents = await db.query.grievanceDocuments.findMany({
      where: whereConditions,
    });

    // Filter and rank results
    const results: DocumentSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const doc of documents) {
      let relevance = 0;
      const matchedFields: string[] = [];
      let excerpt = "";

      // Match in document name (high relevance)
      if (doc.documentName.toLowerCase().includes(lowerQuery)) {
        relevance += 50;
        matchedFields.push("name");
      }

      // Match in description
      if (doc.description && doc.description.toLowerCase().includes(lowerQuery)) {
        relevance += 30;
        matchedFields.push("description");
        excerpt = extractExcerpt(doc.description, lowerQuery);
      }

      // Match in OCR text (medium relevance)
      if (doc.ocrText && doc.ocrText.toLowerCase().includes(lowerQuery)) {
        relevance += 40;
        matchedFields.push("content");
        excerpt = excerpt || extractExcerpt(doc.ocrText, lowerQuery);
      }

      // Match in tags
      if (doc.tags && doc.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
        relevance += 20;
        matchedFields.push("tags");
      }

      // Apply tag filters
      if (filters.tags && filters.tags.length > 0) {
        const tagMatch = filters.tags.some((tag) => doc.tags?.includes(tag));
        if (!tagMatch) continue;
      }

      // Apply date filters
      const docDate = doc.uploadedAt ? new Date(doc.uploadedAt) : null;
      if (filters.dateFrom && docDate && docDate < filters.dateFrom) continue;
      if (filters.dateTo && docDate && docDate > filters.dateTo) continue;

      if (relevance > 0) {
        results.push({
          document: doc,
          relevance,
          matchedFields,
          excerpt,
        });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error("Error searching documents:", error);
    return [];
  }
}

/**
 * Extract excerpt around search term
 */
function extractExcerpt(text: string, query: string, contextLength: number = 100): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return "";

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + query.length + contextLength);
  let excerpt = text.substring(start, end);

  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";

  return excerpt;
}

// ============================================================================
// E-SIGNATURE INTEGRATION
// ============================================================================

/**
 * Request e-signature on document
 */
export async function requestESignature(
  request: ESignatureRequest
): Promise<{ success: boolean; signatureRequestId?: string; error?: string }> {
  try {
    // Get document
    const document = await db.query.grievanceDocuments.findFirst({
      where: eq(grievanceDocuments.id, request.documentId),
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    if (!document.requiresSignature) {
      return {
        success: false,
        error: "Document not configured for e-signature",
      };
    }

    // For now, use internal signature flow
    // TODO: Integrate with DocuSign/Adobe Sign APIs
    const signatureData: SignatureData = {
      provider: request.provider,
      timestamp: new Date().toISOString(),
    };

    await db
      .update(grievanceDocuments)
      .set({
        signatureStatus: "pending",
        signatureData,
      })
      .where(eq(grievanceDocuments.id, request.documentId));

    // Send notification to signer
    await sendSignatureRequestNotification(request);

    return {
      success: true,
      signatureRequestId: `sig_${document.id}_${Date.now()}`,
    };
  } catch (error) {
    console.error("Error requesting e-signature:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Signature request failed",
    };
  }
}

/**
 * Mark document as signed
 */
export async function markDocumentSigned(
  documentId: string,
  tenantId: string,
  signedBy: string,
  signatureData?: Partial<SignatureData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const document = await db.query.grievanceDocuments.findFirst({
      where: and(
        eq(grievanceDocuments.id, documentId),
        eq(grievanceDocuments.organizationId, tenantId)
      ),
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    await db
      .update(grievanceDocuments)
      .set({
        signatureStatus: "signed",
        signedBy,
        signedAt: new Date(),
        signatureData: {
          ...document.signatureData,
          ...signatureData,
        } as SignatureData,
        versionStatus: "approved", // Auto-approve signed documents
      })
      .where(eq(grievanceDocuments.id, documentId));

    return { success: true };
  } catch (error) {
    console.error("Error marking document as signed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as signed",
    };
  }
}

/**
 * Get signature status for document
 */
export async function getSignatureStatus(
  documentId: string,
  tenantId: string
): Promise<ESignatureStatus | null> {
  try {
    const document = await db.query.grievanceDocuments.findFirst({
      where: and(
        eq(grievanceDocuments.id, documentId),
        eq(grievanceDocuments.organizationId, tenantId)
      ),
    });

    if (!document || !document.requiresSignature) return null;

    const signatureData = document.signatureData as SignatureData | null;

    return {
      documentId: document.id,
      status: (document.signatureStatus as any) || "pending",
      signedAt: document.signedAt ? new Date(document.signedAt) : undefined,
      signedBy: document.signedBy || undefined,
      provider: signatureData?.provider,
      envelopeId: signatureData?.envelope_id,
    };
  } catch (error) {
    console.error("Error getting signature status:", error);
    return null;
  }
}

// ============================================================================
// DOCUMENT RETENTION & ARCHIVAL
// ============================================================================

/**
 * Apply retention policy to documents
 */
export async function applyRetentionPolicy(
  tenantId: string,
  policy: RetentionPolicy
): Promise<{ archivedCount: number; deletedCount: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Find documents matching policy
    const documents = await db.query.grievanceDocuments.findMany({
      where: and(
        eq(grievanceDocuments.organizationId, tenantId),
        eq(grievanceDocuments.documentType, policy.documentType),
        sql`${grievanceDocuments.uploadedAt} < ${cutoffDate.toISOString()}`
      ),
    });

    let archivedCount = 0;
    let deletedCount = 0;

    for (const doc of documents) {
      if (policy.autoArchive && !doc.archivedAt) {
        await db
          .update(grievanceDocuments)
          .set({ archivedAt: new Date() })
          .where(eq(grievanceDocuments.id, doc.id));
        archivedCount++;
      }

      if (policy.autoDelete && doc.archivedAt) {
        // Only delete if already archived
        await db
          .delete(grievanceDocuments)
          .where(eq(grievanceDocuments.id, doc.id));
        deletedCount++;
      }
    }

    return { archivedCount, deletedCount };
  } catch (error) {
    console.error("Error applying retention policy:", error);
    return { archivedCount: 0, deletedCount: 0 };
  }
}

/**
 * Archive document manually
 */
export async function archiveDocument(
  documentId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(grievanceDocuments)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(grievanceDocuments.id, documentId),
          eq(grievanceDocuments.organizationId, tenantId)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error archiving document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Archive failed",
    };
  }
}

/**
 * Get all documents for a grievance
 */
export async function getGrievanceDocuments(
  claimId: string,
  tenantId: string,
  options: {
    includeArchived?: boolean;
    latestOnly?: boolean;
    documentType?: string;
  } = {}
): Promise<GrievanceDocument[]> {
  try {
    let whereConditions = and(
      eq(grievanceDocuments.claimId, claimId),
      eq(grievanceDocuments.organizationId, tenantId)
    );

    if (!options.includeArchived) {
      whereConditions = and(whereConditions, isNull(grievanceDocuments.archivedAt));
    }

    if (options.latestOnly) {
      whereConditions = and(whereConditions, eq(grievanceDocuments.isLatestVersion, true));
    }

    if (options.documentType) {
      whereConditions = and(
        whereConditions,
        eq(grievanceDocuments.documentType, options.documentType)
      );
    }

    const documents = await db.query.grievanceDocuments.findMany({
      where: whereConditions,
      orderBy: [desc(grievanceDocuments.uploadedAt)],
    });

    return documents;
  } catch (error) {
    console.error("Error getting grievance documents:", error);
    return [];
  }
}

// ============================================================================
// OCR PROCESSING (Stub - requires OCR service integration)
// ============================================================================

async function queueOCRProcessing(documentId: string, fileUrl: string): Promise<void> {
  // TODO: Integrate with OCR service (Tesseract, Google Vision, AWS Textract, etc.)
  console.log(`Queuing OCR processing for document ${documentId}: ${fileUrl}`);
  
  // Placeholder: In production, this would:
  // 1. Download the file
  // 2. Process with OCR service
  // 3. Update document with extracted text
  // 4. Mark as indexed
}

/**
 * Update document with OCR text
 */
export async function updateDocumentOCR(
  documentId: string,
  ocrText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(grievanceDocuments)
      .set({
        ocrText,
        indexed: true,
      })
      .where(eq(grievanceDocuments.id, documentId));

    return { success: true };
  } catch (error) {
    console.error("Error updating document OCR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "OCR update failed",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function sendSignatureRequestNotification(
  request: ESignatureRequest
): Promise<void> {
  // TODO: Integrate with notification system
  console.log(`Sending signature request to ${request.signerEmail}`);
}
