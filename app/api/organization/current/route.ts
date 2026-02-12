/**
 * Current Organization API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { NextResponse } from "next/server";
import { organizations } from "@/db/schema-organizations";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizationUsers } from "@/db/schema/domains/member";
import { eq, and } from "drizzle-orm";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Wrap all operations in RLS context for transaction consistency
      return withRLSContext(async (tx) => {
        // Get list of all organizations the user has access to - RLS-protected query
        const userOrganizations = await tx
          .select({
            organizationId: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            subscriptionTier: organizations.subscriptionTier,
            features: organizations.featuresEnabled,
          })
          .from(organizationUsers)
          .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
          .where(
            and(
              eq(organizationUsers.userId, userId),
              eq(organizations.status, "active")
            )
          );

        const availableOrganizations = userOrganizations.map((org) => ({
          organizationId: org.organizationId,
          name: org.name,
          slug: org.slug,
          subscriptionTier: org.subscriptionTier || "free",
          features: org.features || [],
        }));

        const currentOrganization = availableOrganizations.find(
          (org) => org.organizationId === organizationId
        ) ?? availableOrganizations[0];

        if (!currentOrganization) {
          return standardErrorResponse(
            ErrorCode.RESOURCE_NOT_FOUND,
            "Organization not found",
            null
          );
        }

        return NextResponse.json({
          organization: currentOrganization,
          availableOrganizations,
        });
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch organization information',
      error
    );
    }
    })(request);
};

