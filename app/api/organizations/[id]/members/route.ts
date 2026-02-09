import { requireUser } from '@/lib/auth/unified-auth';
/**
 * API Route: Organization Members
 * Get and manage members of an organization
 * Phase 3: FULLY SECURED
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';
import { z } from 'zod';
import {
  getOrganizationMembers,
  // TODO: Implement addOrganizationMember function for adding existing users to organizations
  // addOrganizationMember,
} from '@/db/queries/organization-members-queries';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/[id]/members
 * Get all members of an organization
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

    let id = '';
    try {
      const resolvedParams = await params;
      id = resolvedParams.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(
        `${organizationId}`,
        RATE_LIMITS.ORGANIZATION_OPERATIONS
      );
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for organization members', {
          userId,
          organizationId: id,
          limit: rateLimitResult.limit,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}/members`,
          method: 'GET',
          eventType: 'validation_failed',
          severity: 'medium',
          details: {
            dataType: 'ORGANIZATION',
            reason: 'Rate limit exceeded',
            organizationId: id,
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

      // Verify organization access
      if (id !== organizationId) {
        logger.warn('Unauthorized organization members access attempt', {
          userId,
          requestedOrgId: id,
          userOrgId: organizationId,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}/members`,
          method: 'GET',
          eventType: 'auth_failed',
          severity: 'high',
          details: {
            dataType: 'ORGANIZATION',
            reason: 'Cross-organization access denied',
            requestedOrgId: id,
          },
        });
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other organization members' },
          { status: 403 }
        );
      }
      
      const members = await getOrganizationMembers(id);

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/organizations/${id}/members`,
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        details: {
          dataType: 'ORGANIZATION',
          organizationId: id,
          memberCount: members.length,
        },
      });

      return NextResponse.json({
        success: true,
        data: members,
        count: members.length,
      });
    } catch (error) {
      logger.error('Error fetching organization members', error as Error, {
        organizationId: id,
        userId,
        correlationId: request.headers.get('x-correlation-id')
      });
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/organizations/${id}/members`,
        method: 'GET',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'ORGANIZATION',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch organization members' },
        { status: 500 }
      );
    }
  })(request, { params });
};

/**
 * POST /api/organizations/[id]/members
 * Add a member to an organization
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withRoleAuth('steward', async (request, context) => {
    const { userId, organizationId } = context;

    let id = '';
    try {
      const resolvedParams = await params;
      id = resolvedParams.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(
        `${organizationId}`,
        RATE_LIMITS.ORGANIZATION_OPERATIONS
      );
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for adding organization member', {
          userId,
          organizationId: id,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}/members`,
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: {
            dataType: 'ORGANIZATION',
            reason: 'Rate limit exceeded',
            organizationId: id,
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

      // Verify organization access
      if (id !== organizationId) {
        logger.warn('Unauthorized attempt to add member to another organization', {
          userId,
          requestedOrgId: id,
          userOrgId: organizationId,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}/members`,
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: {
            dataType: 'ORGANIZATION',
            reason: 'Cross-organization access denied',
            requestedOrgId: id,
          },
        });
        return NextResponse.json(
          { error: 'Forbidden - Cannot add members to other organizations' },
          { status: 403 }
        );
      }

      const body = await request.json();

      // Zod validation
      const memberSchema = z.object({
        memberId: z.string().min(1, 'Member ID is required'),
        role: z.enum(['member', 'steward', 'officer', 'admin'], {
          errorMap: () => ({ message: 'Invalid role. Must be member, steward, officer, or admin' })
        }),
        isPrimary: z.boolean().optional().default(false),
      });

      const validated = memberSchema.safeParse(body);
      if (!validated.success) {
        logger.warn('Invalid member data validation', {
          userId,
          organizationId: id,
          errors: validated.error.errors,
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}/members`,
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'low',
          details: {
            dataType: 'ORGANIZATION',
            reason: 'Invalid input data',
            errors: validated.error.errors,
          },
        });
        return NextResponse.json(
          { error: 'Validation failed', details: validated.error.errors },
          { status: 400 }
        );
      }

      // TODO: Implement addOrganizationMember function
      // const result = await addOrganizationMember(
      //   id,
      //   validated.data.memberId,
      //   validated.data.role,
      //   validated.data.isPrimary
      // );

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/organizations/${id}/members`,
        method: 'POST',
        eventType: 'success',
        severity: 'high',
        details: {
          dataType: 'ORGANIZATION',
          organizationId: id,
          memberId: validated.data.memberId,
          role: validated.data.role,
          notImplemented: true,
        },
      });

      return NextResponse.json({
        success: false,
        error: 'Adding members to organizations not yet implemented',
      }, { status: 501 });
    } catch (error: any) {
      logger.error('Error adding member to organization', error as Error, {
        organizationId: id,
        userId,
        correlationId: request.headers.get('x-correlation-id')
      });

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/organizations/${id}/members`,
        method: 'POST',
        eventType: 'server_error',
        severity: 'high',
        details: {
          dataType: 'ORGANIZATION',
          error: error instanceof Error ? error.message : 'Unknown error',
          code: error.code,
        },
      });

      // Handle unique constraint violations (member already in org)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Member is already part of this organization' },
          { status: 409 }
        );
      }

      // Handle foreign key violations
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid organization or member ID' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to add member to organization' },
        { status: 500 }
      );
    }
  })(request, { params });
};
