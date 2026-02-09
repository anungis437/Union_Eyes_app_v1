/**
 * Defensibility Pack Download API
 * 
 * PR-12: Complete Defensibility Pack Integration
 * 
 * Provides secure download of system-of-record exports with integrity verification
 * for arbitration proceedings, legal defense, and institutional accountability.
 * 
 * Endpoints:
 * - GET /api/claims/[id]/defensibility-pack - Download latest pack for claim
 * - GET /api/claims/[id]/defensibility-pack/verify - Verify pack integrity
 * 
 * Security:
 * - RLS policies enforce access control (member can see own packs, staff sees org packs)
 * - Audit trail logs all downloads (who, when, why)
 * - Integrity verification before every download
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defensibilityPacks, packDownloadLog, packVerificationLog } from '@/db/schema/defensibility-packs-schema';
import { claims } from '@/db/schema/claims-schema';
import { eq, desc, and } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { verifyPackIntegrity } from '@/lib/services/defensibility-pack';
import { createHash } from 'crypto';

/**
 * GET /api/claims/[id]/defensibility-pack
 * Download the latest defensibility pack for a claim
 * 
 * Query parameters:
 * - format: 'json' | 'download' (default: 'json')
 * - purpose: 'review' | 'arbitration' | 'legal' | 'member_request' (default: 'review')
 */
export const GET = withEnhancedRoleAuth(30, async (request, context) => {
  const { userId, organizationId, role, params } = context;

  try {
    const claimNumber = params.id as string;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const purpose = searchParams.get('purpose') || 'review';

    return withRLSContext(async (tx) => {
      // Verify claim exists and user has access (RLS policies enforce this)
      const [claim] = await tx
        .select()
        .from(claims)
        .where(eq(claims.claimNumber, claimNumber))
        .limit(1);

      if (!claim) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/claims/${claimNumber}/defensibility-pack`,
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'low',
          dataType: 'DEFENSIBILITY_PACKS',
          details: { reason: 'Claim not found', claimNumber },
        });
        return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
      }

      // Fetch latest defensibility pack for this claim (RLS policies enforce access)
      const [pack] = await tx
        .select()
        .from(defensibilityPacks)
        .where(
          and(
            eq(defensibilityPacks.caseId, claim.claimId),
            eq(defensibilityPacks.verificationStatus, 'verified')
          )
        )
        .orderBy(desc(defensibilityPacks.generatedAt))
        .limit(1);

      if (!pack) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/claims/${claimNumber}/defensibility-pack`,
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'low',
          dataType: 'DEFENSIBILITY_PACKS',
          details: { reason: 'No defensibility pack found', claimNumber },
        });
        return NextResponse.json(
          { error: 'No defensibility pack available for this claim. Pack is generated when claim is resolved or closed.' },
          { status: 404 }
        );
      }

      // Verify pack integrity before download
      const packData = pack.packData as any;
      const integrityValid = verifyPackIntegrity(packData);

      if (!integrityValid) {
        // Log integrity failure
        await tx.insert(packVerificationLog).values({
          packId: pack.packId,
          caseNumber: pack.caseNumber,
          verifiedAt: new Date(),
          verifiedBy: userId,
          verificationPassed: false,
          expectedHash: pack.integrityHash,
          actualHash: calculateHash(packData),
          failureReason: 'Integrity hash mismatch - pack may be tampered',
          verificationTrigger: 'download',
        });

        // Update pack status
        await tx
          .update(defensibilityPacks)
          .set({
            verificationStatus: 'tampered',
            lastVerifiedAt: new Date(),
            verificationAttempts: (pack.verificationAttempts || 0) + 1,
          })
          .where(eq(defensibilityPacks.packId, pack.packId));

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/claims/${claimNumber}/defensibility-pack`,
          method: 'GET',
          eventType: 'security_alert',
          severity: 'critical',
          dataType: 'DEFENSIBILITY_PACKS',
          details: {
            reason: 'Integrity verification failed',
            claimNumber,
            packId: pack.packId,
            expectedHash: pack.integrityHash.substring(0, 16),
            actualHash: calculateHash(packData).substring(0, 16),
          },
        });

        return NextResponse.json(
          { error: 'Pack integrity verification failed. This pack may have been tampered with.' },
          { status: 500 }
        );
      }

      // Log successful verification
      await tx.insert(packVerificationLog).values({
        packId: pack.packId,
        caseNumber: pack.caseNumber,
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationPassed: true,
        expectedHash: pack.integrityHash,
        actualHash: pack.integrityHash,
        verificationTrigger: 'download',
      });

      // Log download event
      await tx.insert(packDownloadLog).values({
        packId: pack.packId,
        caseNumber: pack.caseNumber,
        organizationId: pack.organizationId,
        downloadedAt: new Date(),
        downloadedBy: userId,
        downloadedByRole: role || 'member',
        downloadPurpose: purpose,
        exportFormat: 'json',
        fileSizeBytes: pack.fileSizeBytes || 0,
        integrityVerified: true,
        downloadSuccess: true,
      });

      // Update download count
      await tx
        .update(defensibilityPacks)
        .set({
          downloadCount: (pack.downloadCount || 0) + 1,
          lastDownloadedAt: new Date(),
          lastDownloadedBy: userId,
          lastVerifiedAt: new Date(),
        })
        .where(eq(defensibilityPacks.packId, pack.packId));

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/claims/${claimNumber}/defensibility-pack`,
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        dataType: 'DEFENSIBILITY_PACKS',
        details: {
          claimNumber,
          packId: pack.packId,
          purpose,
          integrityVerified: true,
          downloadCount: (pack.downloadCount || 0) + 1,
        },
      });

      // Return pack based on format
      if (format === 'download') {
        // Return as downloadable file
        const filename = `defensibility-pack-${claimNumber}-${new Date().toISOString().split('T')[0]}.json`;
        return new NextResponse(JSON.stringify(packData, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Pack-Integrity-Hash': pack.integrityHash,
            'X-Pack-Version': pack.packVersion,
            'X-Generated-At': pack.generatedAt.toISOString(),
          },
        });
      } else {
        // Return as JSON response
        return NextResponse.json({
          pack: packData,
          metadata: {
            packId: pack.packId,
            caseNumber: pack.caseNumber,
            generatedAt: pack.generatedAt,
            generatedBy: pack.generatedBy,
            packVersion: pack.packVersion,
            integrityHash: pack.integrityHash,
            downloadCount: (pack.downloadCount || 0) + 1,
            verificationStatus: 'verified',
          },
        });
      }
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: `/api/claims/${params.id}/defensibility-pack`,
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DEFENSIBILITY_PACKS',
      details: { error: error instanceof Error ? error.message : 'Unknown error', organizationId },
    });
    console.error('[DEFENSIBILITY PACK] Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download defensibility pack', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * Calculate SHA-256 hash for integrity verification
 */
function calculateHash(data: unknown): string {
  const json = JSON.stringify(data, null, 0);
  return createHash('sha256').update(json).digest('hex');
}
