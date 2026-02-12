/**
 * Compliance Audit Logs API Route
 * 
 * Provides audit log access for compliance officers.
 * Part of Phase 3 - App Operations Roles implementation.
 * 
 * Authentication: Minimum role level 300 (compliance_officer)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import {
  standardErrorResponse,
  standardSuccessResponse,
  ErrorCode,
} from '@/lib/api/standardized-responses';
import { logger } from '@/lib/logger';
import { db } from '@/database';
import { auditLogs } from '@/db/schema/domains/infrastructure/audit';
import { and, eq, gte, lte, desc, sql, like } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const auditLogsQuerySchema = z.object({
  user_id: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  severity: z.enum(['debug', 'info', 'warning', 'error', 'critical']).optional(),
  outcome: z.enum(['success', 'failure', 'error']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// GET /api/compliance/audit-logs
// Get audit logs
// ============================================================================

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(300, async (request, context) => {
    const { userId } = context;

    try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 50,
        window: 60,
        identifier: 'audit-logs-read',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const queryParams = {
        user_id: searchParams.get('user_id') || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
        action: searchParams.get('action') || undefined,
        resource_type: searchParams.get('resource_type') || undefined,
        severity: searchParams.get('severity') || undefined,
        outcome: searchParams.get('outcome') || undefined,
        start_date: searchParams.get('start_date') || undefined,
        end_date: searchParams.get('end_date') || undefined,
        search: searchParams.get('search') || undefined,
        limit: parseInt(searchParams.get('limit') || '100'),
        offset: parseInt(searchParams.get('offset') || '0'),
      };

      // Validate query parameters
      const validation = auditLogsQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );
      }

      const filters = validation.data;

      // Build query conditions
      const conditions = [];

      if (filters.user_id) {
        conditions.push(eq(auditLogs.userId, filters.user_id));
      }

      if (filters.organization_id) {
        conditions.push(eq(auditLogs.organizationId, filters.organization_id));
      }

      if (filters.action) {
        conditions.push(like(auditLogs.action, `%${filters.action}%`));
      }

      if (filters.resource_type) {
        conditions.push(eq(auditLogs.resourceType, filters.resource_type));
      }

      if (filters.severity) {
        conditions.push(eq(auditLogs.severity, filters.severity));
      }

      if (filters.outcome) {
        conditions.push(eq(auditLogs.outcome, filters.outcome));
      }

      if (filters.start_date) {
        conditions.push(gte(auditLogs.createdAt, new Date(filters.start_date)));
      }

      if (filters.end_date) {
        conditions.push(lte(auditLogs.createdAt, new Date(filters.end_date)));
      }

      // Exclude archived logs by default
      conditions.push(eq(auditLogs.archived, false));

      // Fetch audit logs
      const logs = await db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Audit this audit log access
      await logApiAuditEvent({
        action: 'compliance.audit_logs.read',
        userId,
        resourceType: 'audit_log',
        severity: 'info',
        metadata: { filters, count: logs.length },
      });

      logger.info('Audit logs retrieved', {
        userId,
        count: logs.length,
        filters,
      });

      return standardSuccessResponse({
        logs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          count: logs.length,
          hasMore: logs.length === filters.limit,
        },
        filters,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving audit logs', { error, userId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve audit logs'
      );
    }
  })(request, {});
};
