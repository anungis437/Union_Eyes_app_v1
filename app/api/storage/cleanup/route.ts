/**
 * Storage Cleanup API Route
 * POST /api/storage/cleanup - Clean up deleted documents and orphaned files
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
import { db } from "@/db/db";
import { documents } from "@/db/schema";
import { eq, sql, and, lte } from "drizzle-orm";
import { del } from "@vercel/blob";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
interface CleanupOptions {
  organizationId: string;
  daysOld?: number;
  dryRun?: boolean;
}

/**
 * POST /api/storage/cleanup
 * Clean up deleted documents permanently
 * 
 * Body:
 * - organizationId: string (required) - Organization ID
 * - daysOld: number (optional) - Delete files older than X days (default: 30)
 * - dryRun: boolean (optional) - Preview cleanup without actually deleting
 */

const storageCleanupSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  daysOld: z.unknown().optional(),
  dryRun: z.unknown().optional(),
});


export const POST = withRoleAuth(90, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `storage-cleanup:${userId}`,
      RATE_LIMITS.STORAGE_OPERATIONS
    );

    if (!rateLimitResult.allowed) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/cleanup',
        method: 'POST',
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        dataType: 'DOCUMENTS',
        details: { 
          resetIn: rateLimitResult.resetIn 
        },
      });
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many cleanup requests. Please try again in ${rateLimitResult.resetIn} seconds.`,
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/cleanup',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'Invalid JSON in request body' },
      });
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
    }

    const body = rawBody as CleanupOptions;
    const organizationIdParam = body.organizationId || organizationId;
    const daysOld = body.daysOld || 30;
    const dryRun = body.dryRun || false;

    if (!organizationIdParam) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/cleanup',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'organizationId is required' },
      });
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required',
      error
    );
    }

    // Verify organization access (admin only)
    if (organizationIdParam !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/cleanup',
        method: 'POST',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch' },
      });
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find documents to clean up
    const deletedDocs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, organizationIdParam),
          lte(documents.deletedAt, cutoffDate)
        )
      );

    const cleanupStats = {
      dryRun,
      documentsFound: deletedDocs.length,
      documentsDeleted: 0,
      filesDeleted: 0,
      bytesReclaimed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    if (!dryRun && deletedDocs.length > 0) {
      // Process cleanup
      for (const doc of deletedDocs) {
        try {
          // Delete from blob storage if URL is from Vercel Blob
          if (doc.fileUrl && doc.fileUrl.includes('vercel-storage')) {
            const blobKey = doc.metadata?.blobKey as string;
            if (blobKey) {
              await del(blobKey);
              cleanupStats.filesDeleted++;
            }
          }

          // Delete from database
          await db
            .delete(documents)
            .where(eq(documents.id, doc.id));

          cleanupStats.documentsDeleted++;
          cleanupStats.bytesReclaimed += doc.fileSize || 0;
        } catch (error) {
          cleanupStats.errors.push({
            id: doc.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Calculate reclaimed space
    if (dryRun) {
      cleanupStats.bytesReclaimed = deletedDocs.reduce(
        (sum, doc) => sum + (doc.fileSize || 0),
        0
      );
    }

    const reclaimedMB = cleanupStats.bytesReclaimed / (1024 * 1024);
    const reclaimedGB = reclaimedMB / 1024;

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/storage/cleanup',
      method: 'POST',
      eventType: 'success',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: {
        organizationId: organizationIdParam,
        dryRun,
        daysOld,
        documentsFound: cleanupStats.documentsFound,
        documentsDeleted: cleanupStats.documentsDeleted,
        filesDeleted: cleanupStats.filesDeleted,
        bytesReclaimed: cleanupStats.bytesReclaimed,
        errors: cleanupStats.errors.length,
      },
    });

    return NextResponse.json({
      message: dryRun 
        ? "Cleanup preview completed successfully" 
        : "Cleanup completed successfully",
      stats: {
        ...cleanupStats,
        reclaimedMB: Math.round(reclaimedMB * 100) / 100,
        reclaimedGB: Math.round(reclaimedGB * 100) / 100,
      },
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/storage/cleanup',
      method: 'POST',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to perform cleanup',
      error
    );
  }
});

