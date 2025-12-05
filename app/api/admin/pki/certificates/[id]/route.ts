// =====================================================================================
// PKI Certificate Details API - Get, Revoke
// =====================================================================================
// GET /api/admin/pki/certificates/[id] - Get certificate details
// DELETE /api/admin/pki/certificates/[id] - Revoke certificate
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { revokeCertificate } from '@/services/pki/certificate-manager';
import { db } from '@/db';
import { digitalSignatures } from '@/db/migrations/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/admin/pki/certificates/[id]
 * Get certificate details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const certificateId = params.id;

    // Fetch certificate
    const [cert] = await db
      .select()
      .from(digitalSignatures)
      .where(
        and(
          eq(digitalSignatures.id, certificateId),
          eq(digitalSignatures.documentType, 'certificate'),
          orgId ? eq(digitalSignatures.organizationId, orgId) : undefined
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
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pki/certificates/[id]
 * Revoke certificate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
          orgId ? eq(digitalSignatures.organizationId, orgId) : undefined
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
    console.error('Error revoking certificate:', error);
    return NextResponse.json(
      { error: 'Failed to revoke certificate', details: (error as Error).message },
      { status: 500 }
    );
  }
}
