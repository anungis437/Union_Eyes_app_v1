import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { tenants } from "@/db/schema/tenant-management-schema";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const POST = async (request: Request) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
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

      // Verify user has access to this tenant
      const userAccess = await db
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
    })(request);
};
