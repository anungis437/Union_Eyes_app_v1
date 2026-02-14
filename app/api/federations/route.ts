/**
 * Federation API Routes
 * 
 * Comprehensive federation management endpoints for CLC's provincial and
 * sectoral federation affiliates. Handles listing, filtering, and creation
 * of federation organizations.
 * 
 * Authentication: Minimum role level 160 (fed_staff) or 180 (clc_staff)
 * RLS: Organization-level isolation enforced by database policies
 * 
 * @module app/api/federations/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { organizations, organizationRelationships } from '@/db/schema-organizations';
import { desc, and, like, or, inArray, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { ErrorCode,
} from '@/lib/api/standardized-responses';

/**
 * Validation schema for creating federations
 */
const createFederationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  displayName: z.string().optional(),
  shortName: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  
  // Federation specifics
  provinceTerritory: z
    .enum(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'])
    .optional(),
  sectors: z
    .array(
      z.enum([
        'healthcare',
        'education',
        'public_service',
        'trades',
        'manufacturing',
        'transportation',
        'retail',
        'hospitality',
        'technology',
        'construction',
        'utilities',
        'telecommunications',
        'financial_services',
        'agriculture',
        'arts_culture',
        'other',
      ])
    )
    .optional(),
  
  // Contact information
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  address: z
    .object({
      street: z.string().optional(),
      unit: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().default('Canada').optional(),
    })
    .optional(),
  
  // CLC affiliation
  clcAffiliated: z.boolean().default(true),
  affiliationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Additional metadata
  settings: z.record(z.unknown()).optional(),
});

/**
 * GET /api/federations
 * List and filter federations
 * 
 * Query parameters:
 * - province: Filter by province/territory code
 * - sector: Filter by labour sector
 * - clc_affiliated: Filter by CLC affiliation status (true/false)
 * - status: Filter by status (active/inactive/suspended)
 * - search: Search in name, short_name, and description
 * - sort: Sort field (name, member_count, created_at)
 * - order: Sort order (asc/desc)
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = withEnhancedRoleAuth(160, async (request, context) => {
  const { userId } = context;

  try {
    // Rate limiting: 100 federation read operations per minute per user
    const rateLimitResult = await checkRateLimit(userId, {
      limit: 100,
      window: 60,
      identifier: 'federation-read',
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Too many federation read requests.',
          resetIn: rateLimitResult.resetIn,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const province = searchParams.get('province');
    const sector = searchParams.get('sector');
    const clcAffiliatedParam = searchParams.get('clc_affiliated');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    return withRLSContext(async (tx) => {
      // Build query conditions
      const conditions = [eq(organizations.organizationType, 'federation')];

      if (province) {
        conditions.push(eq(organizations.provinceTerritory, province));
      }

      if (sector) {
        conditions.push(sql`${sector} = ANY(${organizations.sectors})`);
      }

      if (clcAffiliatedParam !== null) {
        const clcAffiliated = clcAffiliatedParam === 'true';
        conditions.push(eq(organizations.clcAffiliated, clcAffiliated));
      }

      if (status) {
        conditions.push(eq(organizations.status, status));
      }

      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            like(organizations.name, searchPattern),
            like(organizations.shortName, searchPattern),
            like(organizations.description, searchPattern)
          )!
        );
      }

      // Count total results
      const [{ totalCount }] = await tx
        .select({ totalCount: count() })
        .from(organizations)
        .where(and(...conditions));

      // Fetch federations with pagination and sorting
      const orderByColumn =
        sort === 'member_count'
          ? organizations.memberCount
          : sort === 'created_at'
          ? organizations.createdAt
          : organizations.name;

      const orderDirection = order === 'desc' ? desc(orderByColumn) : orderByColumn;

      const federations = await tx
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          displayName: organizations.displayName,
          shortName: organizations.shortName,
          description: organizations.description,
          provinceTerritory: organizations.provinceTerritory,
          sectors: organizations.sectors,
          email: organizations.email,
          phone: organizations.phone,
          website: organizations.website,
          address: organizations.address,
          clcAffiliated: organizations.clcAffiliated,
          affiliationDate: organizations.affiliationDate,
          memberCount: organizations.memberCount,
          activeMemberCount: organizations.activeMemberCount,
          status: organizations.status,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        })
        .from(organizations)
        .where(and(...conditions))
        .orderBy(orderDirection)
        .limit(limit)
        .offset(offset);

      // Fetch affiliate counts for each federation
      const federationIds = federations.map((f: Record<string, unknown>) => f.id);
      const affiliateCounts =
        federationIds.length > 0
          ? await tx
              .select({
                federationId: organizationRelationships.parentOrgId,
                affiliateCount: count(),
              })
              .from(organizationRelationships)
              .where(
                and(
                  inArray(organizationRelationships.parentOrgId, federationIds),
                  eq(organizationRelationships.relationshipType, 'affiliate')
                )
              )
              .groupBy(organizationRelationships.parentOrgId)
          : [];

      const affiliateCountMap = new Map(
        affiliateCounts.map((ac: Record<string, unknown>) => [ac.federationId, ac.affiliateCount])
      );

      // Enrich federations with affiliate counts
      const enrichedFederations = federations.map((federation: Record<string, unknown>) => ({
        ...federation,
        affiliateCount: affiliateCountMap.get(federation.id) || 0,
      }));

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/federations',
        method: 'GET',
        eventType: 'success',
        severity: 'low',
        details: {
          totalCount,
          returnedCount: federations.length,
          filters: { province, sector, clcAffiliatedParam, status, search },
        },
      });

      return NextResponse.json({
        federations: enrichedFederations,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      });
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/federations',
      method: 'GET',
      eventType: 'unauthorized_access',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to fetch federations'
    );
  }
});

/**
 * POST /api/federations
 * Create a new federation
 * 
 * Requires clc_staff role (180) for creation
 */
export const POST = withEnhancedRoleAuth(180, async (request, context) => {
  const { userId } = context;

  try {
    // Rate limiting: 10 federation creation operations per hour per user
    const rateLimitResult = await checkRateLimit(userId, {
      limit: 10,
      window: 3600,
      identifier: 'federation-create',
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Too many federation creation requests.',
          resetIn: rateLimitResult.resetIn,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.json();
    const validation = createFederationSchema.safeParse(body);

    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }

    const data = validation.data;

    return withRLSContext(async (tx) => {
      // Check if slug already exists
      const existingSlug = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, data.slug))
        .limit(1);

      if (existingSlug.length > 0) {
        return standardErrorResponse(ErrorCode.VALIDATION_ERROR, 'Slug already exists');
      }

      // Create the federation
      const [newFederation] = await tx
        .insert(organizations)
        .values({
          name: data.name,
          slug: data.slug,
          displayName: data.displayName,
          shortName: data.shortName,
          description: data.description,
          organizationType: 'federation',
          provinceTerritory: data.provinceTerritory,
          sectors: data.sectors || [],
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          clcAffiliated: data.clcAffiliated,
          affiliationDate: data.affiliationDate,
          hierarchyLevel: 1, // Federations are typically level 1 in the hierarchy
          hierarchyPath: [data.slug],
          status: 'active',
          settings: data.settings || {},
          createdBy: userId,
        })
        .returning();

      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: '/api/federations',
        method: 'POST',
        eventType: 'success',
        severity: 'medium',
        details: {
          federationId: newFederation.id,
          name: newFederation.name,
          province: data.provinceTerritory,
        },
      });

      return NextResponse.json(
        {
          federation: newFederation,
          message: 'Federation created successfully',
        },
        { status: 201 }
      );
    });
  } catch (error) {
    logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      endpoint: '/api/federations',
      method: 'POST',
      eventType: 'unauthorized_access',
      severity: 'high',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to create federation'
    );
  }
});
