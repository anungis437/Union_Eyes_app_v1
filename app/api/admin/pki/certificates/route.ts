import { logApiAuditEvent } from "@/lib/middleware/api-security";

// =====================================================================================
// PKI Certificates API - List & Upload
// =====================================================================================
// GET /api/admin/pki/certificates - List user certificates
// POST /api/admin/pki/certificates - Upload new certificate
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserCertificate,
  storeCertificate,
  getExpiringCertificates,
} from '@/services/pki/certificate-manager';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');

      // Admin action: Get expiring certificates
      if (action === 'expiring') {
        const days = parseInt(searchParams.get('days') ?? '30');
        const expiringCerts = await getExpiringCertificates(days);

        return NextResponse.json({
          success: true,
          certificates: expiringCerts,
          count: expiringCerts.length,
        });
      }

      // Default: Get user's certificate
      const cert = await getUserCertificate(userId, organizationId ?? undefined);

      if (!cert) {
        return NextResponse.json({
          success: true,
          certificate: null,
        });
      }

      return NextResponse.json({
        success: true,
        certificate: cert,
      });

    } catch (error) {
      console.error('Error fetching certificates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch certificates', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      if (!userId || !organizationId) {
        return NextResponse.json(
          { error: 'Unauthorized - Organization context required' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const { certificatePem } = body;

      if (!certificatePem) {
        return NextResponse.json(
          { error: 'Certificate PEM required' },
          { status: 400 }
        );
      }

      // Store certificate
      const storedCert = await storeCertificate(userId, organizationId, certificatePem);

      return NextResponse.json({
        success: true,
        certificate: storedCert,
        message: 'Certificate uploaded successfully',
      });

    } catch (error) {
      console.error('Error uploading certificate:', error);
      return NextResponse.json(
        { error: 'Failed to upload certificate', details: (error as Error).message },
        { status: 500 }
      );
    }
    })(request);
};
