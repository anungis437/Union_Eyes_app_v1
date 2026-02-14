/**
 * Federation Detail API Routes
 * 
 * Individual federation operations: get details, update
 * 
 * Authentication: Minimum role level 160 (fed_staff)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { organizations, organizationRelationships } from '@/db/schema-organizations';
import { and, count } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';

/**
 * Validation schema for updating federations
 */
const updateFederationSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  displayName: z.string().optional(),
  shortName: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  
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
      country: z.string().optional(),
    })
    .optional(),
  
  status: z.enum(['active', 'inactive', 'suspended', 'archived']).optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * GET /api/federations/[id]
 * Fetch a single federation by ID with detailed information
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(160, async (request, context) => {
    const { userId } = context;

    try {
      const federationId = params.id;

      return withRLSContext(async (tx) => {
        // Fetch federation details
        const [federation] = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            displayName: organizations.displayName,
            shortName: organizations.shortName,
            description: organizations.description,
            organizationType: organizations.organizationType,
            parentId: organizations.parentId,
            hierarchyLevel: organizations.hierarchyLevel,
            hierarchyPath: organizations.hierarchyPath,
            provinceTerritory: organizations.provinceTerritory,
            sectors: organizations.sectors,
            email: organizations.email,
            phone: organizations.phone,
            website: organizations.website,
            address: organizations.address,
            clcAffiliated: organizations.clcAffiliated,
            affiliationDate: organizations.affiliationDate,
            charterNumber: organizations.charterNumber,
            memberCount: organizations.memberCount,
            activeMemberCount: organizations.activeMemberCount,
            lastMemberCountUpdate: organizations.lastMemberCountUpdate,
            subscriptionTier: organizations.subscriptionTier,
            settings: organizations.settings,
            status: organizations.status,
            createdAt: organizations.createdAt,
            updatedAt: organizations.updatedAt,
            perCapitaRate: organizations.perCapitaRate,
            remittanceDay: organizations.remittanceDay,
            lastRemittanceDate: organizations.lastRemittanceDate,
            fiscalYearEnd: organizations.fiscalYearEnd,
          })
          .from(organizations)
          .where(
            and(
              eq(organizations.id, federationId),
              eq(organizations.organizationType, 'federation')
            )
          );

        if (!federation) {
          logApiAuditEvent({
            timestamp: new Date().toISOString(),
            userId,
            endpoint: `/api/federations/${federationId}`,
            method: 'GET',
            eventType: 'validation_failed',
            severity: 'low',
            dataType: 'FEDERATION',
            details: { reason: 'Federation not found', federationId },
          });

          return standardErrorResponse(ErrorCode.NOT_FOUND, 'Federation not found');
        }

        // Fetch affiliate count
        const [{ affiliateCount }] = await tx
          .select({ affiliateCount: count() })
          .from(organizationRelationships)
          .where(
            and(
              eq(organizationRelationships.parentOrgId, federationId),
              eq(organizationRelationships.relationshipType, 'affiliate')
            )
          );

        // Fetch parent organization if exists
        let parentOrganization = null;
        if (federation.parentId) {
          const [parent] = await tx
            .select({
              id: organizations.id,
              name: organizations.name,
              shortName: organizations.shortName,
              organizationType: organizations.organizationType,
            })
            .from(organizations)
            .where(eq(organizations.id, federation.parentId));
          parentOrganization = parent || null;
        }

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'FEDERATION',
          details: { federationId, name: federation.name },
        });

        return NextResponse.json({
          federation: {
            ...federation,
            affiliateCount,
            parentOrganization,
          },
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}`,
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to fetch federation'
      );
    }
  })(request, context);
};

/**
 * PATCH /api/federations/[id]
 * Update a federation
 * 
 * Requires clc_staff role (180) for updates
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(180, async (request, context) => {
    const { userId } = context;

    try {
      const federationId = params.id;
      const body = await request.json();
      const validation = updateFederationSchema.safeParse(body);

      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request data',
          validation.error.errors
        );
      }

      const data = validation.data;

      return withRLSContext(async (tx) => {
        // Verify federation exists
        const [existing] = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(
            and(
              eq(organizations.id, federationId),
              eq(organizations.organizationType, 'federation')
            )
          );

        if (!existing) {
          return standardErrorResponse(ErrorCode.NOT_FOUND, 'Federation not found');
        }

        // Update the federation
        const [updatedFederation] = await tx
          .update(organizations)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, federationId))
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}`,
          method: 'PATCH',
          eventType: 'success',
          severity: 'medium',
          dataType: 'FEDERATION',
          details: {
            federationId,
            updatedFields: Object.keys(data),
          },
        });

        return NextResponse.json({
          federation: updatedFederation,
          message: 'Federation updated successfully',
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}`,
        method: 'PATCH',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to update federation'
      );
    }
  })(request, context);
};
