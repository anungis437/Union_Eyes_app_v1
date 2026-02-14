/**
 * Document Categories API Route
 * GET /api/documents/categories - Get list of document categories
 */

import { NextRequest, NextResponse } from "next/server";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { db } from "@/db/db";
import { documents } from "@/db/schema";
import { sql } from "drizzle-orm";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * Predefined document categories
 */
const DEFAULT_CATEGORIES = [
  "Contracts",
  "Legal",
  "Financial",
  "HR",
  "Policies",
  "Reports",
  "Meetings",
  "Training",
  "Compliance",
  "Marketing",
  "Operations",
  "Technical",
  "Other",
];

/**
 * GET /api/documents/categories
 * Get list of document categories
 * 
 * Query params:
 * - organizationId: string (required) - Filter by organization
 * - includeDefault: boolean (optional) - Include default categories
 * - counts: boolean (optional) - Include document counts per category
 */
export const GET = withEnhancedRoleAuth(10, async (request, context) => {
  const { userId, organizationId } = context;

  try {
    const { searchParams } = new URL(request.url);
    const requestOrgId = searchParams.get("organizationId") ?? searchParams.get("orgId") ?? searchParams.get("organization_id") ?? searchParams.get("org_id") ?? searchParams.get("unionId") ?? searchParams.get("union_id") ?? searchParams.get("localId") ?? searchParams.get("local_id") ?? organizationId;
    const includeDefault = searchParams.get("includeDefault") !== "false";
    const includeCounts = searchParams.get("counts") === "true";

    if (!requestOrgId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/categories',
        method: 'GET',
        eventType: 'validation_failed',
        severity: 'low',
        dataType: 'DOCUMENTS',
        details: { reason: 'organizationId is required' },
      });
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
    }

    // Verify organization access
    if (requestOrgId !== organizationId) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/documents/categories',
        method: 'GET',
        eventType: 'authorization_failed',
        severity: 'high',
        dataType: 'DOCUMENTS',
        details: { reason: 'Organization ID mismatch' },
      });
      return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden'
    );
    }

    // Get categories from existing documents
    const result = await db
      .select({
        category: documents.category,
        count: sql<number>`count(*)::int`,
      })
      .from(documents)
      .where(eq(documents.organizationId, requestOrgId))
      .groupBy(documents.category);

    const usedCategories = result
      .filter((r) => r.category)
      .map((r) => ({
        name: r.category!,
        count: includeCounts ? r.count : undefined,
        isDefault: DEFAULT_CATEGORIES.includes(r.category!),
      }));

    // Add default categories not yet used
    let categories = [...usedCategories];
    if (includeDefault) {
      const usedCategoryNames = new Set(usedCategories.map((c) => c.name));
      const unusedDefaults = DEFAULT_CATEGORIES.filter(
        (cat) => !usedCategoryNames.has(cat)
      ).map((name) => ({
        name,
        count: includeCounts ? 0 : undefined,
        isDefault: true,
      }));
      categories = [...categories, ...unusedDefaults];
    }

    // Sort by name
    categories.sort((a, b) => a.name.localeCompare(b.name));

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/documents/categories',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      dataType: 'DOCUMENTS',
      details: { 
        organizationId: requestOrgId,
        categoryCount: categories.length 
      },
    });

    return NextResponse.json({
      categories,
      total: categories.length,
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/documents/categories',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      dataType: 'DOCUMENTS',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch categories',
      error
    );
  }
});

