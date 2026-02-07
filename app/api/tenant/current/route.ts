import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from "next/server";
import { getTenantInfo, getTenantIdForUser } from "@/lib/tenant-utils";
import { db } from "@/db/db";
import { tenants } from "@/db/schema/tenant-management-schema";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async () => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Get current tenant information
    const tenant = await getTenantInfo(userId);

    // Get list of all tenants the user has access to by querying tenant_users
    const userTenants = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.tenantName,
        slug: tenants.tenantSlug,
        subscriptionTier: tenants.subscriptionTier,
        features: tenants.features,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
      .where(
        and(
          eq(tenantUsers.userId, userId),
          eq(tenants.status, "active")
        )
      );

    const availableTenants = userTenants.map((t) => ({
      tenantId: t.tenantId,
      name: t.name,
      slug: t.slug,
      subscriptionTier: t.subscriptionTier || "free",
      features: t.features || [],
    }));    return NextResponse.json({
        tenant: {
          tenantId: tenant.tenantId,
          name: tenant.tenantName,
          slug: tenant.tenantSlug,
          settings: tenant.settings || {},
          subscriptionTier: tenant.subscriptionTier,
          features: tenant.features || [],
        },
        availableTenants,
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
