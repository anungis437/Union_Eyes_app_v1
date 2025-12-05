// =====================================================================================
// PKI Verification Service
// =====================================================================================
// Purpose: Verify digital signatures and document integrity
// Features:
// - Cryptographic signature verification using public keys
// - Document integrity checking (hash comparison)
// - Certificate validity verification
// - Bulk signature verification
// - Verification audit trail
// =====================================================================================

import { db } from '@/db';
import { digitalSignatures } from '@/db/migrations/schema';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { hashDocument, hashDocumentReference } from './signature-service';

// =====================================================================================
// TYPES
// =====================================================================================

export interface VerificationResult {
  isValid: boolean;
  signatureId: string;
  verifiedAt: Date;
  errors: string[];
  warnings: string[];
  details: {
    signatureValid: boolean;
    certificateValid: boolean;
    hashMatches: boolean;
    certificateExpired: boolean;
    certificateRevoked: boolean;
  };
}

export interface DocumentIntegrityResult {
  isIntact: boolean;
  documentId: string;
  documentHash: string;
  totalSignatures: number;
  validSignatures: number;
  invalidSignatures: number;
  verifiedAt: Date;
  signatureResults: VerificationResult[];
}

// =====================================================================================
// SIGNATURE VERIFICATION
// =====================================================================================

/**
 * Verify a digital signature cryptographically
 * Validates signature against document hash using public key
 */
export async function verifySignature(
  signatureId: string,
  documentContent?: Buffer | string
): Promise<VerificationResult> {
  // Fetch signature record
  const [signature] = await db
    .select()
    .from(digitalSignatures)
    .where(eq(digitalSignatures.id, signatureId))
    .limit(1);

  if (!signature) {
    throw new Error('Signature not found');
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const details = {
    signatureValid: false,
    certificateValid: false,
    hashMatches: false,
    certificateExpired: false,
    certificateRevoked: false,
  };

  // Check if signature is already marked as revoked or rejected
  if (signature.signatureStatus === 'revoked') {
    errors.push('Signature has been revoked');
    details.certificateRevoked = true;
  }

  if (signature.signatureStatus === 'rejected') {
    errors.push('Signature was rejected: ' + signature.rejectionReason);
  }

  // Check certificate validity period
  const now = new Date();
  const notBefore = new Date(signature.certificateNotBefore!);
  const notAfter = new Date(signature.certificateNotAfter!);

  if (now < notBefore) {
    errors.push('Certificate not yet valid');
  }

  if (now > notAfter) {
    errors.push('Certificate has expired');
    details.certificateExpired = true;
  } else {
    details.certificateValid = true;
  }

  // Verify document hash if content provided
  if (documentContent) {
    const calculatedHash = hashDocument(documentContent);
    if (calculatedHash === signature.documentHash) {
      details.hashMatches = true;
    } else {
      errors.push('Document hash mismatch - document may have been modified');
      details.hashMatches = false;
    }
  } else {
    warnings.push('Document content not provided - hash verification skipped');
  }

  // Verify cryptographic signature if not attestation-only
  if (signature.signatureValue && signature.signatureValue !== 'ATTESTATION') {
    try {
      // Create public key object
      const publicKey = crypto.createPublicKey({
        key: signature.publicKey!,
        format: 'pem',
      });

      // Verify signature
      const verify = crypto.createVerify('RSA-SHA512');
      verify.update(signature.documentHash!);
      verify.end();
      
      const isValidSignature = verify.verify(publicKey, signature.signatureValue, 'base64');
      
      if (isValidSignature) {
        details.signatureValid = true;
      } else {
        errors.push('Cryptographic signature verification failed');
        details.signatureValid = false;
      }
    } catch (error) {
      errors.push('Signature verification error: ' + (error as Error).message);
      details.signatureValid = false;
    }
  } else {
    // Attestation-only signature (no cryptographic verification needed)
    details.signatureValid = true;
    warnings.push('Attestation-only signature - cryptographic verification not applicable');
  }

  // Overall validity
  const isValid = 
    details.certificateValid &&
    details.signatureValid &&
    !details.certificateRevoked &&
    (documentContent ? details.hashMatches : true); // Only check hash if content provided

  // Update verification status in database
  if (isValid && signature.signatureStatus === 'signed') {
    await db
      .update(digitalSignatures)
      .set({
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        verificationMethod: documentContent ? 'full_cryptographic' : 'certificate_only',
        signatureStatus: 'signed',
      })
      .where(eq(digitalSignatures.id, signatureId));
  }

  return {
    isValid,
    signatureId,
    verifiedAt: new Date(),
    errors,
    warnings,
    details,
  };
}

/**
 * Verify document integrity by checking all signatures
 * Ensures document hasn't been tampered with after signing
 */
export async function verifyDocumentIntegrity(
  documentId: string,
  documentContent?: Buffer | string,
  organizationId?: string
): Promise<DocumentIntegrityResult> {
  // Fetch all signatures for document
  const conditions = [
    eq(digitalSignatures.documentId, documentId),
    inArray(digitalSignatures.signatureStatus, ['signed']),
  ];

  if (organizationId) {
    conditions.push(eq(digitalSignatures.organizationId, organizationId));
  }

  const signatures = await db
    .select()
    .from(digitalSignatures)
    .where(and(...conditions));

  if (signatures.length === 0) {
    throw new Error('No signatures found for document');
  }

  // Verify each signature
  const verificationResults: VerificationResult[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const sig of signatures) {
    const result = await verifySignature(sig.id, documentContent);
    verificationResults.push(result);
    
    if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  // Document is intact only if ALL signatures are valid
  const isIntact = invalidCount === 0;

  return {
    isIntact,
    documentId,
    documentHash: signatures[0].documentHash!,
    totalSignatures: signatures.length,
    validSignatures: validCount,
    invalidSignatures: invalidCount,
    verifiedAt: new Date(),
    signatureResults: verificationResults,
  };
}

/**
 * Bulk verify multiple signatures
 * Useful for batch verification operations
 */
export async function bulkVerifySignatures(
  signatureIds: string[]
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const signatureId of signatureIds) {
    try {
      const result = await verifySignature(signatureId);
      results.push(result);
    } catch (error) {
      results.push({
        isValid: false,
        signatureId,
        verifiedAt: new Date(),
        errors: [(error as Error).message],
        warnings: [],
        details: {
          signatureValid: false,
          certificateValid: false,
          hashMatches: false,
          certificateExpired: false,
          certificateRevoked: false,
        },
      });
    }
  }

  return results;
}

/**
 * Verify certificate chain (optional feature for CA validation)
 * Requires integration with external CA or certificate store
 * Placeholder for future implementation
 */
export async function verifyCertificateChain(
  certificateThumbprint: string
): Promise<{
  isValid: boolean;
  chainValid: boolean;
  trustedRoot: boolean;
  errors: string[];
}> {
  // TODO: Implement CA chain verification
  // Requires:
  // 1. Root CA certificate store
  // 2. Intermediate CA certificates
  // 3. Certificate chain parsing
  // 4. CRL (Certificate Revocation List) checking
  // 5. OCSP (Online Certificate Status Protocol) support
  
  return {
    isValid: true, // Placeholder
    chainValid: true, // Placeholder
    trustedRoot: false, // Not implemented yet
    errors: ['Certificate chain verification not yet implemented'],
  };
}

/**
 * Check if signature is still valid (not expired, not revoked)
 */
export async function isSignatureValid(signatureId: string): Promise<boolean> {
  const [signature] = await db
    .select()
    .from(digitalSignatures)
    .where(eq(digitalSignatures.id, signatureId))
    .limit(1);

  if (!signature) {
    return false;
  }

  // Check status
  if (signature.signatureStatus === 'revoked' || signature.signatureStatus === 'rejected') {
    return false;
  }

  // Check certificate expiry
  const now = new Date();
  const notAfter = new Date(signature.certificateNotAfter!);
  
  if (now > notAfter) {
    return false;
  }

  return true;
}

/**
 * Get verification history for a signature
 */
export async function getSignatureVerificationHistory(
  signatureId: string
): Promise<{
  signatureId: string;
  currentStatus: string;
  isVerified: boolean;
  lastVerifiedAt?: Date;
  verificationMethod?: string;
  signedAt: Date;
  revokedAt?: Date;
  revocationReason?: string;
}> {
  const [signature] = await db
    .select()
    .from(digitalSignatures)
    .where(eq(digitalSignatures.id, signatureId))
    .limit(1);

  if (!signature) {
    throw new Error('Signature not found');
  }

  return {
    signatureId: signature.id,
    currentStatus: signature.signatureStatus as string,
    isVerified: signature.isVerified ?? false,
    lastVerifiedAt: signature.verifiedAt ? new Date(signature.verifiedAt) : undefined,
    verificationMethod: signature.verificationMethod ?? undefined,
    signedAt: new Date(signature.signedAt!),
    revokedAt: signature.revokedAt ? new Date(signature.revokedAt) : undefined,
    revocationReason: signature.revocationReason ?? undefined,
  };
}

// =====================================================================================
// EXPORTS
// =====================================================================================

export const VerificationService = {
  verifySignature,
  verifyDocumentIntegrity,
  bulkVerifySignatures,
  verifyCertificateChain,
  isSignatureValid,
  getSignatureVerificationHistory,
};
