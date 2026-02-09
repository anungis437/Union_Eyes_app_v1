/**
 * Tenant Switch API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from "next/server";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tenants } from "@/db/schema/tenant-management-schema";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const POST = async (request: Request) => {
  return withRoleAuth(20, async (request, context) => {
  try {
      const body = await request.json();
      const { organizationId: organizationIdFromBody, tenantId: tenantIdFromBody } = body;
      const organizationId = organizationIdFromBody ?? tenantIdFromBody;
      const tenantId = organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: "Organization ID is required" },
          { status: 400 }
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
          return NextResponse.json(
            { error: "Tenant not found" },
            { status: 404 }
          );
        }

        // Verify user has access to this tenant
        const userAccess = await tx
          .select()
          .from(tenantUsers)
          .where(
            and(
              eq(tenantUsers.userId, context.userId),
              eq(tenantUsers.tenantId, tenantId)
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
        });
      });
    } catch (error) {
      console.error("Error switching tenant:", error);
      return NextResponse.json(
        { error: "Failed to switch tenant" },
        { status: 500 }
      );
    }
    })(request);
};
