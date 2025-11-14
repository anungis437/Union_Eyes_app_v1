/**
 * Tenant API - Switch Tenant
 * 
 * Allows users to switch between tenants they have access to.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { tenants } from "@/db/schema/tenant-management-schema";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await db
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

    // Phase 2: Verify user has access to this tenant
    // For now, allow access to any tenant (single-tenant mode)
    // Future: Check tenant_users table for permission

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
        tenantId: tenant[0].tenantId,
        name: tenant[0].tenantName,
        slug: tenant[0].tenantSlug,
        settings: tenant[0].settings || {},
        subscriptionTier: tenant[0].subscriptionTier,
        features: tenant[0].features || [],
      },
    });
  } catch (error) {
    console.error("Error switching tenant:", error);
    return NextResponse.json(
      { error: "Failed to switch tenant" },
      { status: 500 }
    );
  }
}
