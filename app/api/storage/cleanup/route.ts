/**
 * Storage Cleanup API Route
 * POST /api/storage/cleanup - Clean up deleted documents and orphaned files
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
import { db } from "@/db/db";
import { documents } from "@/db/schema";
import { eq, sql, and, lte } from "drizzle-orm";
import { del } from "@vercel/blob";

interface CleanupOptions {
  tenantId: string;
  daysOld?: number;
  dryRun?: boolean;
}

/**
 * POST /api/storage/cleanup
 * Clean up deleted documents permanently
 * 
 * Body:
 * - tenantId: string (required) - Organization ID
 * - daysOld: number (optional) - Delete files older than X days (default: 30)
 * - dryRun: boolean (optional) - Preview cleanup without actually deleting
 */
export const POST = withEnhancedRoleAuth(90, async (request, context) => {
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
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const body = rawBody as CleanupOptions;
    const tenantId = body.tenantId || organizationId;
    const daysOld = body.daysOld || 30;
    const dryRun = body.dryRun || false;

    if (!tenantId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/cleanup',
        method: 'POST',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'tenantId is required' },
      });
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Verify organization access (admin only)
    if (tenantId !== organizationId) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
          eq(documents.tenantId, tenantId),
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
        tenantId,
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
    console.error("Error during storage cleanup:", error);
    return NextResponse.json(
      { error: "Failed to perform cleanup", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
