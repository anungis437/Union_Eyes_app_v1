/**
 * Current Tenant API
 * 
 * MIGRATION STATUS: ✅ Migrated to use withRLSContext()
 * - All database operations wrapped in withRLSContext() for automatic context setting
 * - RLS policies enforce tenant isolation at database level
 */

import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from "next/server";
import { getOrganizationInfo } from "@/lib/tenant-utils";
import { withRLSContext } from '@/lib/db/with-rls-context';
import { tenants } from "@/db/schema/tenant-management-schema";
import { organizationUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Wrap all operations in RLS context for transaction consistency
      return withRLSContext(async (tx) => {
        // Get current tenant information (pass tx for transaction reuse)
        const tenant = await getOrganizationInfo(userId, tx);

        // Get list of all tenants the user has access to - RLS-protected query
        const userTenants = await tx
          .select({
            tenantId: tenants.tenantId,
            name: tenants.tenantName,
            slug: tenants.tenantSlug,
            subscriptionTier: tenants.subscriptionTier,
            features: tenants.features,
          })
          .from(organizationUsers)
          .innerJoin(tenants, eq(organizationUsers.organizationId, tenants.tenantId))
          .where(
            and(
              eq(organizationUsers.userId, userId),
              eq(tenants.status, "active")
            )
          );

        const availableTenants = userTenants.map((t) => ({
          tenantId: t.tenantId,
          organizationId: t.tenantId,
          name: t.name,
          slug: t.slug,
          subscriptionTier: t.subscriptionTier || "free",
          features: t.features || [],
        }));

        return NextResponse.json({
          tenant: {
            tenantId: tenant.tenantId,
            organizationId: tenant.tenantId,
            name: tenant.tenantName,
            slug: tenant.tenantSlug,
            settings: tenant.settings || {},
            subscriptionTier: tenant.subscriptionTier,
            features: tenant.features || [],
          },
          organization: {
            organizationId: tenant.tenantId,
            name: tenant.tenantName,
            slug: tenant.tenantSlug,
            settings: tenant.settings || {},
            subscriptionTier: tenant.subscriptionTier,
            features: tenant.features || [],
          },
          availableTenants,
          availableOrganizations: availableTenants,
        });
      });
    } catch (error) {
      console.error("Error fetching tenant info:", error);
      return NextResponse.json(
        { error: "Failed to fetch tenant information" },
        { status: 500 }
      );
    }
    })(request);
};

