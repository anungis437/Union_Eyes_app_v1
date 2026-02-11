/**
 * Storage Usage API Route
 * GET /api/storage/usage - Get storage usage statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
import { db } from "@/db/db";
import { documents } from "@/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

/**
 * GET /api/storage/usage
 * Get storage usage statistics for an organization
 * 
 * Query params:
 * - tenantId: string (required) - Organization ID
 * - breakdown: boolean (optional) - Include breakdown by file type and category
 */
export const GET = withEnhancedRoleAuth(90, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `storage-usage:${userId}`,
      RATE_LIMITS.STORAGE_OPERATIONS
    );

    if (!rateLimitResult.allowed) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/usage',
        method: 'GET',
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
          message: `Too many storage requests. Please try again in ${rateLimitResult.resetIn} seconds.`,
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || organizationId;
    const breakdown = searchParams.get("breakdown") === "true";

    if (!tenantId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/storage/usage',
        method: 'GET',
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
        endpoint: '/api/storage/usage',
        method: 'GET',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch' },
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get total storage usage
    const totalResult = await db
      .select({
        totalSize: sql<number>`COALESCE(SUM(${documents.fileSize}), 0)::bigint`,
        totalFiles: sql<number>`COUNT(*)::int`,
        activeFiles: sql<number>`COUNT(CASE WHEN ${documents.deletedAt} IS NULL THEN 1 END)::int`,
        deletedFiles: sql<number>`COUNT(CASE WHEN ${documents.deletedAt} IS NOT NULL THEN 1 END)::int`,
      })
      .from(documents)
      .where(eq(documents.tenantId, tenantId));

    const total = totalResult[0];
    const totalSizeBytes = Number(total.totalSize);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    const totalSizeGB = totalSizeMB / 1024;

    const response: any = {
      tenantId,
      usage: {
        totalSize: totalSizeBytes,
        totalSizeMB: Math.round(totalSizeMB * 100) / 100,
        totalSizeGB: Math.round(totalSizeGB * 100) / 100,
        totalFiles: total.totalFiles,
        activeFiles: total.activeFiles,
        deletedFiles: total.deletedFiles,
      },
    };

    // Add breakdown if requested
    if (breakdown) {
      // Breakdown by file type
      const fileTypeBreakdown = await db
        .select({
          fileType: documents.fileType,
          count: sql<number>`COUNT(*)::int`,
          totalSize: sql<number>`COALESCE(SUM(${documents.fileSize}), 0)::bigint`,
        })
        .from(documents)
        .where(and(
          eq(documents.tenantId, tenantId),
          isNull(documents.deletedAt)
        ))
        .groupBy(documents.fileType);

      // Breakdown by category
      const categoryBreakdown = await db
        .select({
          category: documents.category,
          count: sql<number>`COUNT(*)::int`,
          totalSize: sql<number>`COALESCE(SUM(${documents.fileSize}), 0)::bigint`,
        })
        .from(documents)
        .where(and(
          eq(documents.tenantId, tenantId),
          isNull(documents.deletedAt)
        ))
        .groupBy(documents.category);

      response.breakdown = {
        byFileType: fileTypeBreakdown.map((item) => ({
          fileType: item.fileType,
          count: item.count,
          totalSize: Number(item.totalSize),
          totalSizeMB: Math.round((Number(item.totalSize) / (1024 * 1024)) * 100) / 100,
        })),
        byCategory: categoryBreakdown.map((item) => ({
          category: item.category || "Uncategorized",
          count: item.count,
          totalSize: Number(item.totalSize),
          totalSizeMB: Math.round((Number(item.totalSize) / (1024 * 1024)) * 100) / 100,
        })),
      };
    }

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/storage/usage',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      dataType: 'DOCUMENTS',
      details: { 
        tenantId,
        totalSizeMB: response.usage.totalSizeMB,
        totalFiles: response.usage.totalFiles 
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/storage/usage',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    console.error("Error fetching storage usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch storage usage", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

