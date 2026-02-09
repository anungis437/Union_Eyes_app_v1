import { requireUser } from '@/lib/api-auth-guard';
/**
 * Organization Hierarchy API
 * Get hierarchical organization structure with RLS isolation
 * Phase 3: Multi-Tenant Architecture - FULLY SECURED
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const GET = withRoleAuth(10, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting for hierarchy operations
    const rateLimitResult = await checkRateLimit(
      `${organizationId}`,
      RATE_LIMITS.ORGANIZATION_OPERATIONS
    );
    
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for organization hierarchy', {
        userId,
        organizationId,
        limit: rateLimitResult.limit,
        resetIn: rateLimitResult.resetIn,
      });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/organizations/hierarchy',
        method: 'GET',
        eventType: 'validation_failed',
        severity: 'medium',
        details: {
          dataType: 'ORGANIZATION',
          reason: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
        },
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Too many requests.',
          resetIn: rateLimitResult.resetIn,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rootOrgId = searchParams.get('rootOrgId');

    // Verify organization access if rootOrgId provided
    if (rootOrgId && rootOrgId !== organizationId) {
      logger.warn('Unauthorized organization hierarchy access attempt', {
        userId,
        requestedOrgId: rootOrgId,
        userOrgId: organizationId,
      });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/organizations/hierarchy',
        method: 'GET',
        eventType: 'auth_failed',
        severity: 'high',
        details: {
          dataType: 'ORGANIZATION',
          reason: 'Cross-organization access denied',
          requestedOrgId: rootOrgId,
        },
      });
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other organization hierarchy' },
        { status: 403 }
      );
    }

    let query;
    
    if (rootOrgId) {
      // Get organization tree starting from specific root
      query = sql`
        WITH RECURSIVE org_tree AS (
          -- Base case: start with root organization
          SELECT 
            o.id,
            o.name,
            o.organization_type,
            o.parent_organization_id,
            0 as level,
            o.rls_enabled,
            o.created_at,
            o.updated_at
          FROM hierarchical_organizations o
          WHERE o.id = ${rootOrgId}
          
          UNION ALL
          
          -- Recursive case: get all children
          SELECT 
            o.id,
            o.name,
            o.organization_type,
            o.parent_organization_id,
            ot.level + 1,
            o.rls_enabled,
            o.created_at,
            o.updated_at
          FROM hierarchical_organizations o
          INNER JOIN org_tree ot ON o.parent_organization_id = ot.id
        )
        SELECT 
          ot.id,
          ot.name,
          ot.organization_type,
          ot.parent_organization_id,
          ot.level,
          ot.rls_enabled,
          ot.created_at,
          ot.updated_at,
          COUNT(DISTINCT m.id) as member_count,
          COUNT(DISTINCT child.id) as child_count
        FROM org_tree ot
        LEFT JOIN members m ON m.organization_id = ot.id
        LEFT JOIN hierarchical_organizations child ON child.parent_organization_id = ot.id
        GROUP BY 
          ot.id, ot.name, ot.organization_type, 
          ot.parent_organization_id, ot.level, ot.rls_enabled,
          ot.created_at, ot.updated_at
        ORDER BY ot.level, ot.name
      `;
    } else {
      // Get all organizations (for admin view)
      query = sql`
        SELECT 
          o.id,
          o.name,
          o.organization_type,
          o.parent_organization_id,
          COALESCE(
            (
              WITH RECURSIVE level_calc AS (
                SELECT id, parent_organization_id, 0 as level
                FROM hierarchical_organizations
                WHERE parent_organization_id IS NULL
                
                UNION ALL
                
                SELECT o2.id, o2.parent_organization_id, lc.level + 1
                FROM hierarchical_organizations o2
                INNER JOIN level_calc lc ON o2.parent_organization_id = lc.id
              )
              SELECT level FROM level_calc WHERE id = o.id
            ),
            0
          ) as level,
          o.rls_enabled,
          o.created_at,
          o.updated_at,
          COUNT(DISTINCT m.id) as member_count,
          COUNT(DISTINCT child.id) as child_count
        FROM hierarchical_organizations o
        LEFT JOIN members m ON m.organization_id = o.id
        LEFT JOIN hierarchical_organizations child ON child.parent_organization_id = o.id
        GROUP BY 
          o.id, o.name, o.organization_type, 
          o.parent_organization_id, o.rls_enabled,
          o.created_at, o.updated_at
        ORDER BY o.name
      `;
    }

    const result = await db.execute(query);

    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/organizations/hierarchy',
      method: 'GET',
      eventType: 'success',
      severity: 'low',
      details: {
        dataType: 'ORGANIZATION',
        rootOrgId,
        resultCount: result.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching organization hierarchy', error as Error, {
      userId,
      organizationId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/organizations/hierarchy',
      method: 'GET',
      eventType: 'server_error',
      severity: 'high',
      details: {
        dataType: 'ORGANIZATION',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
