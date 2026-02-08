/**
 * Members Advanced Search API Route
 * POST /api/members/search - Advanced member search with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { searchMembers, getMemberStatistics } from "@/lib/services/member-service";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * Validation schemas
 */
const searchMembersSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  searchQuery: z.string().default(''),
  filters: z.object({
    status: z.array(z.string()).optional(),
    role: z.array(z.string()).optional(),
    department: z.string().optional(),
  }).optional().default({}),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});

/**
 * POST /api/members/search
 * Advanced member search with full-text search and filters
 */
export const POST = withEnhancedRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = searchMembersSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      const { organizationId, searchQuery, filters, page, limit } = body;

      const result = await searchMembers(
        organizationId,
        searchQuery,
        filters,
        { page, limit }
      );

      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/members/search',
        method: 'POST',
        eventType: 'success',
        severity: 'low',
        details: { organizationId, searchQuery, resultCount: result.members?.length || 0 },
      });

      return NextResponse.json(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), userId,
        endpoint: '/api/members/search',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      console.error("Error searching members:", error);
      return NextResponse.json(
        { error: "Failed to search members", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
});

/**
 * GET /api/members/search
 * Get member statistics
 */
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");

        if (!organizationId) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/members/search',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'organizationId required' },
          });
          return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
        }

        const statistics = await getMemberStatistics(organizationId);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/search',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { organizationId },
        });

        return NextResponse.json(statistics);
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/members/search',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        console.error("Error fetching member statistics:", error);
        return NextResponse.json(
          { error: "Failed to fetch statistics", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
      })(request);
};

