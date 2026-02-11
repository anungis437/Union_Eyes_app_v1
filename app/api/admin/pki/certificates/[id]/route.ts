import { logApiAuditEvent } from "@/lib/middleware/api-security";

// =====================================================================================
// PKI Certificate Details API - Get, Revoke
// =====================================================================================
// GET /api/admin/pki/certificates/[id] - Get certificate details
// DELETE /api/admin/pki/certificates/[id] - Revoke certificate
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { revokeCertificate } from '@/services/pki/certificate-manager';
import { db } from '@/db';
import { digitalSignatures } from '@/db/migrations/schema';
import { eq, and } from 'drizzle-orm';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(90, async (request, context) => {
  try {
      const { organizationId } = context;

      const certificateId = params.id;

      // Fetch certificate
      const [cert] = await db
        .select()
        .from(digitalSignatures)
        .where(
          and(
            eq(digitalSignatures.id, certificateId),
            eq(digitalSignatures.documentType, 'certificate'),
            organizationId ? eq(digitalSignatures.organizationId, organizationId) : undefined
          )
        )
        .limit(1);

      if (!cert) {
        return NextResponse.json(
          { error: 'Certificate not found' },
          { status: 404 }
        );
      }

      // Parse certificate info
      const certInfo = {
        id: cert.id,
        userId: cert.signerUserId,
        organizationId: cert.organizationId,
        subject: JSON.parse(cert.certificateSubject!),
        issuer: JSON.parse(cert.certificateIssuer!),
        serialNumber: cert.certificateSerialNumber,
        thumbprint: cert.certificateThumbprint,
        validFrom: cert.certificateNotBefore,
        validTo: cert.certificateNotAfter,
        status: cert.signatureStatus,
        isVerified: cert.isVerified,
        verifiedAt: cert.verifiedAt,
        signedAt: cert.signedAt,
        revokedAt: cert.revokedAt,
        revocationReason: cert.revocationReason,
      };

      return NextResponse.json({
        success: true,
        certificate: certInfo,
      });

    } catch (error) {
return NextResponse.json(
        { error: 'Failed to fetch certificate', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(90, async (request, context) => {
  try {
      const { organizationId } = context;

      const certificateId = params.id;
      const body = await request.json();
      const { reason } = body;

      if (!reason) {
        return NextResponse.json(
          { error: 'Revocation reason required' },
          { status: 400 }
        );
      }

      // Verify certificate belongs to user's organization
      const [cert] = await db
        .select()
        .from(digitalSignatures)
        .where(
          and(
            eq(digitalSignatures.id, certificateId),
            eq(digitalSignatures.documentType, 'certificate'),
            organizationId ? eq(digitalSignatures.organizationId, organizationId) : undefined
          )
        )
        .limit(1);

      if (!cert) {
        return NextResponse.json(
          { error: 'Certificate not found or access denied' },
          { status: 404 }
        );
      }

      // Revoke certificate
      await revokeCertificate(certificateId, reason);

      return NextResponse.json({
        success: true,
        message: 'Certificate revoked successfully',
      });

    } catch (error) {
return NextResponse.json(
        { error: 'Failed to revoke certificate', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request, { params });
};
