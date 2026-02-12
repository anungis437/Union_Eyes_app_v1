/**
 * Members Advanced Search API Route
 * POST /api/members/search - Advanced member search with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { searchMembers, getMemberStatistics } from "@/lib/services/member-service";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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
export const POST = withRoleAuth(20, async (request, context) => {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      error
    );
  }

  const parsed = searchMembersSchema.safeParse(rawBody);
  if (!parsed.success) {
    return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request body',
      error
    );
  }

  const body = parsed.data;
  const { userId, organizationId } = context;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Forbidden',
      error
    );
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
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: '/api/members/search',
        method: 'POST',
        eventType: 'success',
        severity: 'low',
        dataType: 'MEMBER_DATA',
        details: { organizationId, searchQuery, resultCount: result.members?.length || 0 },
      });

      return NextResponse.json(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: '/api/members/search',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'MEMBER_DATA',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to search members',
      error
    );
    }
});

/**
 * GET /api/members/search
 * Get member statistics
 */
export const GET = withRoleAuth(20, async (request, context) => {
  const { userId, organizationId } = context;

  try {
        const { searchParams } = new URL(request.url);
        const orgIdParam = searchParams.get("organizationId");

        if (!orgIdParam) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: '/api/members/search',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'MEMBER_DATA',
            details: { reason: 'organizationId required' },
          });
          return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'organizationId is required'
    );
        }

        const statistics = await getMemberStatistics(orgIdParam);

        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: '/api/members/search',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'MEMBER_DATA',
          details: { organizationId: orgIdParam },
        });

        return NextResponse.json(statistics);
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(), 
          userId,
          endpoint: '/api/members/search',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          dataType: 'MEMBER_DATA',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch statistics',
      error
    );
      }
});


