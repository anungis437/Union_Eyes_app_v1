/**
 * API Route: Organization by ID
 * Get, update, or delete a specific organization
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * GET /api/organizations/[id]
 * Get a specific organization by ID
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  let id = '';
      try {
        const resolvedParams = await params;
        id = resolvedParams.id;
        
        // Query function now has auto-wrap, so this will work
        // But if we want to add more queries, wrap in withRLSContext
        const organization = await getOrganizationById(id);

        if (!organization) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/organizations/${id}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            details: { reason: 'Organization not found', organizationId: id },
          });
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Organization not found'
    );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { 
            dataType: 'ORGANIZATION',
            organizationId: id, 
            organizationName: organization.name 
          },
        });

        return NextResponse.json({
          success: true,
          data: organization,
        });
      } catch (error) {
        logger.error('Error fetching organization', error as Error, {
          organizationId: id,
          userId,
          correlationId: request.headers.get('x-correlation-id')
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}`,
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { 
            dataType: 'ORGANIZATION',
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
        });
        return NextResponse.json(
          { success: false, error: 'Failed to fetch organization' },
          { status: 500 }
        );
      }
      })(request, { params });
};

/**
 * PATCH /api/organizations/[id]
 * Update an organization
 */

const organizationsSchema = z.object({
  slug: z.unknown().optional(),
  type: z.unknown().optional(),
});

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  let id = '';
      try {
        const resolvedParams = await params;
        id = resolvedParams.id;
        const body = await request.json();
    // Validate request body
    const validation = organizationsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { slug, type } = validation.data;

        // Validate slug format if provided
        if (body.slug) {
          const slugRegex = /^[a-z0-9-_]+$/;
          if (!slugRegex.test(body.slug)) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(),
              userId,
              endpoint: `/api/organizations/${id}`,
              method: 'PATCH',
              eventType: 'validation_failed',
              severity: 'low',
              details: { 
                dataType: 'ORGANIZATION',
                reason: 'Invalid slug format', 
                slug: body.slug 
              },
            });
            return NextResponse.json(
              { error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' },
              { status: 400 }
            );
          }
        }

        // Validate organization type if provided
        if (body.type) {
          const validTypes = ['federation', 'union', 'local', 'chapter'];
          if (!validTypes.includes(body.type)) {
            logApiAuditEvent({
              timestamp: new Date().toISOString(),
              userId,
              endpoint: `/api/organizations/${id}`,
              method: 'PATCH',
              eventType: 'validation_failed',
              severity: 'low',
              details: { 
                dataType: 'ORGANIZATION',
                reason: 'Invalid organization type', 
                type: body.type 
              },
            });
            return NextResponse.json(
              { error: `Invalid organization type. Must be one of: ${validTypes.join(', ')}` },
              { status: 400 }
            );
          }
        }

        const updatedOrganization = await updateOrganization(id, body);

        if (!updatedOrganization) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/organizations/${id}`,
            method: 'PATCH',
            eventType: 'validation_failed',
            severity: 'low',
            details: { 
              dataType: 'ORGANIZATION',
              reason: 'Organization not found', 
              organizationId: id 
            },
          });
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Organization not found'
    );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}`,
          method: 'PATCH',
          eventType: 'success',
          severity: 'high',
          details: { 
            dataType: 'ORGANIZATION',
            organizationId: id, 
            updatedFields: Object.keys(body) 
          },
        });

        return NextResponse.json({
          success: true,
          data: updatedOrganization,
          message: 'Organization updated successfully',
        });
      } catch (error: Record<string, unknown>) {
        logger.error('Error updating organization', error as Error, {
          organizationId: id,
          userId,
          correlationId: request.headers.get('x-correlation-id')
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}`,
          method: 'PATCH',
          eventType: 'server_error',
          severity: 'high',
          details: { 
            dataType: 'ORGANIZATION',
            error: error instanceof Error ? error.message : 'Unknown error', 
            code: error.code 
          },
        });

        // Handle unique constraint violations
        if (error.code === '23505') {
          return standardErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'An organization with this slug already exists',
      error
    );
        }

        // Handle foreign key violations (invalid parent)
        if (error.code === '23503') {
          return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid parent organization ID',
      error
    );
        }

        return NextResponse.json(
          { success: false, error: 'Failed to update organization' },
          { status: 500 }
        );
      }
      })(request, { params });
};

/**
 * DELETE /api/organizations/[id]
 * Soft delete an organization
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId, organizationId } = context;

  let id = '';
      try {
        const resolvedParams = await params;
        id = resolvedParams.id;
        
        const result = await deleteOrganization(id);

        if (!result) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/organizations/${id}`,
            method: 'DELETE',
            eventType: 'validation_failed',
            severity: 'low',
            details: { 
              dataType: 'ORGANIZATION',
              reason: 'Organization not found', 
              organizationId: id 
            },
          });
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Organization not found'
    );
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}`,
          method: 'DELETE',
          eventType: 'success',
          severity: 'critical',
          details: { 
            dataType: 'ORGANIZATION',
            organizationId: id 
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Organization deleted successfully',
        });
      } catch (error) {
        logger.error('Error deleting organization', error as Error, {
          organizationId: id,
          userId,
          correlationId: request.headers.get('x-correlation-id')
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/organizations/${id}`,
          method: 'DELETE',
          eventType: 'server_error',
          severity: 'high',
          details: { 
            dataType: 'ORGANIZATION',
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
        });
        return NextResponse.json(
          { success: false, error: 'Failed to delete organization' },
          { status: 500 }
        );
      }
      })(request, { params });
};
