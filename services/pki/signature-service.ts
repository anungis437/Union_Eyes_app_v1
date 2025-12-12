// =====================================================================================
// PKI Signature Service
// =====================================================================================
// Purpose: Handle document signing operations with digital signatures
// Features:
// - Document hash generation (SHA-512)
// - Digital signature creation with private keys
// - Signature request workflow management
// - Multi-party signing support
// - Audit trail logging
// =====================================================================================

import { db } from '@/db';
import { digitalSignatures } from '@/db/migrations/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { getUserCertificate } from './certificate-manager';

// =====================================================================================
// TYPES
// =====================================================================================

export interface SignatureRequest {
  id: string;
  documentId: string;
  documentType: string;
  requesterId: string;
  requesterName: string;
  organizationId: string;
  requiredSigners: SignerRequirement[];
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
}

export interface SignerRequirement {
  userId: string;
  userName: string;
  order: number; // For sequential signing
  role?: string;
  required: boolean;
  signedAt?: Date;
  signatureId?: string;
}

export interface SignDocumentParams {
  documentId: string;
  documentType: string;
  documentUrl?: string;
  userId: string;
  userName: string;
  userTitle?: string;
  userEmail?: string;
  organizationId: string;
  privateKeyPem?: string; // Optional: for actual signing
  password?: string; // For encrypted private keys
  ipAddress?: string;
  userAgent?: string;
  geolocation?: string;
}

export interface SignatureResult {
  signatureId: string;
  documentHash: string;
  signedAt: Date;
  certificateThumbprint: string;
}

// =====================================================================================
// DOCUMENT HASHING
// =====================================================================================

/**
 * Generate SHA-512 hash of document content
 * For file documents, caller should read file content first
 */
export function hashDocument(content: Buffer | string): string {
  const hash = crypto.createHash('sha512');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Generate hash from document URL/ID (for database records)
 * Creates deterministic hash based on document identifier
 */
export function hashDocumentReference(
  documentType: string,
  documentId: string,
  organizationId: string
): string {
  const reference = `${documentType}:${documentId}:${organizationId}`;
  return hashDocument(reference);
}

// =====================================================================================
// SIGNING OPERATIONS
// =====================================================================================

/**
 * Sign a document with user's stored certificate
 * For actual digital signatures, use signDocumentWithKey instead
 */
export async function signDocument(
  params: SignDocumentParams
): Promise<SignatureResult> {
  // Get user's active certificate
  const cert = await getUserCertificate(params.userId, params.organizationId);
  if (!cert) {
    throw new Error('No active certificate found for user');
  }

  // Generate document hash
  const documentHash = hashDocumentReference(
    params.documentType,
    params.documentId,
    params.organizationId
  );

  // Check for duplicate signature
  const existing = await db
    .select()
    .from(digitalSignatures)
    .where(
      and(
        eq(digitalSignatures.documentId, params.documentId),
        eq(digitalSignatures.signerUserId, params.userId),
        eq(digitalSignatures.signatureStatus, 'signed')
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Document already signed by this user');
  }

  // Create signature record
  const [signature] = await db
    .insert(digitalSignatures)
    .values({
      organizationId: params.organizationId,
      documentType: params.documentType,
      documentId: params.documentId,
      documentHash,
      documentUrl: params.documentUrl,
      signatureType: 'digital_signature',
      signatureStatus: 'signed',
      signerUserId: params.userId,
      signerName: params.userName,
      signerTitle: params.userTitle,
      signerEmail: params.userEmail,
      certificateSubject: JSON.stringify(cert.certificateInfo.subject),
      certificateIssuer: JSON.stringify(cert.certificateInfo.issuer),
      certificateSerialNumber: cert.certificateInfo.serialNumber,
      certificateThumbprint: cert.certificateInfo.fingerprint,
      certificateNotBefore: cert.certificateInfo.validFrom.toISOString(),
      certificateNotAfter: cert.certificateInfo.validTo.toISOString(),
      signatureAlgorithm: 'SHA-512',
      signatureValue: 'ATTESTATION', // Placeholder for attestation-only signatures
      publicKey: cert.certificateInfo.publicKey,
      signedAt: new Date().toISOString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      geolocation: params.geolocation,
    })
    .returning();

  return {
    signatureId: signature.id,
    documentHash,
    signedAt: new Date(signature.signedAt!),
    certificateThumbprint: signature.certificateThumbprint!,
  };
}

/**
 * Sign document with actual cryptographic signature using private key
 * For production use with real PKI infrastructure
 */
export async function signDocumentWithKey(
  params: SignDocumentParams & {
    documentContent: Buffer | string;
    privateKeyPem: string;
    password?: string;
  }
): Promise<SignatureResult> {
  // Get user's active certificate
  const cert = await getUserCertificate(params.userId, params.organizationId);
  if (!cert) {
    throw new Error('No active certificate found for user');
  }

  // Generate document hash
  const documentHash = hashDocument(params.documentContent);

  // Check for duplicate signature
  const existing = await db
    .select()
    .from(digitalSignatures)
    .where(
      and(
        eq(digitalSignatures.documentId, params.documentId),
        eq(digitalSignatures.signerUserId, params.userId),
        eq(digitalSignatures.signatureStatus, 'signed')
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Document already signed by this user');
  }

  // Decrypt private key if password provided
  let privateKey: crypto.KeyObject;
  try {
    if (params.password) {
      privateKey = crypto.createPrivateKey({
        key: params.privateKeyPem,
        format: 'pem',
        passphrase: params.password,
      });
    } else {
      privateKey = crypto.createPrivateKey({
        key: params.privateKeyPem,
        format: 'pem',
      });
    }
  } catch (error) {
    throw new Error('Failed to decrypt private key: ' + (error as Error).message);
  }

  // Generate cryptographic signature
  const sign = crypto.createSign('RSA-SHA512');
  sign.update(documentHash);
  sign.end();
  const signatureValue = sign.sign(privateKey, 'base64');

  // Create signature record
  const [signature] = await db
    .insert(digitalSignatures)
    .values({
      organizationId: params.organizationId,
      documentType: params.documentType,
      documentId: params.documentId,
      documentHash,
      documentUrl: params.documentUrl,
      signatureType: 'document_approval',
      signatureStatus: 'signed',
      signerUserId: params.userId,
      signerName: params.userName,
      signerTitle: params.userTitle,
      signerEmail: params.userEmail,
      certificateSubject: JSON.stringify(cert.certificateInfo.subject),
      certificateIssuer: JSON.stringify(cert.certificateInfo.issuer),
      certificateSerialNumber: cert.certificateInfo.serialNumber,
      certificateThumbprint: cert.certificateInfo.fingerprint,
      certificateNotBefore: cert.certificateInfo.validFrom.toISOString(),
      certificateNotAfter: cert.certificateInfo.validTo.toISOString(),
      signatureAlgorithm: 'RSA-SHA512',
      signatureValue,
      publicKey: cert.certificateInfo.publicKey,
      signedAt: new Date().toISOString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      geolocation: params.geolocation,
    })
    .returning();

  return {
    signatureId: signature.id,
    documentHash,
    signedAt: new Date(signature.signedAt!),
    certificateThumbprint: signature.certificateThumbprint!,
  };
}

/**
 * Get all signatures for a document
 */
export async function getDocumentSignatures(
  documentId: string,
  organizationId?: string
): Promise<any[]> {
  const conditions = [eq(digitalSignatures.documentId, documentId)];
  
  if (organizationId) {
    conditions.push(eq(digitalSignatures.organizationId, organizationId));
  }

  const signatures = await db
    .select()
    .from(digitalSignatures)
    .where(and(...conditions))
    .orderBy(digitalSignatures.signedAt);

  return signatures.map(sig => ({
    id: sig.id,
    signerUserId: sig.signerUserId,
    signerName: sig.signerName,
    signerTitle: sig.signerTitle,
    signerEmail: sig.signerEmail,
    signatureStatus: sig.signatureStatus,
    signedAt: sig.signedAt ? new Date(sig.signedAt) : null,
    certificateThumbprint: sig.certificateThumbprint,
    isVerified: sig.isVerified,
    verifiedAt: sig.verifiedAt ? new Date(sig.verifiedAt) : null,
  }));
}

/**
 * Reject a signature (for workflow approvals)
 */
export async function rejectSignature(
  signatureId: string,
  rejectionReason: string,
  rejectedBy: string
): Promise<void> {
  await db
    .update(digitalSignatures)
    .set({
      signatureStatus: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason,
    })
    .where(eq(digitalSignatures.id, signatureId));
}

// =====================================================================================
// SIGNATURE WORKFLOW MANAGEMENT
// =====================================================================================

/**
 * Create signature request workflow
 * For multi-party document signing (e.g., collective agreements, contracts)
 */
export async function createSignatureRequest(
  documentId: string,
  documentType: string,
  organizationId: string,
  requesterId: string,
  requesterName: string,
  requiredSigners: Omit<SignerRequirement, 'signedAt' | 'signatureId'>[],
  dueDate?: Date
): Promise<SignatureRequest> {
  // Sort signers by order for sequential signing
  const sortedSigners = [...requiredSigners].sort((a, b) => a.order - b.order);

  // Store workflow in database (requires workflow table - placeholder for now)
  // In production, create a separate signature_workflows table
  
  const workflow: SignatureRequest = {
    id: crypto.randomUUID(),
    documentId,
    documentType,
    requesterId,
    requesterName,
    organizationId,
    requiredSigners: sortedSigners,
    dueDate,
    status: 'pending',
    createdAt: new Date(),
  };

  // TODO: Store in signature_workflows table when created
  // For now, return in-memory object (would need separate migration)
  
  return workflow;
}

/**
 * Get signature requests for user (pending signatures)
 */
export async function getUserSignatureRequests(
  userId: string,
  organizationId?: string,
  status?: 'pending' | 'in_progress' | 'completed' | 'expired'
): Promise<SignatureRequest[]> {
  // TODO: Query from signature_workflows table when created
  // For now, return empty array (requires workflow table migration)
  return [];
}

/**
 * Complete signature request step
 * Updates workflow when signer completes their signature
 */
export async function completeSignatureRequestStep(
  workflowId: string,
  userId: string,
  signatureId: string
): Promise<SignatureRequest> {
  // TODO: Update signature_workflows table when created
  // For now, throw not implemented (requires workflow table migration)
  throw new Error('Workflow table not yet implemented - requires migration 051');
}

/**
 * Cancel signature request
 */
export async function cancelSignatureRequest(
  workflowId: string,
  cancelledBy: string,
  cancellationReason: string
): Promise<void> {
  // TODO: Update signature_workflows table when created
  throw new Error('Workflow table not yet implemented - requires migration 051');
}

/**
 * Expire signature requests past due date
 * Should be called by cron job
 */
export async function expireOverdueSignatureRequests(): Promise<number> {
  // TODO: Update signature_workflows table when created
  throw new Error('Workflow table not yet implemented - requires migration 051');
}

// =====================================================================================
// EXPORTS
// =====================================================================================

export const SignatureService = {
  hashDocument,
  hashDocumentReference,
  signDocument,
  signDocumentWithKey,
  getDocumentSignatures,
  rejectSignature,
  createSignatureRequest,
  getUserSignatureRequests,
  completeSignatureRequestStep,
  cancelSignatureRequest,
  expireOverdueSignatureRequests,
};
