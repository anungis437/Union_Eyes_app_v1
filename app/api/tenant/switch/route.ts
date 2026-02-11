/**
 * Tenant Switch API
 * 
 * MIGRATION STATUS: âœ… Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tenants } from "@/db/schema/tenant-management-schema";
import { organizationUsers } from "@/db/schema/domains/member";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const tenantSwitchSchema = z.object({
  organizationId: z.string().uuid('Invalid organizationId'),
  tenantId: z.string().uuid('Invalid tenantId'),
});

export const POST = async (request: Request) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
    // Validate request body
    const validation = tenantSwitchSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { organizationId, tenantId } = validation.data;
      const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody } = body;
      const organizationId = organizationIdFromBody ?? tenantIdFromBody;
      const tenantId = organizationId;

      if (!organizationId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID is required'
    );
      }

      // All database operations wrapped in withRLSContext - RLS policies handle tenant isolation
      return withRLSContext(async (tx) => {
        // Verify tenant exists
        const tenant = await tx
          .select()
          .from(tenants)
          .where(eq(tenants.tenantId, tenantId))
          .limit(1);

        if (tenant.length === 0) {
          return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Tenant not found'
    );
        }

        // Verify user has access to this tenant
        const userAccess = await tx
          .select()
          .from(organizationUsers)
          .where(
            and(
              eq(organizationUsers.userId, context.userId),
              eq(organizationUsers.organizationId, tenantId)
            )
          )
          .limit(1);

        if (userAccess.length === 0) {
          return NextResponse.json(
            { error: "You do not have access to this tenant" },
            { status: 403 }
          );
        }

        // Store selected tenant in cookie for session persistence
        const cookieStore = await cookies();
        cookieStore.set("selected_organization_id", tenantId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        cookieStore.set("selected_tenant_id", tenantId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return NextResponse.json({
          tenant: {
            organizationId: tenant[0].tenantId,
            tenantId: tenant[0].tenantId,
            name: tenant[0].tenantName,
            slug: tenant[0].tenantSlug,
            settings: tenant[0].settings || {},
            subscriptionTier: tenant[0].subscriptionTier,
            features: tenant[0].features || [],
          },
          organization: {
            organizationId: tenant[0].tenantId,
            name: tenant[0].tenantName,
            slug: tenant[0].tenantSlug,
            settings: tenant[0].settings || {},
            subscriptionTier: tenant[0].subscriptionTier,
            features: tenant[0].features || [],
          },
        });
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to switch tenant',
      error
    );
    }
    })(request);
};

