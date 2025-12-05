/**
 * API Route: Organization by ID
 * Get, update, or delete a specific organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from '@/db/queries/organization-queries';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations/[id]
 * Get a specific organization by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let id = '';
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    
    const organization = await getOrganizationById(id);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update an organization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let id = '';
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    const body = await request.json();

    // Validate slug format if provided
    if (body.slug) {
      const slugRegex = /^[a-z0-9-_]+$/;
      if (!slugRegex.test(body.slug)) {
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
        return NextResponse.json(
          { error: `Invalid organization type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updatedOrganization = await updateOrganization(id, body);

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedOrganization,
      message: 'Organization updated successfully',
    });
  } catch (error: any) {
    logger.error('Error updating organization', error as Error, {
      organizationId: id,
      userId,
      correlationId: request.headers.get('x-correlation-id')
    });

    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 }
      );
    }

    // Handle foreign key violations (invalid parent)
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid parent organization ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]
 * Soft delete an organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | null = null;
  let id = '';
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    
    const result = await deleteOrganization(id);

    if (!result) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

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
    return NextResponse.json(
      { success: false, error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
