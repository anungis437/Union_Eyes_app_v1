/**
 * API Route: Organizations
 * List and create organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getOrganizations,
  getUserVisibleOrganizations,
  createOrganization,
  getOrganizationChildren,
} from '@/db/queries/organization-queries';
import { getMemberCount } from '@/db/queries/organization-members-queries';
import { db } from '@/db/db';
import { claims } from '@/db/schema/claims-schema';
import { tenantUsers } from '@/db/schema/user-management-schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getUserRole } from '@/lib/auth-middleware';
import { validateBody, bodySchemas } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiter';

/**
 * GET /api/organizations
 * List organizations based on query parameters
 * - No params: Returns all root organizations
 * - ?parentId=X: Returns children of parent X
 * - ?userId=X: Returns organizations visible to user X
 * - ?include_stats=true: Include memberCount, childCount, activeClaims
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.ORG_READ);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for organizations read', {        limit: rateLimitResult.limit,
        resetIn: rateLimitResult.resetIn,
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many requests.',
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const requestedUserId = searchParams.get('userId');
    const includeStats = searchParams.get('include_stats') === 'true';

    let organizations;

    if (requestedUserId) {
      // Return organizations visible to a specific user
      // Only allow users to query their own organizations (or admins)
      if (requestedUserId !== userId) {
        // Check if requester is admin in any of the requested user's organizations
        // Get all organizations for requested user
        const requestedUserOrgs = await db
          .select({ tenantId: tenantUsers.tenantId })
          .from(tenantUsers)
          .where(eq(tenantUsers.userId, requestedUserId));

        // Check if current user is admin in ANY of those organizations
        let isAdmin = false;
        for (const org of requestedUserOrgs) {
          const role = await getUserRole(userId, org.tenantId);
          if (role === 'admin') {
            isAdmin = true;
            break;
          }
        }

        if (!isAdmin) {
          logger.warn('Insufficient permissions to view other user organizations', {            requestedUserId,
            correlationId: request.headers.get('x-correlation-id')
          });
          return NextResponse.json(
            { error: 'Forbidden - Admin role required to view other users organizations' },
            { status: 403 }
          );
        }
      }
      organizations = await getUserVisibleOrganizations(requestedUserId);
    } else {
      // Return organizations filtered by parent
      organizations = await getOrganizations(parentId || undefined);
    }

    // Enhance with stats if requested
    if (includeStats && organizations.length > 0) {
      const enhancedOrgs = await Promise.all(
        organizations.map(async (org) => {
          try {
            const [memberCount, children, claimsResult] = await Promise.all([
              getMemberCount(org.id),
              getOrganizationChildren(org.id, false),
              db.select({ count: sql<number>`count(*)::int` })
                .from(claims)
                .where(
                  and(
                    eq(claims.tenantId, org.id),
                    sql`${claims.status} IN ('submitted', 'under_review', 'assigned', 'investigation', 'pending_documentation')`
                  )
                )
            ]);

            return {
              ...org,
              memberCount,
              childCount: children.length,
              activeClaims: claimsResult[0]?.count || 0,
            };
          } catch (error) {
            logger.error('Error fetching stats for org', error as Error, {
              organizationId: org.id,
              correlationId: request.headers.get('x-correlation-id')
            });
            return {
              ...org,
              memberCount: 0,
              childCount: 0,
              activeClaims: 0,
            };
          }
        })
      );

      return NextResponse.json({
        success: true,
        data: enhancedOrgs,
        count: enhancedOrgs.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: organizations,
      count: organizations.length,
    });
  } catch (error) {
    logger.error('Error fetching organizations', error as Error, {      correlationId: request.headers.get('x-correlation-id')
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 * Requires authentication - additional role checks should be added
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting: 2 organizations per hour per user (very strict)
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.ORG_CREATE);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for organization creation', {        limit: rateLimitResult.limit,
        resetIn: rateLimitResult.resetIn,
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many organizations created. Please contact support if you need to create more.',
          resetIn: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Validate request body with Zod schema
    const validated = await validateBody(request, bodySchemas.createOrganization);
    if (validated instanceof NextResponse) return validated;

    // Create the organization with validated data
    const newOrganization = await createOrganization({
      name: validated.name,
      slug: validated.slug,
      type: validated.type,
      parentId: validated.parentId || null,
      description: validated.description || null,
      sectors: validated.sectors || [],
      jurisdiction: validated.jurisdiction || null,
      contactEmail: validated.contactEmail || null,
      contactPhone: validated.contactPhone || null,
      address: validated.address || null,
      website: validated.website || null,
      logo: validated.logo || null,
      primaryColor: validated.primaryColor || null,
      isActive: validated.isActive,
      metadata: validated.metadata || {},
    });

    return NextResponse.json({
      success: true,
      data: newOrganization,
      message: 'Organization created successfully',
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating organization', error as Error, {      organizationSlug: error.detail,
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
      { success: false, error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
