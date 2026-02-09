/**
 * Members Bulk Operations API Route
 * POST /api/members/bulk - Perform bulk operations on members
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { 
  bulkImportMembers,
  bulkUpdateMemberStatus,
  bulkUpdateMemberRole
} from "@/lib/services/member-service";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

/**
 * Validation schemas
 */
const bulkImportSchema = z.object({
  operation: z.literal('import'),
  members: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    status: z.string().optional(),
    role: z.string().optional(),
  })).min(1, 'Must have at least one member'),
});

const bulkUpdateStatusSchema = z.object({
  operation: z.literal('updateStatus'),
  memberIds: z.array(z.string().uuid('Invalid member ID')).min(1, 'Must have at least one member ID'),
  status: z.string().min(1),
});

const bulkUpdateRoleSchema = z.object({
  operation: z.literal('updateRole'),
  memberIds: z.array(z.string().uuid('Invalid member ID')).min(1, 'Must have at least one member ID'),
  role: z.string().min(1),
});

const bulkOperationSchema = z.discriminatedUnion('operation', [
  bulkImportSchema,
  bulkUpdateStatusSchema,
  bulkUpdateRoleSchema,
]);

/**
 * POST /api/members/bulk
 * Perform bulk operations on members
 * 
 * Body:
 * - operation: "import" | "updateStatus" | "updateRole" (required)
 * - members: array (for import operation)
 * - memberIds: string[] (for update operations)
 * - status: string (for updateStatus operation)
 * - role: string (for updateRole operation)
 */
export const POST = withEnhancedRoleAuth(60, async (request, context) => {
  const { userId, organizationId } = context;

  // Check rate limit for bulk import operations
  const rateLimitResult = await checkRateLimit(
    `member-bulk:${userId}`,
    RATE_LIMITS.MEMBER_BULK_IMPORT
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please try again later.',
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
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = bulkOperationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = parsed.data;

  const orgId = (body as Record<string, unknown>)["organizationId"] ?? (body as Record<string, unknown>)["orgId"] ?? (body as Record<string, unknown>)["organization_id"] ?? (body as Record<string, unknown>)["org_id"] ?? (body as Record<string, unknown>)["tenantId"] ?? (body as Record<string, unknown>)["tenant_id"] ?? (body as Record<string, unknown>)["unionId"] ?? (body as Record<string, unknown>)["union_id"] ?? (body as Record<string, unknown>)["localId"] ?? (body as Record<string, unknown>)["local_id"];
  if (typeof orgId === 'string' && orgId.length > 0 && orgId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

try {
      let result;

      switch (body.operation) {
        case "import":
          result = await bulkImportMembers(body.members);
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: '/api/members/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'medium',
            dataType: 'MEMBER_DATA',
            details: { 
              operation: 'import', 
              memberCount: body.members.length,
              organizationId
            },
          });
          break;

        case "updateStatus":
          result = await bulkUpdateMemberStatus(body.memberIds, body.status);
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: '/api/members/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'medium',
            dataType: 'MEMBER_DATA',
            details: { 
              operation: 'updateStatus', 
              memberCount: body.memberIds.length, 
              newStatus: body.status,
              organizationId
            },
          });
          break;

        case "updateRole":
          result = await bulkUpdateMemberRole(body.memberIds, body.role);
          logApiAuditEvent({
            timestamp: new Date().toISOString(), 
            userId,
            endpoint: '/api/members/bulk',
            method: 'POST',
            eventType: 'success',
            severity: 'medium',
            dataType: 'MEMBER_DATA',
            details: { 
              operation: 'updateRole', 
              memberCount: body.memberIds.length, 
              newRole: body.role,
              organizationId
            },
          });
          break;
      }

      return NextResponse.json(result);
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(), 
        userId,
        endpoint: '/api/members/bulk',
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        dataType: 'MEMBER_DATA',
        details: { 
          operation: body.operation, 
          error: error instanceof Error ? error.message : 'Unknown error',
          organizationId
        },
      });
      console.error("Error performing bulk member operation:", error);
      return NextResponse.json(
        { error: "Failed to perform bulk operation", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
});


