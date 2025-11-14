/**
 * Tenant API - Current Tenant Info
 * 
 * Returns information about the current tenant for the authenticated user.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTenantInfo, getTenantIdForUser } from "@/lib/tenant-utils";
import { db } from "@/db/db";
import { tenants } from "@/db/schema/tenant-management-schema";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current tenant information
    const tenant = await getTenantInfo(userId);

    // Get list of all tenants the user has access to
    // Phase 2: This will query tenant_users to find all accessible tenants
    // For now, return just the current tenant
    const availableTenants = [
      {
        tenantId: tenant.tenantId,
        name: tenant.tenantName,
        slug: tenant.tenantSlug,
        subscriptionTier: tenant.subscriptionTier,
        features: tenant.features || [],
      },
    ];

    return NextResponse.json({
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
}
