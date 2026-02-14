/**
 * Organization Switch API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce organization isolation at database level
 */

import { NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { organizations } from "@/db/schema-organizations";
import { organizationUsers } from "@/db/schema/domains/member";
import { and } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';

const organizationSwitchSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
});

export const POST = async (request: Request) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = organizationSwitchSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
      const { organizationId } = validation.data;

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID is required'
    );
      }

      // All database operations wrapped in withRLSContext - RLS policies handle organization isolation
      return withRLSContext(async (tx) => {
        // Verify organization exists
        const organization = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1);

        if (organization.length === 0) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Organization not found'
    );
        }

        // Verify user has access to this organization
        const userAccess = await tx
          .select()
          .from(organizationUsers)
          .where(
            and(
              eq(organizationUsers.userId, context.userId),
              eq(organizationUsers.organizationId, organizationId)
            )
          )
          .limit(1);

        if (userAccess.length === 0) {
          return NextResponse.json(
            { error: "You do not have access to this organization" },
            { status: 403 }
          );
        }

        // Store selected organization in cookie for session persistence
        const cookieStore = await cookies();
        cookieStore.set("selected_organization_id", organizationId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return NextResponse.json({
          organization: {
            organizationId: organization[0].id,
            name: organization[0].name,
            slug: organization[0].slug,
            settings: organization[0].settings || {},
            subscriptionTier: organization[0].subscriptionTier,
            features: organization[0].featuresEnabled || [],
          },
        });
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to switch organization',
      error
    );
    }
    })(request);
};

