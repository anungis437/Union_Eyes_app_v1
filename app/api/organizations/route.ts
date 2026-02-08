/**
 * API Route: Organizations
 * List and create organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

/**
 * GET /api/organizations
 * List organizations based on query parameters
 * - No params: Returns all root organizations
 * - ?parentId=X: Returns children of parent X
 * - ?userId=X: Returns organizations visible to user X
 * - ?include_stats=true: Include memberCount, childCount, activeClaims
 */
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        // Rate limiting: 100 requests per minute per user
        const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.ORG_READ);
        if (!rateLimitResult.allowed) {
          logger.warn('Rate limit exceeded for organizations read', {        limit: rateLimitResult.limit,
            resetIn: rateLimitResult.resetIn,
          });
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/organizations',
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { 
              dataType: 'ORGANIZATION',
              reason: 'Rate limit exceeded', 
              limit: rateLimitResult.limit 
            },
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
              logApiAuditEvent({
                timestamp: new Date().toISOString(), userId,
                endpoint: '/api/organizations',
                method: 'GET',
                eventType: 'auth_failed',
                severity: 'high',
                details: { 
                  dataType: 'ORGANIZATION',
                  reason: 'Insufficient permissions for cross-user access', 
                  requestedUserId 
                },
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
                        eq(claims.organizationId, org.id),
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

          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/organizations',
            method: 'GET',
            eventType: 'success',
            severity: 'low',
          details: { 
            dataType: 'ORGANIZATION',
            count: enhancedOrgs.length, 
            includeStats: true, 
            parentId, 
            requestedUserId 
          },
          });
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/organizations',
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          details: { 
            dataType: 'ORGANIZATION',
            count: organizations.length, 
            includeStats: false, 
            parentId, 
            requestedUserId 
          },
        });

        return NextResponse.json({
          success: true,
          data: organizations,
          count: organizations.length,
        });
      } catch (error) {
        logger.error('Error fetching organizations', error as Error, {      correlationId: request.headers.get('x-correlation-id')
        });
        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/organizations',
          method: 'GET',
          eventType: 'server_error',
          severity: 'high',
          details: { 
            dataType: 'ORGANIZATION',
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
        });
        return NextResponse.json(
          { success: false, error: 'Failed to fetch organizations' },
          { status: 500 }
        );
      }
      })(request);
};

/**
 * POST /api/organizations
 * Create a new organization
 * Requires authentication - additional role checks should be added
 */
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId, organizationId } = context;

  try {
        // Rate limiting: 2 organizations per hour per user (very strict)
        const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.ORG_CREATE);
        if (!rateLimitResult.allowed) {
          logger.warn('Rate limit exceeded for organization creation', {        limit: rateLimitResult.limit,
            resetIn: rateLimitResult.resetIn,
          });
          logApiAuditEvent({
            timestamp: new Date().toISOString(), userId,
            endpoint: '/api/organizations',
            method: 'POST',
            eventType: 'validation_failed',
            severity: 'medium',
            details: { 
              dataType: 'ORGANIZATION',
              reason: 'Rate limit exceeded', 
              limit: rateLimitResult.limit 
            },
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

        // Build hierarchy path
        let hierarchyPath: string[] = [];
        let hierarchyLevel = 0;
        if (validated.parentId) {
          const { organizations } = await import('@/db/schema-organizations');
          const [parentOrg] = await db
            .select({ hierarchyPath: organizations.hierarchyPath })
            .from(organizations)
            .where(eq(organizations.id, validated.parentId))
            .limit(1);
          if (parentOrg) {
            hierarchyPath = [...parentOrg.hierarchyPath, validated.slug];
            hierarchyLevel = hierarchyPath.length - 1;
          } else {
            hierarchyPath = [validated.slug];
          }
        } else {
          hierarchyPath = [validated.slug];
        }

        // Create the organization with validated data
        const newOrganization = await createOrganization({
          name: validated.name,
          slug: validated.slug,
          organizationType: validated.type,
          hierarchyPath,
          hierarchyLevel,
          parentId: validated.parentId || null,
          sectors: validated.sectors || [],
          // jurisdiction: validated.jurisdiction || null, // Column does not exist in database
          email: validated.contactEmail || null,
          phone: validated.contactPhone || null,
          address: validated.address as Record<string, unknown> || null,
          website: validated.website || null,
          status: validated.isActive ? 'active' : 'inactive',
          settings: validated.metadata || {},
        });

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/organizations',
          method: 'POST',
          eventType: 'success',
          severity: 'high',
          details: { 
            dataType: 'ORGANIZATION',
            organizationName: validated.name, 
            slug: validated.slug, 
            type: validated.type,
            hasParent: !!validated.parentId 
          },
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

        logApiAuditEvent({
          timestamp: new Date().toISOString(), userId,
          endpoint: '/api/organizations',
          method: 'POST',
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
      })(request);
};

